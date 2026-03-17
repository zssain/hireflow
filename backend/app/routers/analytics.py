import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, HTTPException, Depends
from app.core.firebase import col
from app.middleware.auth import get_auth, AuthContext

router = APIRouter()

# Shared thread pool for parallel Firestore queries
_executor = ThreadPoolExecutor(max_workers=8)


def ts(val):
    if val is None:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


def _count_open_jobs(tid: str) -> int:
    snap = col("jobs").where("tenant_id", "==", tid).where("status", "==", "open").get()
    return len(snap)


def _count_active_apps(tid: str) -> int:
    snap = col("applications").where("tenant_id", "==", tid).where("status", "==", "active").get()
    return len(snap)


def _count_interviews_this_week(tid: str, week_ago_ts: float) -> int:
    snap = col("interviews").where("tenant_id", "==", tid).where("status", "==", "booked").get()
    count = 0
    for doc in snap:
        d = doc.to_dict()
        start = d.get("scheduled_start")
        if start and hasattr(start, "timestamp") and start.timestamp() >= week_ago_ts:
            count += 1
    return count


def _count_offers_this_month(tid: str, month_ago_ts: float) -> int:
    snap = col("offers").where("tenant_id", "==", tid).get()
    count = 0
    for doc in snap:
        d = doc.to_dict()
        created = d.get("created_at")
        if created and hasattr(created, "timestamp") and created.timestamp() >= month_ago_ts:
            count += 1
    return count


@router.get("/dashboard")
async def dashboard(auth: AuthContext = Depends(get_auth)):
    try:
        tid = auth.tenant_id
        now = datetime.utcnow()
        week_ago_ts = (now - timedelta(days=7)).timestamp()
        month_ago_ts = (now - timedelta(days=30)).timestamp()

        loop = asyncio.get_event_loop()

        # Run all 4 Firestore queries in parallel using threads
        jobs_future = loop.run_in_executor(_executor, _count_open_jobs, tid)
        apps_future = loop.run_in_executor(_executor, _count_active_apps, tid)
        interviews_future = loop.run_in_executor(_executor, _count_interviews_this_week, tid, week_ago_ts)
        offers_future = loop.run_in_executor(_executor, _count_offers_this_month, tid, month_ago_ts)

        total_jobs, total_apps, interviews_week, offers_month = await asyncio.gather(
            jobs_future, apps_future, interviews_future, offers_future
        )

        return {
            "totalActiveJobs": total_jobs,
            "totalCandidates": total_apps,
            "interviewsThisWeek": interviews_week,
            "offersThisMonth": offers_month,
            "recentApplications": 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard metrics: {str(e)}")


@router.get("/funnel")
async def funnel(request: Request, auth: AuthContext = Depends(get_auth)):
    try:
        tid = auth.tenant_id
        job_id = request.query_params.get("job_id")

        query = col("applications").where("tenant_id", "==", tid).where("status", "==", "active")
        if job_id:
            query = query.where("job_id", "==", job_id)

        docs = query.get()
        stage_counts: dict[str, int] = {}
        for doc in docs:
            data = doc.to_dict()
            stage_name = data.get("current_stage_name", "Unknown")
            stage_counts[stage_name] = stage_counts.get(stage_name, 0) + 1

        return {
            "stages": [{"name": name, "count": count} for name, count in stage_counts.items()],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch funnel: {str(e)}")
