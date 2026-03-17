from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col
from app.core.permissions import assert_permission
from app.core.utils import generate_id, generate_token
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


def _serialize_offer(data: dict) -> dict:
    """Convert timestamps in an offer dict."""
    for key in ("created_at", "updated_at", "sent_at", "approved_at", "responded_at", "expires_at"):
        if key in data:
            data[key] = ts(data[key])
    return data


@router.get("")
async def list_offers(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        status_filter = request.query_params.get("status")

        query = col("offers").where("tenant_id", "==", auth.tenant_id)
        if status_filter:
            query = query.where("status", "==", status_filter)

        docs = query.get()
        offers = [_serialize_offer(doc.to_dict()) for doc in docs]
        offers.sort(key=lambda o: o.get("created_at") or "", reverse=True)

        return {"offers": offers}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch offers: {str(e)}",
        )


@router.post("")
async def create_offer(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "create_offers")

        body = await request.json()
        application_id = body.get("application_id")
        template_code = body.get("template_code", "standard")
        generated_fields = body.get("generated_fields", {})

        if not application_id:
            raise HTTPException(status_code=400, detail="Validation failed: application_id is required")

        app_doc = col("applications").document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        application = app_doc.to_dict()
        if application.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Application not found")

        offer_id = generate_id("ofr")
        respond_token = generate_token()

        col("offers").document(offer_id).set({
            "offer_id": offer_id,
            "tenant_id": auth.tenant_id,
            "application_id": application_id,
            "candidate_id": application.get("candidate_id"),
            "job_id": application.get("job_id"),
            "template_code": template_code,
            "generated_fields": generated_fields,
            "status": "draft",
            "respond_token": respond_token,
            "created_by_membership_id": auth.membership.get("membership_id"),
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"offer_id": offer_id, "status": "draft"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 403 if "permission" in message.lower() else 500
        raise HTTPException(status_code=status, detail=message)


@router.post("/{offer_id}/approve")
async def approve_offer(offer_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "approve_offers")

        doc = col("offers").document(offer_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Not found")

        offer = doc.to_dict()
        if offer.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Not found")

        col("offers").document(offer_id).update({
            "status": "approved",
            "approved_at": SERVER_TIMESTAMP,
            "approved_by_membership_id": auth.membership.get("membership_id"),
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"offer_id": offer_id, "status": "approved"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 403 if "permission" in message.lower() else 400
        raise HTTPException(status_code=status, detail=message)


@router.post("/{offer_id}/send")
async def send_offer(offer_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "send_offers")

        doc = col("offers").document(offer_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Not found")

        offer = doc.to_dict()
        if offer.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Not found")

        # Get application for candidate email
        app_doc = col("applications").document(offer["application_id"]).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        col("offers").document(offer_id).update({
            "status": "sent",
            "sent_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"offer_id": offer_id, "status": "sent"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 403 if "permission" in message.lower() else 500
        raise HTTPException(status_code=status, detail=message)
