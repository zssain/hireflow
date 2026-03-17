from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col, get_db
from app.middleware.auth import get_auth, AuthContext
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud import firestore as fs

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


def _serialize_notification(data: dict) -> dict:
    """Convert timestamps in a notification dict."""
    for key in ("created_at", "read_at"):
        if key in data:
            data[key] = ts(data[key])
    return data


@router.get("")
async def list_notifications(auth: AuthContext = Depends(get_auth)):
    try:
        membership_id = auth.membership.get("membership_id")

        # Get notifications
        docs = (
            col("notifications")
            .where("tenant_id", "==", auth.tenant_id)
            .where("recipient_membership_id", "==", membership_id)
            .get()
        )

        notifications = [_serialize_notification(doc.to_dict()) for doc in docs]
        notifications.sort(key=lambda n: n.get("created_at") or "", reverse=True)
        notifications = notifications[:50]

        # Count unread
        unread_count = sum(1 for n in notifications if not n.get("read_at"))

        return {"notifications": notifications, "unread_count": unread_count}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch notifications: {str(e)}",
        )


@router.patch("")
async def mark_read(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        body = await request.json()
        notification_ids = body.get("notification_ids", [])

        if not notification_ids:
            raise HTTPException(status_code=400, detail="Validation failed: notification_ids is required")

        db = get_db()
        batch = db.batch()

        for nid in notification_ids:
            batch.update(col("notifications").document(nid), {
                "read_at": SERVER_TIMESTAMP,
            })

        batch.commit()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
