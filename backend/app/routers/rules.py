from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col
from app.core.permissions import assert_permission
from app.core.utils import generate_id
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


def _serialize_rule(data: dict) -> dict:
    """Convert timestamps in a rule dict."""
    for key in ("created_at", "updated_at"):
        if key in data:
            data[key] = ts(data[key])
    return data


@router.get("")
async def list_rules(auth: AuthContext = Depends(get_auth)):
    docs = col("workflow_rules").where("tenant_id", "==", auth.tenant_id).get()
    rules = [_serialize_rule(doc.to_dict()) for doc in docs]
    rules.sort(key=lambda r: r.get("priority", 0))
    return {"rules": rules}


@router.post("")
async def create_rule(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "manage_rules")

        body = await request.json()
        body.pop("tenant_id", None)

        rule_id = generate_id("rl")

        col("workflow_rules").document(rule_id).set({
            "rule_id": rule_id,
            "tenant_id": auth.tenant_id,
            **body,
            "plan_required": "starter",
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"rule_id": rule_id}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 403 if "permission" in message.lower() else 500
        raise HTTPException(status_code=status, detail=message)
