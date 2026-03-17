import os
from fastapi import APIRouter, Request, HTTPException
from app.core.firebase import col, get_db
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


def _verify_cron_secret(request: Request):
    """Verify CRON_SECRET from Authorization header or query param."""
    auth_header = request.headers.get("authorization", "")
    secret = auth_header.replace("Bearer ", "") if auth_header else None
    if not secret:
        secret = request.query_params.get("secret")
    if secret != os.getenv("CRON_SECRET"):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _create_notification(tenant_id: str, recipient_membership_id: str, notif_type: str, title: str, body: str, entity_type: str, entity_id: str):
    """Create a notification document."""
    notif_id = generate_id("ntf")
    col("notifications").document(notif_id).set({
        "notification_id": notif_id,
        "tenant_id": tenant_id,
        "recipient_membership_id": recipient_membership_id,
        "type": notif_type,
        "title": title,
        "body": body,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "read_at": None,
        "created_at": SERVER_TIMESTAMP,
    })


@router.get("/reminders")
async def send_reminders(request: Request):
    _verify_cron_secret(request)
    try:
        now = datetime.now(timezone.utc)
        in_24h = now + timedelta(hours=24)

        # Find interviews booked within the next 24 hours
        interview_docs = (
            col("interviews")
            .where("status", "==", "booked")
            .where("scheduled_start", "<=", in_24h)
            .where("scheduled_start", ">=", now)
            .get()
        )

        reminders = 0
        for doc in interview_docs:
            interview = doc.to_dict()
            for membership_id in interview.get("interviewer_membership_ids", []):
                scheduled = interview.get("scheduled_start")
                scheduled_str = ts(scheduled) if scheduled else "soon"
                _create_notification(
                    tenant_id=interview["tenant_id"],
                    recipient_membership_id=membership_id,
                    notif_type="interview_reminder",
                    title=f"Interview in 24h: {interview.get('round_name', 'Interview')}",
                    body=f"You have an interview scheduled for {scheduled_str}.",
                    entity_type="interview",
                    entity_id=interview["interview_id"],
                )
                reminders += 1

        return {"reminders_sent": reminders}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def record_metrics(request: Request):
    _verify_cron_secret(request)
    try:
        tenants_docs = (
            col("tenants")
            .where("status", "in", ["trial_active", "active"])
            .get()
        )

        recorded = 0
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        for doc in tenants_docs:
            tenant = doc.to_dict()
            tenant_id = tenant["tenant_id"]

            # Count metrics
            open_jobs = len(col("jobs").where("tenant_id", "==", tenant_id).where("status", "==", "open").get())
            active_apps = len(col("applications").where("tenant_id", "==", tenant_id).where("status", "==", "active").get())
            booked_interviews = len(col("interviews").where("tenant_id", "==", tenant_id).where("status", "==", "booked").get())

            metric_id = generate_id("dm")
            col("daily_metrics").document(metric_id).set({
                "metric_id": metric_id,
                "tenant_id": tenant_id,
                "date": today,
                "open_jobs": open_jobs,
                "active_applications": active_apps,
                "booked_interviews": booked_interviews,
                "created_at": SERVER_TIMESTAMP,
            })
            recorded += 1

        return {"tenants_recorded": recorded}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trial-warnings")
async def trial_warnings(request: Request):
    _verify_cron_secret(request)
    try:
        in_3_days = datetime.now(timezone.utc) + timedelta(days=3)

        tenant_docs = (
            col("tenants")
            .where("status", "==", "trial_active")
            .where("trial_ends_at", "<=", in_3_days)
            .get()
        )

        warnings = 0
        for doc in tenant_docs:
            tenant = doc.to_dict()
            trial_ends = tenant.get("trial_ends_at")
            trial_ends_str = ts(trial_ends) if trial_ends else "soon"

            # Find admin memberships
            admin_docs = (
                col("memberships")
                .where("tenant_id", "==", tenant["tenant_id"])
                .where("role", "==", "admin")
                .where("status", "==", "active")
                .get()
            )

            for m_doc in admin_docs:
                membership = m_doc.to_dict()
                _create_notification(
                    tenant_id=tenant["tenant_id"],
                    recipient_membership_id=membership["membership_id"],
                    notif_type="trial_expiring",
                    title="Trial ending soon",
                    body=f"Your trial ends on {trial_ends_str}. Upgrade to keep your data.",
                    entity_type="tenant",
                    entity_id=tenant["tenant_id"],
                )
                warnings += 1

        return {"warnings_sent": warnings}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue-tasks")
async def overdue_tasks(request: Request):
    _verify_cron_secret(request)
    try:
        now = datetime.now(timezone.utc)

        task_docs = (
            col("onboarding_tasks")
            .where("status", "in", ["pending", "in_progress"])
            .where("due_at", "<", now)
            .get()
        )

        marked = 0
        for doc in task_docs:
            task = doc.to_dict()
            task_id = task["task_id"]

            col("onboarding_tasks").document(task_id).update({
                "status": "overdue",
                "updated_at": SERVER_TIMESTAMP,
            })

            assigned_membership_id = task.get("assigned_membership_id")
            if assigned_membership_id:
                due_at = task.get("due_at")
                due_str = ts(due_at) if due_at else "previously"
                _create_notification(
                    tenant_id=task["tenant_id"],
                    recipient_membership_id=assigned_membership_id,
                    notif_type="task_overdue",
                    title=f"Overdue: {task.get('title', 'Task')}",
                    body=f"Task was due {due_str}.",
                    entity_type="onboarding_task",
                    entity_id=task_id,
                )

            # Emit event
            event_id = generate_id("evt")
            col("analytics_events").document(event_id).set({
                "event_id": event_id,
                "tenant_id": task["tenant_id"],
                "trigger": "onboarding.task.overdue",
                "payload": {
                    "entity_type": "onboarding_task",
                    "entity_id": task_id,
                    "plan_id": task.get("plan_id"),
                },
                "created_at": SERVER_TIMESTAMP,
            })

            marked += 1

        return {"overdue_marked": marked}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
