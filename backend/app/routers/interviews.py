from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col, get_db
from app.core.permissions import assert_permission
from app.core.utils import generate_id, generate_token
from app.middleware.auth import get_auth, AuthContext
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud import firestore as fs
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


def _generate_slots(window_start: datetime, window_end: datetime, duration_minutes: int, max_slots: int = 10):
    """Generate available time slots within the given window."""
    slots = []
    current = window_start
    while current + timedelta(minutes=duration_minutes) <= window_end and len(slots) < max_slots:
        # Skip weekends
        if current.weekday() < 5:
            # Only generate slots during business hours (9 AM - 5 PM)
            if 9 <= current.hour < 17:
                slot_end = current + timedelta(minutes=duration_minutes)
                if slot_end.hour <= 17:
                    slots.append({"start": current, "end": slot_end})
        current += timedelta(minutes=30)  # 30 min increments
    return slots


@router.get("/list")
async def list_interviews(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        status_filter = request.query_params.get("status")
        application_id = request.query_params.get("application_id")

        query = col("interviews").where("tenant_id", "==", auth.tenant_id)
        if status_filter:
            query = query.where("status", "==", status_filter)
        if application_id:
            query = query.where("application_id", "==", application_id)

        docs = query.get()

        interviews = []
        for doc in docs:
            i = doc.to_dict()
            interviews.append({
                "interview_id": i.get("interview_id"),
                "application_id": i.get("application_id"),
                "round_name": i.get("round_name"),
                "mode": i.get("mode"),
                "duration_minutes": i.get("duration_minutes"),
                "status": i.get("status"),
                "scheduled_start": ts(i.get("scheduled_start")),
                "scheduled_end": ts(i.get("scheduled_end")),
                "interviewer_membership_ids": i.get("interviewer_membership_ids", []),
                "created_at": ts(i.get("created_at")),
            })

        return {"interviews": interviews}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch interviews: {str(e)}",
        )


@router.post("/create-draft")
async def create_draft(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "schedule_interviews")

        body = await request.json()
        application_id = body.get("application_id")
        round_name = body.get("round_name")
        interviewer_membership_ids = body.get("interviewer_membership_ids", [])
        duration_minutes = body.get("duration_minutes", 60)
        candidate_timezone = body.get("candidate_timezone", "UTC")
        date_window_start = body.get("date_window_start")
        date_window_end = body.get("date_window_end")

        if not application_id or not round_name:
            raise HTTPException(status_code=400, detail="Validation failed: application_id and round_name are required")

        # Check application exists
        app_doc = col("applications").document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        application = app_doc.to_dict()
        if application.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Application not found")

        # Generate slots
        if date_window_start and date_window_end:
            window_start = datetime.fromisoformat(date_window_start.replace("Z", "+00:00"))
            window_end = datetime.fromisoformat(date_window_end.replace("Z", "+00:00"))
        else:
            window_start = datetime.now(timezone.utc) + timedelta(days=1)
            window_end = window_start + timedelta(days=7)

        slots = _generate_slots(window_start, window_end, duration_minutes)

        interview_id = generate_id("int")
        booking_token = generate_token()

        slot_options = [{"start": s["start"].isoformat(), "end": s["end"].isoformat()} for s in slots]

        col("interviews").document(interview_id).set({
            "interview_id": interview_id,
            "tenant_id": auth.tenant_id,
            "application_id": application_id,
            "candidate_id": application.get("candidate_id"),
            "job_id": application.get("job_id"),
            "round_name": round_name,
            "mode": body.get("mode", "video"),
            "duration_minutes": duration_minutes,
            "status": "draft",
            "interviewer_membership_ids": interviewer_membership_ids,
            "candidate_timezone": candidate_timezone,
            "booking_token": booking_token,
            "slot_options": slot_options,
            "scheduled_start": None,
            "scheduled_end": None,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {
            "interview_id": interview_id,
            "slot_options": slot_options,
        }
    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        status = 403 if "permission" in message.lower() else 500
        raise HTTPException(status_code=status, detail=message)


@router.post("/{interview_id}/book")
async def book_interview(interview_id: str, request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        body = await request.json()
        selected_start = body.get("selected_start")
        if not selected_start:
            raise HTTPException(status_code=400, detail="Missing selected_start")

        doc = col("interviews").document(interview_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Not found")

        interview = doc.to_dict()
        if interview.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Not found")

        start_dt = datetime.fromisoformat(selected_start.replace("Z", "+00:00"))
        end_dt = start_dt + timedelta(minutes=interview.get("duration_minutes", 60))

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


@router.post("/{interview_id}/cancel")
async def cancel_interview(interview_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "schedule_interviews")

        doc = col("interviews").document(interview_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Not found")

        interview = doc.to_dict()
        if interview.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Not found")

        col("interviews").document(interview_id).update({
            "status": "cancelled",
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"interview_id": interview_id, "status": "cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{interview_id}/reschedule")
async def reschedule_interview(interview_id: str, request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        assert_permission(auth.membership, "schedule_interviews")

        body = await request.json()
        date_window_start = body.get("date_window_start")
        date_window_end = body.get("date_window_end")

        doc = col("interviews").document(interview_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Not found")

        interview = doc.to_dict()
        if interview.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Not found")

        duration_minutes = interview.get("duration_minutes", 60)

        if date_window_start and date_window_end:
            window_start = datetime.fromisoformat(date_window_start.replace("Z", "+00:00"))
            window_end = datetime.fromisoformat(date_window_end.replace("Z", "+00:00"))
        else:
            window_start = datetime.now(timezone.utc) + timedelta(days=1)
            window_end = window_start + timedelta(days=7)

        slots = _generate_slots(window_start, window_end, duration_minutes)
        slot_options = [{"start": s["start"].isoformat(), "end": s["end"].isoformat()} for s in slots]

        col("interviews").document(interview_id).update({
            "status": "draft",
            "slot_options": slot_options,
            "scheduled_start": None,
            "scheduled_end": None,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {
            "interview_id": interview_id,
            "status": "draft",
            "slot_options": slot_options,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
