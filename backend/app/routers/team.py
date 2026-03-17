from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col, get_db
from app.core.permissions import assert_permission
from app.core.utils import generate_id, generate_token
from app.middleware.auth import get_auth, AuthContext
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

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


@router.post("/invite")
async def invite_member(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "manage_team")

        body = await request.json()
        email = body.get("email")
        role = body.get("role", "recruiter")
        assigned_job_ids = body.get("assigned_job_ids", [])

        if not email:
            raise HTTPException(status_code=400, detail="Validation failed: email is required")

        # Check tenant exists
        tenant_doc = col("tenants").document(auth.tenant_id).get()
        if not tenant_doc.exists:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant = tenant_doc.to_dict()
        plan_code = tenant.get("plan_code", "trial")

        # Check plan quota for internal_users
        usage_doc = col("usage_counters").document(auth.tenant_id).get()
        if usage_doc.exists:
            usage = usage_doc.to_dict()
            current_users = usage.get("internal_users", 0)
            limits = {"trial": 3, "starter": 10, "professional": 50, "enterprise": 999}
            limit = limits.get(plan_code, 3)
            if current_users >= limit:
                raise HTTPException(status_code=402, detail=f"Quota exceeded: internal_users limit is {limit} for plan {plan_code}")

        # Check if already a member
        existing = (
            col("memberships")
            .where("tenant_id", "==", auth.tenant_id)
            .where("user_id", "==", email)
            .limit(1)
            .get()
        )
        if existing:
            raise HTTPException(status_code=409, detail="User already invited or is a member")

        membership_id = generate_id("mb")
        invite_token = generate_token()

        col("memberships").document(membership_id).set({
            "membership_id": membership_id,
            "tenant_id": auth.tenant_id,
            "user_id": email,  # placeholder until accepted
            "role": role,
            "status": "invited",
            "invite_token": invite_token,
            "invited_by_membership_id": auth.membership.get("membership_id"),
            "assigned_job_ids": assigned_job_ids,
            "permissions_override": {},
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # Increment usage counter
        col("usage_counters").document(auth.tenant_id).update({
            "internal_users": (usage_doc.to_dict().get("internal_users", 0) + 1) if usage_doc.exists else 1,
        })

        # Create audit log
        audit_id = generate_id("aud")
        col("audit_logs").document(audit_id).set({
            "audit_log_id": audit_id,
            "tenant_id": auth.tenant_id,
            "actor_membership_id": auth.membership.get("membership_id"),
            "action": "team.member_invited",
            "entity_type": "membership",
            "entity_id": membership_id,
            "after": {"email": email, "role": role},
            "created_at": SERVER_TIMESTAMP,
        })

        return {"membership_id": membership_id, "status": "invited"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 500
        if "permission" in message.lower():
            status = 403
        elif "Quota" in message:
            status = 402
        elif "already" in message:
            status = 409
        raise HTTPException(status_code=status, detail=message)


@router.get("/list")
async def list_members(auth: AuthContext = Depends(get_auth)):
    try:
        membership_docs = (
            col("memberships")
            .where("tenant_id", "==", auth.tenant_id)
            .get()
        )

        enriched = []
        for doc in membership_docs:
            m = doc.to_dict()
            user_name = m.get("user_id", "")
            user_email = ""

            if m.get("status") == "active":
                user_doc = col("users").document(m["user_id"]).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    user_name = user_data.get("name", m["user_id"])
                    user_email = user_data.get("email", "")
            elif m.get("status") == "invited":
                user_name = m.get("user_id", "")
                user_email = m.get("user_id", "")

            enriched.append({
                "membership_id": m.get("membership_id"),
                "user_name": user_name,
                "user_email": user_email,
                "role": m.get("role"),
                "status": m.get("status"),
                "assigned_job_ids": m.get("assigned_job_ids", []),
                "created_at": ts(m.get("created_at")),
            })

        return {"members": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch team members: {str(e)}")


@router.get("/membership/{member_id}")
async def get_membership(member_id: str, auth: AuthContext = Depends(get_auth)):
    doc = col("memberships").document(member_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Membership not found")

    membership = doc.to_dict()
    if membership.get("tenant_id") != auth.tenant_id:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Convert timestamps
    for key in ("created_at", "updated_at"):
        if key in membership:
            membership[key] = ts(membership[key])

    return membership


@router.patch("/membership/{member_id}")
async def update_membership(member_id: str, request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "manage_team")

        body = await request.json()

        target_doc = col("memberships").document(member_id).get()
        if not target_doc.exists:
            raise HTTPException(status_code=404, detail="Membership not found")

        target = target_doc.to_dict()
        if target.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Membership not found")

        # Prevent removing the last admin
        new_role = body.get("role")
        if new_role and new_role != "admin" and target.get("role") == "admin":
            all_members = (
                col("memberships")
                .where("tenant_id", "==", auth.tenant_id)
                .get()
            )
            admin_count = sum(
                1 for d in all_members
                if d.to_dict().get("role") == "admin" and d.to_dict().get("status") == "active"
            )
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last admin")

        # Remove tenant_id from updates if present
        body.pop("tenant_id", None)
        body["updated_at"] = SERVER_TIMESTAMP

        col("memberships").document(member_id).update(body)

        # Create audit log
        audit_id = generate_id("aud")
        col("audit_logs").document(audit_id).set({
            "audit_log_id": audit_id,
            "tenant_id": auth.tenant_id,
            "actor_membership_id": auth.membership.get("membership_id"),
            "action": "team.membership_updated",
            "entity_type": "membership",
            "entity_id": member_id,
            "before": {k: str(v) for k, v in target.items()},
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
