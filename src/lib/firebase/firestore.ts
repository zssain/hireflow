import { getAdminDb } from "./admin";
import type { Tenant } from "@/modules/tenants/tenant.types";
import type { User, Membership } from "@/modules/memberships/membership.types";
import type { Subscription, UsageCounter } from "@/modules/plans/plan.types";
import type { Job, JobPipeline, PipelineTemplate } from "@/modules/jobs/job.types";
import type { Candidate } from "@/modules/candidates/candidate.types";
import type { Application } from "@/modules/applications/application.types";
import type { ApplicationProcessing } from "@/modules/resume-processing/processing.types";
import type { Offer } from "@/modules/offers/offer.types";
import type { OnboardingPlan, OnboardingTask } from "@/modules/onboarding/onboarding.types";
import type { Notification } from "@/modules/notifications/notification.types";
import type { WorkflowRule, RuleActionLog } from "@/modules/automation/automation.types";
import type {
  AnalyticsEvent,
  DailyMetrics,
  AuditLog,
  EmailTemplate,
  CalendarConnection,
  InterviewDoc,
} from "@/modules/analytics/analytics.types";

function typedCollection<T>(name: string) {
  return getAdminDb().collection(name) as FirebaseFirestore.CollectionReference<T>;
}

// Lazy collection accessors — only resolve Firestore at call time, not at import time
export const collections = {
  get tenants() { return typedCollection<Tenant>("tenants"); },
  get users() { return typedCollection<User>("users"); },
  get memberships() { return typedCollection<Membership>("memberships"); },
  get subscriptions() { return typedCollection<Subscription>("subscriptions"); },
  get usageCounters() { return typedCollection<UsageCounter>("usage_counters"); },
  get pipelineTemplates() { return typedCollection<PipelineTemplate>("pipeline_templates"); },
  get jobs() { return typedCollection<Job>("jobs"); },
  get jobPipelines() { return typedCollection<JobPipeline>("job_pipelines"); },
  get candidates() { return typedCollection<Candidate>("candidates"); },
  get applications() { return typedCollection<Application>("applications"); },
  get applicationProcessing() { return typedCollection<ApplicationProcessing>("application_processing"); },
  get interviews() { return typedCollection<InterviewDoc>("interviews"); },
  get offers() { return typedCollection<Offer>("offers"); },
  get onboardingPlans() { return typedCollection<OnboardingPlan>("onboarding_plans"); },
  get onboardingTasks() { return typedCollection<OnboardingTask>("onboarding_tasks"); },
  get notifications() { return typedCollection<Notification>("notifications"); },
  get workflowRules() { return typedCollection<WorkflowRule>("workflow_rules"); },
  get ruleActionLogs() { return typedCollection<RuleActionLog>("rule_action_logs"); },
  get analyticsEvents() { return typedCollection<AnalyticsEvent>("analytics_events"); },
  get dailyMetrics() { return typedCollection<DailyMetrics>("daily_metrics"); },
  get auditLogs() { return typedCollection<AuditLog>("audit_logs"); },
  get emailTemplates() { return typedCollection<EmailTemplate>("email_templates"); },
  get calendarConnections() { return typedCollection<CalendarConnection>("calendar_connections"); },
};
