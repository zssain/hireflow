from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from typing import Optional
from app.core.firebase import col
from app.core.utils import generate_id
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


@router.post("/apply")
async def public_apply(
    job_public_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    linkedin_url: str = Form(""),
    resume_file: Optional[UploadFile] = File(None),
):
    try:
        if not job_public_id or not name or not email:
            raise HTTPException(status_code=400, detail="Validation failed: job_public_id, name, and email are required")

        # Find the job by public_id
        job_docs = (
            col("jobs")
            .where("public_id", "==", job_public_id)
            .limit(1)
            .get()
        )
        if not job_docs:
            raise HTTPException(status_code=404, detail="Job not found or not accepting applications")

        job = job_docs[0].to_dict()
        if job.get("status") != "open":
            raise HTTPException(status_code=404, detail="Job not found or not accepting applications")

        tenant_id = job["tenant_id"]

        # Get pipeline for initial stage
        pipeline_doc = col("job_pipelines").document(job["pipeline_id"]).get()
        if not pipeline_doc.exists:
            raise HTTPException(status_code=500, detail="Job pipeline not configured")

        pipeline = pipeline_doc.to_dict()
        pipeline_stages = sorted(pipeline.get("stages", []), key=lambda s: s.get("order", 0))
        if not pipeline_stages:
            raise HTTPException(status_code=500, detail="Job pipeline not configured")

        initial_stage = pipeline_stages[0]

        # Find or create candidate (dedupe by email)
        existing_cand = (
            col("candidates")
            .where("tenant_id", "==", tenant_id)
            .where("email", "==", email)
            .limit(1)
            .get()
        )

        if existing_cand:
            candidate = existing_cand[0].to_dict()
            candidate_id = candidate["candidate_id"]
        else:
            candidate_id = generate_id("cand")
            col("candidates").document(candidate_id).set({
                "candidate_id": candidate_id,
                "tenant_id": tenant_id,
                "name": name,
                "email": email,
                "phone": phone,
                "linkedin_url": linkedin_url,
                "dedupe_keys": {
                    "email_lower": email.lower(),
                    "phone_normalized": "".join(ch for ch in phone if ch.isdigit()),
                },
                "master_profile": {},
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            })

        # Check if already applied to this job
        existing_app = (
            col("applications")
            .where("tenant_id", "==", tenant_id)
            .where("candidate_id", "==", candidate_id)
            .where("job_id", "==", job["job_id"])
            .limit(1)
            .get()
        )
        if existing_app:
            raise HTTPException(status_code=409, detail="Candidate has already applied to this job")

        # Create application
        application_id = generate_id("app")
        col("applications").document(application_id).set({
            "application_id": application_id,
            "tenant_id": tenant_id,
            "candidate_id": candidate_id,
            "candidate_name": name,
            "candidate_email": email,
            "job_id": job["job_id"],
            "job_title": job.get("title", ""),
            "source_type": "careers_page",
            "source_ref": "",
            "current_stage_id": initial_stage["stage_id"],
            "current_stage_name": initial_stage["name"],
            "status": "active",
            "score_total": 0,
            "score_status": "pending",
            "parse_status": "pending",
            "recruiter_owner_membership_id": job.get("recruiter_owner_membership_id", ""),
            "hiring_manager_membership_ids": job.get("hiring_manager_membership_ids", []),
            "manual_review_required": False,
            "last_activity_at": SERVER_TIMESTAMP,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # If resume uploaded, read buffer (processing would be async in production)
        if resume_file:
            _buffer = await resume_file.read()
            # In production, this would trigger async resume processing
            # processResume(...) — fire and forget

        return {"application_id": application_id, "status": "submitted"}
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 409 if "already applied" in message else 500
        raise HTTPException(status_code=status, detail=message)


@router.get("/jobs/{public_id}")
async def get_public_job(public_id: str):
    try:
        job_docs = (
            col("jobs")
            .where("public_id", "==", public_id)
            .limit(1)
            .get()
        )
        if not job_docs:
            raise HTTPException(status_code=404, detail="Job not found")

        job = job_docs[0].to_dict()
        if job.get("status") != "open" or job.get("visibility") != "public":
            raise HTTPException(status_code=404, detail="Job not found")

        # Get tenant info
        tenant_doc = col("tenants").document(job["tenant_id"]).get()
        company = None
        if tenant_doc.exists:
            t = tenant_doc.to_dict()
            branding = t.get("branding", {})
            company = {
                "name": t.get("name"),
                "slug": t.get("slug"),
                "logo_url": branding.get("logo_url", ""),
                "primary_color": branding.get("primary_color", "#6366f1"),
            }

        return {
            "job": {
                "public_id": job.get("public_id"),
                "title": job.get("title"),
                "department": job.get("department"),
                "location": job.get("location"),
                "employment_type": job.get("employment_type"),
                "description_html": job.get("description_html"),
                "requirements_text": job.get("requirements_text"),
                "published_at": ts(job.get("published_at")),
            },
            "company": company,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tenant/{slug}/jobs")
async def get_tenant_jobs(slug: str):
    try:
        # Find tenant by slug
        tenant_docs = col("tenants").where("slug", "==", slug).limit(1).get()
        if not tenant_docs:
            raise HTTPException(status_code=404, detail="Company not found")

        tenant = tenant_docs[0].to_dict()
        career_page = tenant.get("career_page", {})
        if not career_page.get("enabled"):
            raise HTTPException(status_code=404, detail="Career page is not enabled")

        # Get public open jobs
        job_docs = (
            col("jobs")
            .where("tenant_id", "==", tenant["tenant_id"])
            .where("status", "==", "open")
            .where("visibility", "==", "public")
            .get()
        )

        branding = tenant.get("branding", {})
        jobs = []
        for doc in job_docs:
            j = doc.to_dict()
            jobs.append({
                "public_id": j.get("public_id"),
                "title": j.get("title"),
                "department": j.get("department"),
                "location": j.get("location"),
                "employment_type": j.get("employment_type"),
                "published_at": ts(j.get("published_at")),
            })

        return {
            "company": {
                "name": tenant.get("name"),
                "slug": tenant.get("slug"),
                "logo_url": branding.get("logo_url", ""),
                "primary_color": branding.get("primary_color", "#6366f1"),
                "intro": career_page.get("intro", ""),
            },
            "jobs": jobs,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interviews/{token}/book")
async def public_book_interview(token: str, request: Request):
    try:
        body = await request.json()
        selected_start = body.get("selected_start")
        if not selected_start:
            raise HTTPException(status_code=400, detail="Validation failed: selected_start is required")

        # Find interview by booking token
        interview_docs = (
            col("interviews")
            .where("booking_token", "==", token)
            .limit(1)
            .get()
        )
        if not interview_docs:
            raise HTTPException(status_code=404, detail="Invalid booking token")

        interview = interview_docs[0].to_dict()
        interview_id = interview["interview_id"]
        duration_minutes = interview.get("duration_minutes", 60)

        start_dt = datetime.fromisoformat(selected_start.replace("Z", "+00:00"))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        col("interviews").document(interview_id).update({
            "status": "booked",
            "scheduled_start": start_dt,
            "scheduled_end": end_dt,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {
            "status": "booked",
            "scheduled_start": start_dt.isoformat(),
            "scheduled_end": end_dt.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/offers/{token}/respond")
async def public_respond_offer(token: str, request: Request):
    try:
        body = await request.json()
        response = body.get("response")
        if response not in ("accepted", "declined"):
            raise HTTPException(status_code=400, detail="Validation failed: response must be 'accepted' or 'declined'")

        # Find offer by respond token
        offer_docs = (
            col("offers")
            .where("respond_token", "==", token)
            .limit(1)
            .get()
        )
        if not offer_docs:
            raise HTTPException(status_code=404, detail="Invalid offer token")

        offer = offer_docs[0].to_dict()
        offer_id = offer["offer_id"]

        col("offers").document(offer_id).update({
            "status": response,
            "responded_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"offer_id": offer_id, "status": response}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
