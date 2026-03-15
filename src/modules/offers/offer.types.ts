import { Timestamp } from "firebase-admin/firestore";

export type OfferStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired";
export type ApprovalState = "pending" | "approved" | "rejected";

export interface Offer {
  offer_id: string;
  tenant_id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  status: OfferStatus;
  approval_state: ApprovalState;
  template_code: string;
  generated_fields: {
    candidate_name: string;
    job_title: string;
    salary: string;
    joining_date: string;
    [key: string]: string;
  };
  response_token: string;
  sent_at: Timestamp | null;
  viewed_at: Timestamp | null;
  accepted_at: Timestamp | null;
  declined_at: Timestamp | null;
  created_by_membership_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
