from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col, get_db
from app.core.permissions import assert_permission
from app.core.utils import generate_id
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


def _serialize_app(data: dict) -> dict:
    """Convert timestamps in an application dict."""
    for key in ("created_at", "updated_at", "last_activity_at"):
        if key in data:
            data[key] = ts(data[key])
    return data


@router.get("")
async def list_applications(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        job_id = request.query_params.get("job_id")
        status_filter = request.query_params.get("status")

        query = col("applications").where("tenant_id", "==", auth.tenant_id)

        if job_id:
            query = query.where("job_id", "==", job_id)
        if status_filter:
            query = query.where("status", "==", status_filter)

        # If hiring manager, filter by assigned jobs
        is_hiring_manager = auth.membership.get("role") == "hiring_manager"
        if is_hiring_manager:
            membership_id = auth.membership.get("membership_id")
            query = query.where("hiring_manager_membership_ids", "array_contains", membership_id)

        docs = query.get()
        applications = [_serialize_app(doc.to_dict()) for doc in docs]

        # Sort in Python to avoid needing composite indexes for every filter combo
        applications.sort(key=lambda a: a.get("created_at") or "", reverse=True)

        return {"applications": applications}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch applications: {str(e)}",
        )


@router.get("/{application_id}")
async def get_application(application_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        app_doc = col("applications").document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        application = app_doc.to_dict()
        if application.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Application not found")

        return {"application": _serialize_app(application)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{application_id}/move-stage")
async def move_stage(application_id: str, request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "move_pipeline_stages")

        body = await request.json()
        target_stage_id = body.get("target_stage_id")
        if not target_stage_id:
            raise HTTPException(status_code=400, detail="Validation failed: target_stage_id is required")

        # Get application
        app_doc = col("applications").document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        application = app_doc.to_dict()
        if application.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Application not found")

        if application.get("status") != "active":
            raise HTTPException(status_code=400, detail="Cannot move non-active application")

        # Get job
        job_doc = col("jobs").document(application["job_id"]).get()
        if not job_doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")

        job = job_doc.to_dict()

        # Get pipeline
        pipeline_doc = col("job_pipelines").document(job["pipeline_id"]).get()
        if not pipeline_doc.exists:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        pipeline = pipeline_doc.to_dict()
        stages = pipeline.get("stages", [])
        target_stage = None
        for s in stages:
            if s["stage_id"] == target_stage_id:
                target_stage = s
                break

        if not target_stage:
            raise HTTPException(status_code=400, detail="Target stage not found in pipeline")

        col("applications").document(application_id).update({
            "current_stage_id": target_stage["stage_id"],
            "current_stage_name": target_stage["name"],
            "last_activity_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {
            "application_id": application_id,
            "new_stage_id": target_stage["stage_id"],
            "new_stage_name": target_stage["name"],
        }
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 500
        if "permission" in message.lower():
            status = 403
        elif "not found" in message.lower():
            status = 404
        elif "non-active" in message.lower():
            status = 400
        raise HTTPException(status_code=status, detail=message)


@router.post("/{application_id}/reprocess")
async def reprocess(application_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        app_doc = col("applications").document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        application = app_doc.to_dict()
        if application.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Application not found")

        # Find existing processing result
        proc_docs = (
            col("application_processing")
            .where("application_id", "==", application_id)
            .limit(1)
            .get()
        )
        if not proc_docs:
            raise HTTPException(status_code=404, detail="No previous processing result found")

        existing = proc_docs[0].to_dict()

        # Check job exists
        job_doc = col("jobs").document(application["job_id"]).get()
        if not job_doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")

        return {
            "application_id": application_id,
            "message": "Reprocessing is available when resume is re-uploaded. Current score and data preserved.",
            "current_score": existing.get("rule_score", {}).get("total"),
            "parse_status": existing.get("parse_status"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_applications(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        body = await request.json()
        job_id = body.get("job_id")
        candidates = body.get("candidates", [])

        if not job_id or not candidates:
            raise HTTPException(status_code=400, detail="Validation failed: job_id and candidates are required")

        # Get job
        job_doc = col("jobs").document(job_id).get()
        if not job_doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")

        job = job_doc.to_dict()
        if job.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Job not found")

        # Get pipeline for initial stage
        pipeline_doc = col("job_pipelines").document(job["pipeline_id"]).get()
        if not pipeline_doc.exists:
            raise HTTPException(status_code=500, detail="No pipeline stages")

        pipeline = pipeline_doc.to_dict()
        stages = sorted(pipeline.get("stages", []), key=lambda s: s.get("order", 0))
        if not stages:
            raise HTTPException(status_code=500, detail="No pipeline stages")

        initial_stage = stages[0]
        results = []

        for c in candidates:
            try:
                c_name = c.get("name", "")
                c_email = c.get("email", "")
                c_phone = c.get("phone", "")
                c_linkedin = c.get("linkedin_url", "")

                # Find or create candidate
                existing_cand = (
                    col("candidates")
                    .where("tenant_id", "==", auth.tenant_id)
                    .where("email", "==", c_email)
                    .limit(1)
                    .get()
                )

                if existing_cand:
                    candidate_id = existing_cand[0].to_dict()["candidate_id"]
                else:
                    candidate_id = generate_id("cand")
                    col("candidates").document(candidate_id).set({
                        "candidate_id": candidate_id,
                        "tenant_id": auth.tenant_id,
                        "name": c_name,
                        "email": c_email,
                        "phone": c_phone,
                        "linkedin_url": c_linkedin,
                        "dedupe_keys": {
                            "email_lower": c_email.lower(),
                            "phone_normalized": "".join(ch for ch in c_phone if ch.isdigit()),
                        },
                        "master_profile": {},
                        "created_at": SERVER_TIMESTAMP,
                        "updated_at": SERVER_TIMESTAMP,
                    })

                # Create application
                application_id = generate_id("app")
                membership_id = auth.membership.get("membership_id")
                col("applications").document(application_id).set({
                    "application_id": application_id,
                    "tenant_id": auth.tenant_id,
                    "candidate_id": candidate_id,
                    "candidate_name": c_name,
                    "candidate_email": c_email,
                    "job_id": job_id,
                    "job_title": job.get("title", ""),
                    "source_type": "csv_import",
                    "source_ref": "",
                    "current_stage_id": initial_stage["stage_id"],
                    "current_stage_name": initial_stage["name"],
                    "status": "active",
                    "score_total": 0,
                    "score_status": "pending",
                    "parse_status": "pending",
                    "recruiter_owner_membership_id": membership_id,
                    "hiring_manager_membership_ids": job.get("hiring_manager_membership_ids", []),
                    "manual_review_required": False,
                    "last_activity_at": SERVER_TIMESTAMP,
                    "created_at": SERVER_TIMESTAMP,
                    "updated_at": SERVER_TIMESTAMP,
                })

                results.append({"email": c_email, "application_id": application_id, "status": "created"})
            except Exception as err:
                results.append({"email": c.get("email", ""), "status": "failed", "error": str(err)})

        return {"imported": len(results), "results": results}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
