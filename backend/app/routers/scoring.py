from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col
from app.middleware.auth import get_auth, AuthContext

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


@router.post("/run")
async def run_scoring(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        body = await request.json()
        application_id = body.get("application_id")

        if not application_id:
            raise HTTPException(status_code=400, detail="Missing application_id")

        # Get application
        app_doc = col("applications").document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        application = app_doc.to_dict()
        if application.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Application not found")

        # Get processing result
        proc_docs = (
            col("application_processing")
            .where("application_id", "==", application_id)
            .limit(1)
            .get()
        )

        processing = None
        if proc_docs:
            p = proc_docs[0].to_dict()
            processing = {
                "rule_score": p.get("rule_score"),
                "ai_summary": p.get("ai_summary"),
                "strengths": p.get("strengths"),
                "gaps": p.get("gaps"),
                "confidence": p.get("parse_confidence"),
                "structured_data": p.get("structured_data"),
            }

        return {
            "application_id": application_id,
            "score_total": application.get("score_total"),
            "score_status": application.get("score_status"),
            "parse_status": application.get("parse_status"),
            "processing": processing,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
