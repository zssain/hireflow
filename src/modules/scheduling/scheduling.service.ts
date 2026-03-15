import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId, generateToken } from "@/lib/utils/ids";
import { emitEvent } from "@/lib/events/emitter";
import { generateSlots, type TimeSlot } from "./slot-generator";
import type { InterviewDoc } from "@/modules/analytics/analytics.types";

interface CreateDraftParams {
  tenantId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  roundName: string;
  interviewerMembershipIds: string[];
  durationMinutes: number;
  candidateTimezone: string;
  dateWindowStart: string;
  dateWindowEnd: string;
}

export async function createInterviewDraft(params: CreateDraftParams): Promise<InterviewDoc> {
  const interviewId = generateId("int");
  const bookingToken = generateToken();
  const now = Timestamp.now();

  const slots = generateSlots({
    windowStart: new Date(params.dateWindowStart),
    windowEnd: new Date(params.dateWindowEnd),
    durationMinutes: params.durationMinutes,
  });

  const slotOptions = slots.slice(0, 10).map((s: TimeSlot) => ({
    start: Timestamp.fromDate(s.start),
    end: Timestamp.fromDate(s.end),
  }));

  const interview: InterviewDoc = {
    interview_id: interviewId,
    tenant_id: params.tenantId,
    application_id: params.applicationId,
    candidate_id: params.candidateId,
    job_id: params.jobId,
    round_name: params.roundName,
    mode: "google_meet",
    duration_minutes: params.durationMinutes,
    candidate_timezone: params.candidateTimezone,
    interviewer_membership_ids: params.interviewerMembershipIds,
    status: "draft",
    booking_token: bookingToken,
    slot_options: slotOptions,
    scheduled_start: null,
    scheduled_end: null,
    calendar_provider: null,
    calendar_event_ref: null,
    created_at: now,
    updated_at: now,
  };

  await collections.interviews.doc(interviewId).set(interview);

  await emitEvent({
    tenantId: params.tenantId,
    trigger: "interview.draft_created",
    payload: { entity_type: "interview", entity_id: interviewId, job_id: params.jobId, application_id: params.applicationId },
  });

  return interview;
}

export async function getInterview(interviewId: string): Promise<InterviewDoc | null> {
  const doc = await collections.interviews.doc(interviewId).get();
  return doc.exists ? doc.data()! : null;
}

export async function getInterviewByToken(token: string): Promise<InterviewDoc | null> {
  const snapshot = await collections.interviews
    .where("booking_token", "==", token)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0].data();
}

export async function bookInterview(
  interviewId: string,
  selectedStart: Date
): Promise<InterviewDoc> {
  const interview = await getInterview(interviewId);
  if (!interview) throw new Error("Interview not found");
  if (interview.status !== "draft" && interview.status !== "slot_sent") {
    throw new Error("Interview cannot be booked in current status");
  }

  const slot = interview.slot_options.find(
    (s) => s.start.toDate().getTime() === selectedStart.getTime()
  );
  if (!slot) throw new Error("Selected slot is not available");

  const now = Timestamp.now();
  await collections.interviews.doc(interviewId).update({
    status: "booked",
    scheduled_start: slot.start,
    scheduled_end: slot.end,
    updated_at: now,
  });

  await emitEvent({
    tenantId: interview.tenant_id,
    trigger: "interview.booked",
    payload: {
      entity_type: "interview",
      entity_id: interviewId,
      job_id: interview.job_id,
      application_id: interview.application_id,
      scheduled_start: slot.start.toDate().toISOString(),
    },
  });

  return { ...interview, status: "booked", scheduled_start: slot.start, scheduled_end: slot.end };
}

export async function cancelInterview(interviewId: string): Promise<void> {
  const interview = await getInterview(interviewId);
  if (!interview) throw new Error("Interview not found");

  await collections.interviews.doc(interviewId).update({
    status: "cancelled",
    updated_at: Timestamp.now(),
  });
}

export async function listInterviews(
  tenantId: string,
  filters?: { status?: string; applicationId?: string }
): Promise<InterviewDoc[]> {
  let query = collections.interviews.where("tenant_id", "==", tenantId) as FirebaseFirestore.Query<InterviewDoc>;

  if (filters?.status) query = query.where("status", "==", filters.status);
  if (filters?.applicationId) query = query.where("application_id", "==", filters.applicationId);

  const snapshot = await query.orderBy("created_at", "desc").get();
  return snapshot.docs.map((doc) => doc.data());
}
