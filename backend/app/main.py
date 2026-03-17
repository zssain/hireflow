import os
from dotenv import load_dotenv
load_dotenv()

import json
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


class FirestoreEncoder(json.JSONEncoder):
    """Handle Firestore DatetimeWithNanoseconds and other types."""
    def default(self, obj):
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        if hasattr(obj, "__class__") and "DatetimeWithNanoseconds" in obj.__class__.__name__:
            return obj.isoformat()
        return super().default(obj)


class FirestoreJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(content, cls=FirestoreEncoder).encode("utf-8")

from app.routers import (
    auth,
    tenant,
    team,
    jobs,
    applications,
    analytics,
    interviews,
    offers,
    onboarding,
    notifications,
    scoring,
    rules,
    seed,
    public,
    cron,
)

app = FastAPI(
    title="HireFlow API",
    version="1.0.0",
    redirect_slashes=False,
    default_response_class=FirestoreJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3001")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Mount all routers under /api
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(tenant.router, prefix="/api/tenant", tags=["tenant"])
app.include_router(team.router, prefix="/api/team", tags=["team"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])
app.include_router(offers.router, prefix="/api/offers", tags=["offers"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["scoring"])
app.include_router(rules.router, prefix="/api/rules", tags=["rules"])
app.include_router(seed.router, prefix="/api/seed", tags=["seed"])
app.include_router(public.router, prefix="/api/public", tags=["public"])
app.include_router(cron.router, prefix="/api/cron", tags=["cron"])
