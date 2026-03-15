import { Timestamp } from "firebase-admin/firestore";
import type { ParseStatus } from "@/modules/applications/application.types";

export interface StructuredData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    duration_text: string;
    years?: number;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: number;
  }>;
  certifications?: string[];
  projects?: Array<{ name: string; description: string }>;
}

export interface RuleScore {
  skills: number;
  experience: number;
  keywords: number;
  education: number;
  bonus: number;
  total: number;
}

export interface ApplicationProcessing {
  processing_id: string;
  tenant_id: string;
  application_id: string;
  parse_status: ParseStatus;
  parse_confidence: number;
  manual_review_required: boolean;
  parse_error_code: string | null;
  parse_error_message: string | null;
  rule_score: RuleScore;
  ai_summary: string;
  strengths: string[];
  gaps: string[];
  raw_extracted_text: string;
  structured_data: StructuredData;
  reprocess_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ScoringConfig {
  weights: {
    skills: 40;
    experience: 25;
    keywords: 20;
    education: 10;
    bonus: 5;
  };
}
