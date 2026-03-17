import os
import firebase_admin
from firebase_admin import credentials, firestore, auth

_app = None
_db = None


def get_app():
    global _app
    if _app:
        return _app
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.environ["FIREBASE_ADMIN_PROJECT_ID"],
        "client_email": os.environ["FIREBASE_ADMIN_CLIENT_EMAIL"],
        "private_key": os.environ["FIREBASE_ADMIN_PRIVATE_KEY"].replace("\\n", "\n"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    _app = firebase_admin.initialize_app(cred)
    return _app


def get_db() -> firestore.firestore.Client:
    global _db
    if _db:
        return _db
    get_app()
    _db = firestore.client()
    return _db


def verify_id_token(token: str) -> dict:
    get_app()
    return auth.verify_id_token(token)


# Collection name constants
COLLECTIONS = {
    "tenants": "tenants",
    "users": "users",
    "memberships": "memberships",
    "subscriptions": "subscriptions",
    "usage_counters": "usage_counters",
    "pipeline_templates": "pipeline_templates",
    "jobs": "jobs",
    "job_pipelines": "job_pipelines",
    "candidates": "candidates",
    "applications": "applications",
    "application_processing": "application_processing",
    "interviews": "interviews",
    "offers": "offers",
    "onboarding_plans": "onboarding_plans",
    "onboarding_tasks": "onboarding_tasks",
    "notifications": "notifications",
    "workflow_rules": "workflow_rules",
    "rule_action_logs": "rule_action_logs",
    "analytics_events": "analytics_events",
    "daily_metrics": "daily_metrics",
    "audit_logs": "audit_logs",
    "email_templates": "email_templates",
    "calendar_connections": "calendar_connections",
}


def col(name: str):
    """Get a Firestore collection reference."""
    return get_db().collection(COLLECTIONS.get(name, name))
