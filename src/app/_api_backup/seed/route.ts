import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId, generatePublicId, generateToken } from "@/lib/utils/ids";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id } = body;
    if (!tenant_id) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });

    const now = Timestamp.now();
    const batch = collections.jobs.firestore.batch();

    // Get existing membership for this tenant (the admin who created it)
    const membershipSnap = await collections.memberships
      .where("tenant_id", "==", tenant_id)
      .where("role", "==", "admin")
      .limit(1)
      .get();

    const adminMembershipId = membershipSnap.empty ? "unknown" : membershipSnap.docs[0].data().membership_id;

    // Get default pipeline template
    const templateSnap = await collections.pipelineTemplates
      .where("tenant_id", "==", tenant_id)
      .limit(1)
      .get();

    const stages = templateSnap.empty
      ? [
          { stage_id: "applied", name: "Applied", order: 0 },
          { stage_id: "screening", name: "Screening", order: 1 },
          { stage_id: "interview", name: "Interview", order: 2 },
          { stage_id: "offer", name: "Offer", order: 3 },
          { stage_id: "hired", name: "Hired", order: 4 },
        ]
      : templateSnap.docs[0].data().stages;

    const templateId = templateSnap.empty ? "default" : templateSnap.docs[0].data().template_id;

    // === MOCK JOBS ===
    const mockJobs = [
      { title: "Senior Frontend Engineer", department: "Engineering", location: "Remote", type: "full_time" as const, salary: { min: 140000, max: 180000, currency: "USD" }, desc: "We're looking for a senior frontend engineer to lead our React/Next.js stack. You'll architect new features, mentor junior developers, and drive performance improvements.", reqs: "5+ years React experience\nTypeScript proficiency\nNext.js expertise\nTailwind CSS\nState management (Zustand/Redux)\nTesting (Jest, Cypress)\nCI/CD experience" },
      { title: "Product Designer", department: "Design", location: "New York, NY", type: "full_time" as const, salary: { min: 120000, max: 160000, currency: "USD" }, desc: "Join our design team to create beautiful, intuitive interfaces for our hiring platform. Work closely with engineering and product to ship delightful experiences.", reqs: "4+ years product design\nFigma expertise\nDesign systems experience\nUser research skills\nPrototyping\nAccessibility knowledge" },
      { title: "Backend Engineer", department: "Engineering", location: "San Francisco, CA", type: "full_time" as const, salary: { min: 150000, max: 200000, currency: "USD" }, desc: "Build scalable APIs and microservices powering our hiring platform. Work with Node.js, Firebase, and cloud infrastructure.", reqs: "5+ years backend development\nNode.js/TypeScript\nFirebase or cloud databases\nREST/GraphQL API design\nDocker/Kubernetes\nAWS/GCP experience" },
      { title: "Marketing Intern", department: "Marketing", location: "Remote", type: "intern" as const, desc: "Help us grow our brand presence and create content that resonates with HR professionals and startup founders.", reqs: "Currently enrolled in university\nStrong writing skills\nSocial media knowledge\nCreative thinking\nSelf-motivated" },
      { title: "DevOps Engineer", department: "Engineering", location: "Remote", type: "contract" as const, salary: { min: 160000, max: 200000, currency: "USD" }, desc: "Design and maintain our cloud infrastructure, CI/CD pipelines, and monitoring systems. Ensure 99.9% uptime for our SaaS platform.", reqs: "4+ years DevOps experience\nAWS/GCP\nTerraform/Pulumi\nDocker/Kubernetes\nCI/CD (GitHub Actions)\nMonitoring (Datadog/Grafana)" },
    ];

    const jobIds: string[] = [];

    for (const job of mockJobs) {
      const jobId = generateId("job");
      const pipelineId = generateId("pl");
      const publicId = generatePublicId();
      jobIds.push(jobId);

      batch.set(collections.jobPipelines.doc(pipelineId), {
        pipeline_id: pipelineId, tenant_id: tenant_id, job_id: jobId, name: "Default Pipeline", stages, created_at: now, updated_at: now,
      });

      batch.set(collections.jobs.doc(jobId), {
        job_id: jobId, tenant_id: tenant_id, public_id: publicId, title: job.title, department: job.department,
        location: job.location, employment_type: job.type, salary_range: job.salary ?? undefined,
        description_html: `<p>${job.desc}</p>`, requirements_text: job.reqs, visibility: "public" as const,
        status: "open" as const, pipeline_template_id: templateId, pipeline_id: pipelineId,
        recruiter_owner_membership_id: adminMembershipId, hiring_manager_membership_ids: [],
        published_at: now, created_by_membership_id: adminMembershipId, created_at: now, updated_at: now,
      });
    }

    // === MOCK CANDIDATES & APPLICATIONS ===
    const mockCandidates = [
      { name: "Sarah Chen", email: "sarah.chen@email.com", phone: "+1-555-0101", skills: ["React", "TypeScript", "Next.js", "Tailwind"], years: 6 },
      { name: "Marcus Johnson", email: "marcus.j@email.com", phone: "+1-555-0102", skills: ["React", "Vue", "JavaScript", "CSS"], years: 4 },
      { name: "Emily Rodriguez", email: "emily.r@email.com", phone: "+1-555-0103", skills: ["Figma", "Sketch", "User Research", "Prototyping"], years: 5 },
      { name: "Alex Kim", email: "alex.kim@email.com", phone: "+1-555-0104", skills: ["Node.js", "Python", "AWS", "Docker", "PostgreSQL"], years: 7 },
      { name: "Priya Patel", email: "priya.p@email.com", phone: "+1-555-0105", skills: ["React", "Angular", "TypeScript", "GraphQL"], years: 3 },
      { name: "James O'Brien", email: "james.ob@email.com", phone: "+1-555-0106", skills: ["Terraform", "Kubernetes", "AWS", "CI/CD", "Linux"], years: 5 },
      { name: "Lisa Wang", email: "lisa.wang@email.com", phone: "+1-555-0107", skills: ["React", "Next.js", "TypeScript", "Testing"], years: 8 },
      { name: "David Nakamura", email: "david.n@email.com", phone: "+1-555-0108", skills: ["Figma", "Design Systems", "CSS", "Animation"], years: 6 },
      { name: "Fatima Hassan", email: "fatima.h@email.com", phone: "+1-555-0109", skills: ["Node.js", "Firebase", "MongoDB", "REST APIs"], years: 4 },
      { name: "Ryan Cooper", email: "ryan.c@email.com", phone: "+1-555-0110", skills: ["Content Writing", "Social Media", "SEO", "Analytics"], years: 1 },
      { name: "Aisha Mohammed", email: "aisha.m@email.com", phone: "+1-555-0111", skills: ["React", "TypeScript", "Zustand", "Cypress"], years: 5 },
      { name: "Tom Wilson", email: "tom.w@email.com", phone: "+1-555-0112", skills: ["AWS", "GCP", "Docker", "Monitoring", "Python"], years: 6 },
    ];

    // Map candidates to jobs with various stages and scores
    const assignments = [
      { candidateIdx: 0, jobIdx: 0, stage: "interview", score: 88 },
      { candidateIdx: 1, jobIdx: 0, stage: "screening", score: 72 },
      { candidateIdx: 4, jobIdx: 0, stage: "applied", score: 65 },
      { candidateIdx: 6, jobIdx: 0, stage: "offer", score: 92 },
      { candidateIdx: 10, jobIdx: 0, stage: "screening", score: 78 },
      { candidateIdx: 2, jobIdx: 1, stage: "interview", score: 85 },
      { candidateIdx: 7, jobIdx: 1, stage: "screening", score: 76 },
      { candidateIdx: 3, jobIdx: 2, stage: "interview", score: 90 },
      { candidateIdx: 8, jobIdx: 2, stage: "applied", score: 58 },
      { candidateIdx: 9, jobIdx: 3, stage: "applied", score: 45 },
      { candidateIdx: 5, jobIdx: 4, stage: "screening", score: 82 },
      { candidateIdx: 11, jobIdx: 4, stage: "applied", score: 70 },
    ];

    for (const assignment of assignments) {
      const c = mockCandidates[assignment.candidateIdx];
      const candidateId = generateId("cand");
      const applicationId = generateId("app");
      const stageObj = stages.find((s: { stage_id: string }) => s.stage_id === assignment.stage) ?? stages[0];

      batch.set(collections.candidates.doc(candidateId), {
        candidate_id: candidateId, tenant_id: tenant_id, name: c.name, email: c.email, phone: c.phone,
        linkedin_url: "", dedupe_keys: { email_lower: c.email.toLowerCase(), phone_normalized: c.phone.replace(/\D/g, "") },
        master_profile: { skills: c.skills, years_experience: c.years }, created_at: now, updated_at: now,
      });

      batch.set(collections.applications.doc(applicationId), {
        application_id: applicationId, tenant_id: tenant_id, candidate_id: candidateId,
        candidate_name: c.name, candidate_email: c.email, job_id: jobIds[assignment.jobIdx],
        job_title: mockJobs[assignment.jobIdx].title, source_type: "careers_page" as const, source_ref: "",
        current_stage_id: stageObj.stage_id, current_stage_name: stageObj.name,
        status: "active" as const, score_total: assignment.score, score_status: "processed" as const,
        parse_status: "processed" as const, recruiter_owner_membership_id: adminMembershipId,
        hiring_manager_membership_ids: [], manual_review_required: assignment.score < 60,
        last_activity_at: now, created_at: now, updated_at: now,
      });

      // Create processing result
      const processingId = generateId("proc");
      batch.set(collections.applicationProcessing.doc(processingId), {
        processing_id: processingId, tenant_id: tenant_id, application_id: applicationId,
        parse_status: "processed" as const, parse_confidence: assignment.score > 70 ? 0.9 : 0.6,
        manual_review_required: assignment.score < 60, parse_error_code: null, parse_error_message: null,
        rule_score: {
          skills: Math.round(assignment.score * 0.4), experience: Math.round(assignment.score * 0.25),
          keywords: Math.round(assignment.score * 0.2), education: Math.round(assignment.score * 0.1),
          bonus: Math.round(assignment.score * 0.05), total: assignment.score,
        },
        ai_summary: `${c.name} shows ${assignment.score >= 80 ? "strong" : assignment.score >= 60 ? "moderate" : "limited"} alignment with the ${mockJobs[assignment.jobIdx].title} role. Their ${c.skills.slice(0, 3).join(", ")} experience is ${assignment.score >= 70 ? "well-suited" : "partially relevant"} for this position.`,
        strengths: c.skills.slice(0, 3).map((s: string) => `Strong ${s} expertise`),
        gaps: assignment.score < 80 ? ["Could benefit from more experience in the specific domain"] : [],
        raw_extracted_text: "", structured_data: { name: c.name, email: c.email, phone: c.phone, skills: c.skills, experience: [{ company: "Previous Co", title: "Engineer", duration_text: `${c.years} years` }], education: [{ degree: "B.S. Computer Science", institution: "University", year: 2020 }] },
        reprocess_count: 0, created_at: now, updated_at: now,
      });
    }

    await batch.commit();

    return NextResponse.json({
      seeded: {
        jobs: mockJobs.length,
        candidates: assignments.length,
        applications: assignments.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Seed failed" }, { status: 500 });
  }
}
