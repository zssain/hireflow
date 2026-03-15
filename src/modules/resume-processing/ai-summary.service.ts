import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import { consumeUsage } from "@/lib/utils/usage";
import { generateAISummary } from "@/lib/adapters/ai.adapter";
import { extractTextFromResume } from "./parser.service";
import { extractStructuredData, evaluateConfidence } from "./extractor.service";
import { calculateScore } from "./scoring.service";
import { updateApplicationScoring } from "@/modules/applications/application.service";
import { updateCandidateProfile } from "@/modules/candidates/candidate.service";
import { emitEvent } from "@/lib/events/emitter";
import type { ApplicationProcessing } from "./processing.types";
import type { ParseStatus } from "@/modules/applications/application.types";

interface ProcessResumeParams {
  tenantId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  jobRequirements: string;
  resumeBuffer: Buffer;
  mimeType: string;
}

export async function processResume(params: ProcessResumeParams): Promise<ApplicationProcessing> {
  const processingId = generateId("proc");
  const now = Timestamp.now();

  try {
    // Step 1: Extract text
    const rawText = await extractTextFromResume(params.resumeBuffer, params.mimeType);

    // Step 2: Extract structured data
    const structured = extractStructuredData(rawText);

    // Step 3: Evaluate confidence
    const confidence = evaluateConfidence(structured, rawText);

    let parseStatus: ParseStatus;
    let manualReviewRequired = false;

    if (confidence >= 0.8) {
      parseStatus = "processed";
    } else if (confidence >= 0.5) {
      parseStatus = "partial_success";
      manualReviewRequired = true;
    } else {
      parseStatus = "low_confidence";
      manualReviewRequired = true;
    }

    // Step 4: Rule-based scoring
    const ruleScore = calculateScore(structured, rawText, params.jobRequirements, params.jobDescription);

    // Step 5: AI summary (optional, may fail)
    let aiSummary = "";
    let strengths: string[] = [];
    let gaps: string[] = [];

    try {
      const summary = await generateAISummary(
        params.jobTitle,
        params.jobDescription,
        extractSkillsFromRequirements(params.jobRequirements),
        structured.name || "Candidate",
        structured.skills,
        JSON.stringify(structured.experience),
        JSON.stringify(structured.education)
      );
      aiSummary = summary.summary;
      strengths = summary.strengths;
      gaps = summary.gaps;
      await consumeUsage(params.tenantId, "ai_credits_used");
    } catch {
      // AI summary failure is non-fatal
    }

    // Step 6: Store processing results
    const processing: ApplicationProcessing = {
      processing_id: processingId,
      tenant_id: params.tenantId,
      application_id: params.applicationId,
      parse_status: parseStatus,
      parse_confidence: confidence,
      manual_review_required: manualReviewRequired,
      parse_error_code: null,
      parse_error_message: null,
      rule_score: ruleScore,
      ai_summary: aiSummary,
      strengths,
      gaps,
      raw_extracted_text: rawText,
      structured_data: structured,
      reprocess_count: 0,
      created_at: now,
      updated_at: now,
    };

    await collections.applicationProcessing.doc(processingId).set(processing);

    // Step 7: Update application
    await updateApplicationScoring(
      params.applicationId,
      ruleScore.total,
      "processed",
      parseStatus,
      manualReviewRequired
    );

    // Step 8: Update candidate profile
    const totalYears = structured.experience.reduce((sum, exp) => sum + (exp.years ?? 1), 0);
    await updateCandidateProfile(params.candidateId, structured.skills, totalYears);

    // Step 9: Emit event
    await emitEvent({
      tenantId: params.tenantId,
      trigger: "application.processing_completed",
      payload: {
        entity_type: "application",
        entity_id: params.applicationId,
        job_id: params.jobId,
        candidate_id: params.candidateId,
        score_total: ruleScore.total,
        parse_status: parseStatus,
        confidence,
      },
    });

    return processing;
  } catch (error) {
    // Handle total failure
    const processing: ApplicationProcessing = {
      processing_id: processingId,
      tenant_id: params.tenantId,
      application_id: params.applicationId,
      parse_status: "failed",
      parse_confidence: 0,
      manual_review_required: true,
      parse_error_code: "PROCESSING_ERROR",
      parse_error_message: error instanceof Error ? error.message : "Unknown error",
      rule_score: { skills: 0, experience: 0, keywords: 0, education: 0, bonus: 0, total: 0 },
      ai_summary: "",
      strengths: [],
      gaps: [],
      raw_extracted_text: "",
      structured_data: { name: "", email: "", phone: "", skills: [], experience: [], education: [] },
      reprocess_count: 0,
      created_at: now,
      updated_at: now,
    };

    await collections.applicationProcessing.doc(processingId).set(processing);
    await updateApplicationScoring(params.applicationId, 0, "failed", "failed", true);

    return processing;
  }
}

function extractSkillsFromRequirements(requirements: string): string[] {
  const commonSkills = [
    "JavaScript","TypeScript","Python","Java","Go","React","Angular","Vue",
    "Node.js","AWS","Docker","Kubernetes","SQL","PostgreSQL","MongoDB",
    "GraphQL","REST","Git","Figma","Agile","Scrum",
  ];
  const lower = requirements.toLowerCase();
  return commonSkills.filter((s) => lower.includes(s.toLowerCase()));
}

export async function getProcessingResult(applicationId: string): Promise<ApplicationProcessing | null> {
  const snapshot = await collections.applicationProcessing
    .where("application_id", "==", applicationId)
    .orderBy("created_at", "desc")
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].data();
}
