import { Timestamp } from "firebase-admin/firestore";

export interface Candidate {
  candidate_id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  dedupe_keys: {
    email_lower: string;
    phone_normalized: string;
  };
  master_profile: {
    skills: string[];
    years_experience: number;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}
