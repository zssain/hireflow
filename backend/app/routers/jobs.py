from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col, get_db
from app.core.permissions import assert_permission
from app.core.utils import generate_id, generate_public_id
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


def _serialize_job(data: dict) -> dict:
    """Convert all Firestore timestamps in a job dict."""
    for key in ("created_at", "updated_at", "published_at", "closed_at"):
        if key in data:
            data[key] = ts(data[key])
    return data


@router.get("")
async def list_jobs(request: Request, auth: AuthContext = Depends(get_auth)):
    status_filter = request.query_params.get("status")

    query = col("jobs").where("tenant_id", "==", auth.tenant_id)

    if status_filter:
        query = query.where("status", "==", status_filter)

    # If hiring manager, only show assigned jobs
    is_hiring_manager = auth.membership.get("role") == "hiring_manager"
    if is_hiring_manager:
        membership_id = auth.membership.get("membership_id")
        query = query.where("hiring_manager_membership_ids", "array_contains", membership_id)

    docs = query.get()
    jobs = [_serialize_job(doc.to_dict()) for doc in docs]

    # Sort in Python to avoid needing composite indexes for every filter combo
    jobs.sort(key=lambda j: j.get("created_at") or "", reverse=True)

    return {"jobs": jobs}


@router.post("")
async def create_job(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "create_edit_jobs")

        # Check tenant exists
        tenant_doc = col("tenants").document(auth.tenant_id).get()
        if not tenant_doc.exists:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant = tenant_doc.to_dict()
        plan_code = tenant.get("plan_code", "trial")

        # Check plan quota for active_jobs
        usage_doc = col("usage_counters").document(auth.tenant_id).get()
        if usage_doc.exists:
            usage = usage_doc.to_dict()
            current_jobs = usage.get("active_jobs", 0)
            limits = {"trial": 2, "starter": 10, "professional": 50, "enterprise": 999}
            limit = limits.get(plan_code, 2)
            if current_jobs >= limit:
                raise HTTPException(status_code=402, detail=f"Quota exceeded: active_jobs limit is {limit} for plan {plan_code}")

        body = await request.json()

        title = body.get("title")
        if not title:
            raise HTTPException(status_code=400, detail="Validation failed: title is required")

        job_id = generate_id("job")
        pipeline_id = generate_id("pl")
        public_id = generate_public_id()
        pipeline_template_id = body.get("pipeline_template_id", "")

        # Get pipeline stages from template or use default
        stages = [
            {"stage_id": "applied", "name": "Applied", "order": 0},
            {"stage_id": "screening", "name": "Screening", "order": 1},
            {"stage_id": "interview", "name": "Interview", "order": 2},
            {"stage_id": "offer", "name": "Offer", "order": 3},
            {"stage_id": "hired", "name": "Hired", "order": 4},
        ]
        if pipeline_template_id:
            tpl_doc = col("pipeline_templates").document(pipeline_template_id).get()
            if tpl_doc.exists:
                stages = tpl_doc.to_dict().get("stages", stages)

        db = get_db()
        batch = db.batch()

        # Create pipeline
        batch.set(col("job_pipelines").document(pipeline_id), {
            "pipeline_id": pipeline_id,
            "tenant_id": auth.tenant_id,
            "job_id": job_id,
            "name": "Default Pipeline",
            "stages": stages,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # Create job
        membership_id = auth.membership.get("membership_id")
        batch.set(col("jobs").document(job_id), {
            "job_id": job_id,
            "tenant_id": auth.tenant_id,
            "public_id": public_id,
            "title": title,
            "department": body.get("department", ""),
            "location": body.get("location", ""),
            "employment_type": body.get("employment_type", "full_time"),
            "salary_range": body.get("salary_range"),
            "description_html": body.get("description_html", ""),
            "requirements_text": body.get("requirements_text", ""),
            "visibility": body.get("visibility", "public"),
            "status": "draft",
            "pipeline_template_id": pipeline_template_id,
            "pipeline_id": pipeline_id,
            "recruiter_owner_membership_id": membership_id,
            "hiring_manager_membership_ids": body.get("hiring_manager_membership_ids", []),
            "created_by_membership_id": membership_id,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        batch.commit()

        return {"job_id": job_id, "public_id": public_id, "status": "draft"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 500
        if "permission" in message.lower():
            status = 403
        elif "Quota" in message:
            status = 402
        raise HTTPException(status_code=status, detail=message)


@router.get("/{job_id}")
async def get_job(job_id: str, auth: AuthContext = Depends(get_auth)):
    doc = col("jobs").document(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    job = doc.to_dict()
    if job.get("tenant_id") != auth.tenant_id:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get pipeline
    pipeline = None
    pipeline_id = job.get("pipeline_id")
    if pipeline_id:
        pl_doc = col("job_pipelines").document(pipeline_id).get()
        if pl_doc.exists:
            pipeline = pl_doc.to_dict()
            for key in ("created_at", "updated_at"):
                if key in pipeline:
                    pipeline[key] = ts(pipeline[key])

    return {"job": _serialize_job(job), "pipeline": pipeline}


@router.patch("/{job_id}")
async def update_job(job_id: str, request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "create_edit_jobs")

        doc = col("jobs").document(job_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")

        job = doc.to_dict()
        if job.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Job not found")

        body = await request.json()
        body.pop("tenant_id", None)
        body["updated_at"] = SERVER_TIMESTAMP

        col("jobs").document(job_id).update(body)

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 403 if "permission" in message.lower() else 500
        raise HTTPException(status_code=status, detail=message)


@router.post("/{job_id}/publish")
async def publish_job(job_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "create_edit_jobs")

        doc = col("jobs").document(job_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")

        job = doc.to_dict()
        if job.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.get("status") not in ("draft", "paused"):
            raise HTTPException(status_code=400, detail="Cannot publish job with current status")

        col("jobs").document(job_id).update({
            "status": "open",
            "published_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"job_id": job_id, "status": "open"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 500
        if "permission" in message.lower():
            status = 403
        elif "Cannot publish" in message:
            status = 400
        raise HTTPException(status_code=status, detail=message)


@router.post("/{job_id}/close")
async def close_job(job_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "create_edit_jobs")

        doc = col("jobs").document(job_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")

        job = doc.to_dict()
        if job.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.get("status") == "closed":
            raise HTTPException(status_code=400, detail="Job is already closed")

        col("jobs").document(job_id).update({
            "status": "closed",
            "closed_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"job_id": job_id, "status": "closed"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 500
        if "permission" in message.lower():
            status = 403
        elif "already closed" in message:
            status = 400
        raise HTTPException(status_code=status, detail=message)
