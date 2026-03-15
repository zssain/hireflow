import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import type { Candidate } from "./candidate.types";

interface CreateCandidateParams {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
}

export async function findOrCreateCandidate(params: CreateCandidateParams): Promise<Candidate> {
  const emailLower = params.email.toLowerCase().trim();

  // Dedupe by email
  const existing = await collections.candidates
    .where("tenant_id", "==", params.tenantId)
    .where("dedupe_keys.email_lower", "==", emailLower)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].data();
  }

  const candidateId = generateId("cand");
  const now = Timestamp.now();

  const candidate: Candidate = {
    candidate_id: candidateId,
    tenant_id: params.tenantId,
    name: params.name,
    email: params.email,
    phone: params.phone ?? "",
    linkedin_url: params.linkedinUrl ?? "",
    dedupe_keys: {
      email_lower: emailLower,
      phone_normalized: (params.phone ?? "").replace(/\D/g, ""),
    },
    master_profile: {
      skills: [],
      years_experience: 0,
    },
    created_at: now,
    updated_at: now,
  };

  await collections.candidates.doc(candidateId).set(candidate);
  return candidate;
}

export async function getCandidate(candidateId: string): Promise<Candidate | null> {
  const doc = await collections.candidates.doc(candidateId).get();
  return doc.exists ? doc.data()! : null;
}

export async function updateCandidateProfile(
  candidateId: string,
  skills: string[],
  yearsExperience: number
): Promise<void> {
  await collections.candidates.doc(candidateId).update({
    "master_profile.skills": skills,
    "master_profile.years_experience": yearsExperience,
    updated_at: Timestamp.now(),
  });
}
