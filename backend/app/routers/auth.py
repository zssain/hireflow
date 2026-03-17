from fastapi import APIRouter, Request, HTTPException
from app.core.firebase import col, verify_id_token, get_db
from app.core.utils import generate_id
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


def _extract_bearer(request: Request) -> str:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    return auth_header[7:]


@router.post("/session")
async def session(request: Request):
    try:
        token = _extract_bearer(request)
        decoded = verify_id_token(token)

        uid = decoded["uid"]
        email = decoded.get("email", "")
        name = decoded.get("name") or email
        picture = decoded.get("picture")

        # Get or create user
        user_ref = col("users").document(uid)
        user_doc = user_ref.get()
        if user_doc.exists:
            user = user_doc.to_dict()
        else:
            user = {
                "user_id": uid,
                "email": email,
                "name": name,
                "avatar_url": picture or "",
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            }
            user_ref.set(user)
            # Re-read to get server timestamps resolved
            user = user_ref.get().to_dict()

        # Get memberships
        membership_docs = col("memberships").where("user_id", "==", uid).get()
        memberships = []
        for doc in membership_docs:
            m = doc.to_dict()
            memberships.append({
                "membership_id": m.get("membership_id"),
                "tenant_id": m.get("tenant_id"),
                "role": m.get("role"),
                "status": m.get("status"),
            })

        # Convert timestamps in user dict for JSON serialization
        for key in ("created_at", "updated_at"):
            if key in user and hasattr(user[key], "isoformat"):
                user[key] = user[key].isoformat()

        return {"user": user, "memberships": memberships}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/accept-invite")
async def accept_invite(request: Request):
    try:
        token = _extract_bearer(request)
        decoded = verify_id_token(token)

        body = await request.json()
        invite_token = body.get("invite_token")
        if not invite_token:
            raise HTTPException(status_code=400, detail="Missing invite_token")

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

        # Find the membership by invite_token
        membership_docs = (
            col("memberships")
            .where("invite_token", "==", invite_token)
            .where("status", "==", "invited")
            .limit(1)
            .get()
        )
        if not membership_docs:
            raise HTTPException(status_code=400, detail="Invalid or expired invite token")

        membership = membership_docs[0].to_dict()
        membership_id = membership["membership_id"]

        # Accept the invite
        col("memberships").document(membership_id).update({
            "user_id": uid,
            "status": "active",
            "updated_at": SERVER_TIMESTAMP,
        })

        return {
            "membership_id": membership_id,
            "tenant_id": membership["tenant_id"],
            "role": membership["role"],
            "status": "active",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
