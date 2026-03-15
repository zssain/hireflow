import { z } from "zod";

// === Auth ===
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

// === Tenant ===
export const createTenantSchema = z.object({
  company_name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export const updateTenantSettingsSchema = z.object({
  tenant_id: z.string(),
  name: z.string().min(1).max(100).optional(),
  branding: z
    .object({
      logo_url: z.string().url().optional(),
      primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    .optional(),
  career_page: z
    .object({
      enabled: z.boolean().optional(),
      intro: z.string().max(1000).optional(),
      show_departments: z.boolean().optional(),
      show_locations: z.boolean().optional(),
    })
    .optional(),
});

// === Team ===
export const inviteTeamMemberSchema = z.object({
  tenant_id: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "recruiter", "hiring_manager"]),
  assigned_job_ids: z.array(z.string()).optional(),
});

export const updateMembershipSchema = z.object({
  tenant_id: z.string(),
  role: z.enum(["admin", "recruiter", "hiring_manager"]).optional(),
  status: z.enum(["active", "suspended", "removed"]).optional(),
  permissions_override: z
    .object({
      can_view_salary: z.boolean().optional(),
      can_approve_offer: z.boolean().optional(),
      can_move_to_offer_stage: z.boolean().optional(),
      can_edit_onboarding: z.boolean().optional(),
      can_delete_jobs: z.boolean().optional(),
    })
    .optional(),
  assigned_job_ids: z.array(z.string()).optional(),
});

// === Jobs ===
export const createJobSchema = z.object({
  tenant_id: z.string(),
  title: z.string().min(1).max(200),
  department: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern"]),
  salary_range: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
      currency: z.string().length(3),
    })
    .optional(),
  description_html: z.string().min(1),
  requirements_text: z.string().min(1),
  visibility: z.enum(["public", "private"]),
  pipeline_template_id: z.string(),
  hiring_manager_membership_ids: z.array(z.string()).optional(),
});

export const updateJobSchema = createJobSchema.partial().extend({
  tenant_id: z.string(),
});

// === Applications ===
export const publicApplySchema = z.object({
  job_public_id: z.string(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(1).max(30),
  linkedin_url: z.string().url().optional().or(z.literal("")),
});

export const moveStageSchema = z.object({
  tenant_id: z.string(),
  target_stage_id: z.string(),
});

export const importApplicationsSchema = z.object({
  tenant_id: z.string(),
  job_id: z.string(),
  candidates: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      linkedin_url: z.string().url().optional().or(z.literal("")),
    })
  ),
});

// === Interviews ===
export const createInterviewDraftSchema = z.object({
  tenant_id: z.string(),
  application_id: z.string(),
  round_name: z.string().min(1).max(100),
  interviewer_membership_ids: z.array(z.string()).min(1),
  duration_minutes: z.number().int().min(15).max(480),
  candidate_timezone: z.string(),
  date_window_start: z.string().datetime(),
  date_window_end: z.string().datetime(),
});

export const bookInterviewSchema = z.object({
  booking_token: z.string(),
  selected_start: z.string().datetime(),
});

export const rescheduleInterviewSchema = z.object({
  tenant_id: z.string(),
  date_window_start: z.string().datetime(),
  date_window_end: z.string().datetime(),
});

// === Offers ===
export const createOfferSchema = z.object({
  tenant_id: z.string(),
  application_id: z.string(),
  template_code: z.string(),
  generated_fields: z.object({
    candidate_name: z.string(),
    job_title: z.string(),
    salary: z.string(),
    joining_date: z.string(),
  }).catchall(z.string()),
});

export const respondOfferSchema = z.object({
  response: z.enum(["accept", "decline"]),
});

// === Onboarding ===
export const createOnboardingPlanSchema = z.object({
  tenant_id: z.string(),
  application_id: z.string(),
  template_code: z.string(),
  start_date: z.string().datetime(),
  manager_membership_id: z.string(),
});

// === Workflow Rules ===
export const createRuleSchema = z.object({
  tenant_id: z.string(),
  name: z.string().min(1).max(100),
  enabled: z.boolean(),
  priority: z.number().int().min(0),
  trigger: z.string(),
  conditions: z.array(
    z.object({
      path: z.string(),
      op: z.enum(["==", "!=", ">", ">=", "<", "<=", "in", "not_in", "contains", "exists"]),
      value: z.unknown(),
    })
  ),
  actions: z.array(
    z.object({
      type: z.enum([
        "move_stage",
        "create_notification",
        "send_email_template",
        "assign_owner",
        "create_onboarding_plan",
        "mark_flag",
        "set_field",
        "create_task",
        "remind_assignee",
      ]),
      params: z.record(z.string(), z.unknown()),
    })
  ),
});

export const updateRuleSchema = createRuleSchema.partial().extend({
  tenant_id: z.string(),
});

// === Notifications ===
export const markNotificationReadSchema = z.object({
  tenant_id: z.string(),
  notification_ids: z.array(z.string()).min(1),
});

// === Pipeline Templates ===
export const createPipelineTemplateSchema = z.object({
  tenant_id: z.string(),
  name: z.string().min(1).max(100),
  stages: z.array(
    z.object({
      stage_id: z.string(),
      name: z.string().min(1),
      order: z.number().int().min(0),
    })
  ).min(1),
});

// === Email Templates ===
export const createEmailTemplateSchema = z.object({
  tenant_id: z.string(),
  code: z.string().min(1),
  subject: z.string().min(1).max(200),
  body_html: z.string().min(1),
});
