from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col, get_db
from app.core.utils import generate_id
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


@router.get("/plans")
async def list_plans(auth: AuthContext = Depends(get_auth)):
    try:
        docs = col("onboarding_plans").where("tenant_id", "==", auth.tenant_id).get()

        plans = []
        for doc in docs:
            p = doc.to_dict()
            for key in ("created_at", "updated_at", "start_date"):
                if key in p:
                    p[key] = ts(p[key])
            plans.append(p)

        return {"plans": plans}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch onboarding plans: {str(e)}",
        )


@router.post("/plans")
async def create_plan(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        body = await request.json()
        application_id = body.get("application_id")
        template_code = body.get("template_code", "standard")
        start_date_str = body.get("start_date")
        manager_membership_id = body.get("manager_membership_id")

        if not application_id:
            raise HTTPException(status_code=400, detail="Validation failed: application_id is required")

        start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00")) if start_date_str else datetime.now(timezone.utc) + timedelta(days=14)

        plan_id = generate_id("obp")
        db = get_db()
        batch = db.batch()

        batch.set(col("onboarding_plans").document(plan_id), {
            "plan_id": plan_id,
            "tenant_id": auth.tenant_id,
            "application_id": application_id,
            "candidate_id": body.get("candidate_id", ""),
            "job_id": body.get("job_id", ""),
            "template_code": template_code,
            "manager_membership_id": manager_membership_id or auth.membership.get("membership_id"),
            "status": "active",
            "start_date": start_date,
            "created_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        # Create default tasks based on template
        default_tasks = [
            {"title": "Complete employment paperwork", "assigned_role": "new_hire", "priority": "high", "days_offset": 0},
            {"title": "Set up workstation and accounts", "assigned_role": "it_admin", "priority": "high", "days_offset": 0},
            {"title": "Team introduction meeting", "assigned_role": "manager", "priority": "medium", "days_offset": 1},
            {"title": "Review company handbook", "assigned_role": "new_hire", "priority": "medium", "days_offset": 2},
            {"title": "First week check-in", "assigned_role": "manager", "priority": "medium", "days_offset": 5},
            {"title": "30-day review", "assigned_role": "manager", "priority": "low", "days_offset": 30},
        ]

        for task_def in default_tasks:
            task_id = generate_id("obt")
            due_date = start_date + timedelta(days=task_def["days_offset"])
            batch.set(col("onboarding_tasks").document(task_id), {
                "task_id": task_id,
                "plan_id": plan_id,
                "tenant_id": auth.tenant_id,
                "title": task_def["title"],
                "assigned_role": task_def["assigned_role"],
                "assigned_membership_id": None,
                "status": "pending",
                "priority": task_def["priority"],
                "due_at": due_date,
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            })

        batch.commit()

        return {"plan_id": plan_id, "status": "active"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plans/{plan_id}/tasks")
async def get_plan_tasks(plan_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        plan_doc = col("onboarding_plans").document(plan_id).get()
        if not plan_doc.exists:
            raise HTTPException(status_code=404, detail="Plan not found")

        plan = plan_doc.to_dict()
        if plan.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Plan not found")

        task_docs = col("onboarding_tasks").where("plan_id", "==", plan_id).get()

        tasks = []
        for doc in task_docs:
            t = doc.to_dict()
            tasks.append({
                "task_id": t.get("task_id"),
                "title": t.get("title"),
                "assigned_role": t.get("assigned_role"),
                "status": t.get("status"),
                "priority": t.get("priority"),
                "due_at": ts(t.get("due_at")),
            })

        return {"tasks": tasks}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tasks: {str(e)}",
        )


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, auth: AuthContext = Depends(get_auth)):
    try:
        doc = col("onboarding_tasks").document(task_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Task not found")

        task = doc.to_dict()
        if task.get("tenant_id") != auth.tenant_id:
            raise HTTPException(status_code=404, detail="Task not found")

        col("onboarding_tasks").document(task_id).update({
            "status": "completed",
            "completed_at": SERVER_TIMESTAMP,
            "updated_at": SERVER_TIMESTAMP,
        })

        return {"task_id": task_id, "status": "completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
