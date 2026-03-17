from fastapi import HTTPException

PERMISSION_MATRIX = {
    "manage_workspace":     {"admin": True,  "recruiter": False,      "hiring_manager": False},
    "manage_team":          {"admin": True,  "recruiter": False,      "hiring_manager": False},
    "manage_billing":       {"admin": True,  "recruiter": False,      "hiring_manager": False},
    "create_edit_jobs":     {"admin": True,  "recruiter": True,       "hiring_manager": False},
    "delete_jobs":          {"admin": True,  "recruiter": "override", "hiring_manager": False},
    "view_all_candidates":  {"admin": True,  "recruiter": True,       "hiring_manager": False},
    "move_pipeline_stages": {"admin": True,  "recruiter": True,       "hiring_manager": "override"},
    "schedule_interviews":  {"admin": True,  "recruiter": True,       "hiring_manager": False},
    "submit_feedback":      {"admin": True,  "recruiter": True,       "hiring_manager": True},
    "create_offers":        {"admin": True,  "recruiter": True,       "hiring_manager": False},
    "approve_offers":       {"admin": True,  "recruiter": "override", "hiring_manager": "override"},
    "send_offers":          {"admin": True,  "recruiter": True,       "hiring_manager": False},
    "manage_onboarding":    {"admin": True,  "recruiter": True,       "hiring_manager": False},
    "view_salary":          {"admin": True,  "recruiter": "override", "hiring_manager": "override"},
    "manage_rules":         {"admin": True,  "recruiter": True,       "hiring_manager": False},
    "view_analytics":       {"admin": True,  "recruiter": True,       "hiring_manager": True},
    "manage_templates":     {"admin": True,  "recruiter": True,       "hiring_manager": False},
}

OVERRIDE_MAP = {
    "delete_jobs": "can_delete_jobs",
    "approve_offers": "can_approve_offer",
    "move_pipeline_stages": "can_move_to_offer_stage",
    "view_salary": "can_view_salary",
    "manage_onboarding": "can_edit_onboarding",
}


def has_permission(role: str, permission: str, overrides: dict | None = None) -> bool:
    value = PERMISSION_MATRIX.get(permission, {}).get(role, False)
    if value is True:
        return True
    if value is False:
        return False
    if value == "override" and overrides:
        key = OVERRIDE_MAP.get(permission, "")
        if key and overrides.get(key) is True:
            return True
    return False


def assert_permission(membership: dict, permission: str):
    if not has_permission(
        membership.get("role", ""),
        permission,
        membership.get("permissions_override"),
    ):
        raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
