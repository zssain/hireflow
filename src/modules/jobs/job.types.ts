import { Timestamp } from "firebase-admin/firestore";

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type JobVisibility = "public" | "private";
export type JobStatus = "draft" | "open" | "paused" | "closed";

export interface Job {
  job_id: string;
  tenant_id: string;
  public_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  salary_range?: { min: number; max: number; currency: string };
  description_html: string;
  requirements_text: string;
  visibility: JobVisibility;
  status: JobStatus;
  pipeline_template_id: string;
  pipeline_id: string;
  recruiter_owner_membership_id: string;
  hiring_manager_membership_ids: string[];
  published_at: Timestamp | null;
  created_by_membership_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PipelineTemplate {
  template_id: string;
  tenant_id: string;
  name: string;
  stages: PipelineStage[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface JobPipeline {
  pipeline_id: string;
  tenant_id: string;
  job_id: string;
  name: string;
  stages: PipelineStage[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PipelineStage {
  stage_id: string;
  name: string;
  order: number;
}
