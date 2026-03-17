from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col, verify_id_token, get_db
from app.core.permissions import assert_permission
from app.core.utils import generate_id, generate_slug
from app.middleware.auth import get_auth, AuthContext
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from datetime import datetime, timedelta, timezone

router = APIRouter()


def ts(val):
    """Convert Firestore timestamp to ISO string."""
    if val is None:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if hasattr(val, "__class__") and "DatetimeWithNanoseconds" in val.__class__.__name__:
        return val.isoformat()
    return str(val)


def _extract_bearer(request: Request) -> str:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    return auth_header[7:]


@router.post("/create")
async def create_tenant(request: Request):
    try:
        token = _extract_bearer(request)
        decoded = verify_id_token(token)

        body = await request.json()
        company_name = body.get("company_name")
        slug = body.get("slug")

        if not company_name or not slug:
            raise HTTPException(status_code=400, detail="Validation failed: company_name and slug are required")

        uid = decoded["uid"]
        email = decoded.get("email", "")
        name = decoded.get("name") or email

        # Ensure user doc exists
        user_ref = col("users").document(uid)
        user_doc = user_ref.get()
        if not user_doc.exists:
            user_ref.set({
                "user_id": uid,
                "email": email,
                "name": name,
                "avatar_url": "",
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            })

        # Check slug uniqueness
        existing = col("tenants").where("slug", "==", slug).limit(1).get()
        if existing:
            raise HTTPException(status_code=409, detail="Slug already taken")

        tenant_id = generate_id("tn")
        membership_id = generate_id("mb")
        subscription_id = generate_id("sub")
        trial_ends_at = datetime.now(timezone.utc) + timedelta(days=14)

        db = get_db()
        batch = db.batch()

        # Create tenant
        batch.set(col("tenants").document(tenant_id), {
            "tenant_id": tenant_id,
            "name": company_name,
            "slug": slug,
            "status": "trial_active",
            "plan_code": "trial",
            "trial_ends_at": trial_ends_at,
            "branding": {"logo_url": "", "primary_color": "#6366f1"},
            "career_page": {"enabled": True, "intro": f"Join {company_name}!"},
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # Create owner membership
        batch.set(col("memberships").document(membership_id), {
            "membership_id": membership_id,
            "tenant_id": tenant_id,
            "user_id": uid,
            "role": "admin",
            "status": "active",
            "assigned_job_ids": [],
            "permissions_override": {},
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # Create subscription
        batch.set(col("subscriptions").document(subscription_id), {
            "subscription_id": subscription_id,
            "tenant_id": tenant_id,
            "plan_code": "trial",
            "status": "trial",
            "current_period_start": SERVER_TIMESTAMP,
            "current_period_end": trial_ends_at,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # Create default pipeline template
        template_id = generate_id("tpl")
        batch.set(col("pipeline_templates").document(template_id), {
            "template_id": template_id,
            "tenant_id": tenant_id,
            "name": "Default Pipeline",
            "stages": [
                {"stage_id": "applied", "name": "Applied", "order": 0},
                {"stage_id": "screening", "name": "Screening", "order": 1},
                {"stage_id": "interview", "name": "Interview", "order": 2},
                {"stage_id": "offer", "name": "Offer", "order": 3},
                {"stage_id": "hired", "name": "Hired", "order": 4},
            ],
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # Create usage counter
        batch.set(col("usage_counters").document(tenant_id), {
            "tenant_id": tenant_id,
            "active_jobs": 0,
            "internal_users": 1,
            "applications_this_month": 0,
            "ai_scoring_runs": 0,
        })

        # Emit analytics event
        event_id = generate_id("evt")
        batch.set(col("analytics_events").document(event_id), {
            "event_id": event_id,
            "tenant_id": tenant_id,
            "trigger": "tenant.created",
            "payload": {
                "entity_type": "tenant",
                "entity_id": tenant_id,
                "slug": slug,
            },
            "actor_membership_id": membership_id,
            "created_at": SERVER_TIMESTAMP,
        })

        batch.commit()

        return {
            "tenant_id": tenant_id,
            "membership_id": membership_id,
            "plan_code": "trial",
            "trial_ends_at": trial_ends_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 409 if "Slug already taken" in message else 500
        raise HTTPException(status_code=status, detail=message)


@router.get("/settings")
async def get_settings(auth: AuthContext = Depends(get_auth)):
    doc = col("tenants").document(auth.tenant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Tenant not found")
    data = doc.to_dict()
    # Convert timestamps for JSON serialization
    for key in ("created_at", "updated_at", "trial_ends_at"):
        if key in data:
            data[key] = ts(data[key])
    return data


@router.patch("/settings")
async def update_settings(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "manage_workspace")

        body = await request.json()
        # Remove tenant_id from updates if present
        body.pop("tenant_id", None)

        # Get before state for audit
        before_doc = col("tenants").document(auth.tenant_id).get()
        before = before_doc.to_dict() if before_doc.exists else {}

        body["updated_at"] = SERVER_TIMESTAMP
        col("tenants").document(auth.tenant_id).update(body)

        # Create audit log
        audit_id = generate_id("aud")
        col("audit_logs").document(audit_id).set({
            "audit_log_id": audit_id,
            "tenant_id": auth.tenant_id,
            "actor_membership_id": auth.membership.get("membership_id"),
            "action": "tenant.settings_updated",
            "entity_type": "tenant",
            "entity_id": auth.tenant_id,
            "before": {k: str(v) for k, v in (before or {}).items()},
            "after": {k: str(v) for k, v in body.items()},
            "created_at": SERVER_TIMESTAMP,
        })

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 403 if "permission" in message.lower() else 500
        raise HTTPException(status_code=status, detail=message)
