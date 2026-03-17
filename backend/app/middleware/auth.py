from dataclasses import dataclass
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.firebase import verify_id_token, col
import time

security = HTTPBearer()

# In-memory membership cache: key = (uid, tenant_id) -> (membership_dict, timestamp)
_membership_cache: dict[tuple[str, str], tuple[dict, float]] = {}
_CACHE_TTL = 300  # 5 minutes


@dataclass
class AuthContext:
    user_id: str
    email: str
    membership: dict
    tenant_id: str


def _get_tenant_id(request: Request, body: dict | None = None) -> str | None:
    tid = request.query_params.get("tenant_id")
    if tid:
        return tid
    if body and isinstance(body, dict):
        return body.get("tenant_id")
    return None


def _get_cached_membership(uid: str, tenant_id: str) -> dict | None:
    """Return cached membership if still valid, else None."""
    key = (uid, tenant_id)
    entry = _membership_cache.get(key)
    if entry:
        membership, ts = entry
        if time.time() - ts < _CACHE_TTL:
            return membership
        else:
            del _membership_cache[key]
    return None


def _set_cached_membership(uid: str, tenant_id: str, membership: dict) -> None:
    _membership_cache[(uid, tenant_id)] = (membership, time.time())


async def get_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthContext:
    token = credentials.credentials
    try:
        decoded = verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Try to get tenant_id from query, then body
    tenant_id = request.query_params.get("tenant_id")
    if not tenant_id:
        try:
            body = await request.json()
            tenant_id = body.get("tenant_id") if isinstance(body, dict) else None
        except Exception:
            pass

    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant_id")

    uid = decoded["uid"]

    # Check cache first
    membership = _get_cached_membership(uid, tenant_id)
    if membership is None:
        # Look up membership from Firestore
        snap = (
            col("memberships")
            .where("user_id", "==", uid)
            .where("tenant_id", "==", tenant_id)
            .where("status", "==", "active")
            .limit(1)
            .get()
        )
        if not snap:
            raise HTTPException(status_code=403, detail="No active membership found for this tenant")

        membership = snap[0].to_dict()
        _set_cached_membership(uid, tenant_id, membership)

    return AuthContext(
        user_id=uid,
        email=decoded.get("email", ""),
        membership=membership,
        tenant_id=tenant_id,
    )
