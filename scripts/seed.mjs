import admin from "firebase-admin";
import fs from "fs";
import { nanoid } from "nanoid";

const serviceAccount = JSON.parse(
  fs.readFileSync("hireflow-22c88-firebase-adminsdk-fbsvc-f0b572a974.json", "utf8")
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();
const now = admin.firestore.Timestamp.now();
const id = (prefix) => `${prefix}_${nanoid(16)}`;

// ========== 1. CREATE FIREBASE AUTH USERS ==========
console.log("\n--- Creating Firebase Auth Users ---");

const users = [
  { email: "admin@hireflow.demo", password: "Admin123!", name: "Alex Morgan", role: "admin" },
  { email: "recruiter@hireflow.demo", password: "Recruiter123!", name: "Jordan Lee", role: "recruiter" },
  { email: "manager@hireflow.demo", password: "Manager123!", name: "Sam Taylor", role: "hiring_manager" },
];

const authUsers = [];
for (const u of users) {
  try {
    // Delete if exists
    try { const existing = await auth.getUserByEmail(u.email); await auth.deleteUser(existing.uid); } catch {}
    const record = await auth.createUser({ email: u.email, password: u.password, displayName: u.name });
    authUsers.push({ ...u, uid: record.uid });
    console.log(`  ✓ ${u.role}: ${u.email} (uid: ${record.uid})`);
  } catch (e) {
    console.error(`  ✗ Failed to create ${u.email}:`, e.message);
  }
}

// ========== 2. CREATE TENANT ==========
console.log("\n--- Creating Tenant ---");

const tenantId = id("tn");
const trialEnd = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

await db.collection("tenants").doc(tenantId).set({
  tenant_id: tenantId, name: "Acme Corp", slug: "acme-corp",
  status: "trial_active", owner_user_id: authUsers[0].uid, plan_code: "growth",
  trial_starts_at: now, trial_ends_at: trialEnd,
  branding: { logo_url: "", primary_color: "#09090b" },
  career_page: { enabled: true, intro: "Join Acme Corp — building the future of work.", show_departments: true, show_locations: true },
  feature_overrides: {}, created_at: now, updated_at: now,
});
console.log(`  ✓ Tenant: Acme Corp (${tenantId})`);

// ========== 3. CREATE USER DOCS + MEMBERSHIPS ==========
console.log("\n--- Creating Users & Memberships ---");

const membershipIds = {};
for (const u of authUsers) {
  const membershipId = id("mb");
  membershipIds[u.role] = membershipId;

  await db.collection("users").doc(u.uid).set({
    user_id: u.uid, name: u.name, email: u.email, photo_url: "", created_at: now, updated_at: now,
  });

  await db.collection("memberships").doc(membershipId).set({
    membership_id: membershipId, tenant_id: tenantId, user_id: u.uid, role: u.role,
    status: "active", permissions_override: {}, assigned_job_ids: [],
    invited_by_membership_id: null, created_at: now, updated_at: now,
  });

  console.log(`  ✓ ${u.role}: ${u.name} (membership: ${membershipId})`);
}

// ========== 4. CREATE SUBSCRIPTION ==========
await db.collection("subscriptions").doc(tenantId).set({
  tenant_id: tenantId, plan_code: "growth", billing_state: "trial", status: "active",
  renewal_interval: "monthly", current_period_start: now, current_period_end: trialEnd,
  cancel_at_period_end: false, created_at: now, updated_at: now,
});

// ========== 5. CREATE PIPELINE TEMPLATE ==========
console.log("\n--- Creating Pipeline Template ---");

const templateId = id("pt");
const stages = [
  { stage_id: "applied", name: "Applied", order: 0 },
  { stage_id: "screening", name: "Screening", order: 1 },
  { stage_id: "interview", name: "Interview", order: 2 },
  { stage_id: "offer", name: "Offer", order: 3 },
  { stage_id: "hired", name: "Hired", order: 4 },
];

await db.collection("pipeline_templates").doc(templateId).set({
  template_id: templateId, tenant_id: tenantId, name: "Default Pipeline",
  stages, created_at: now, updated_at: now,
});
console.log(`  ✓ Pipeline: Default (${templateId})`);

// ========== 6. CREATE JOBS ==========
console.log("\n--- Creating Jobs ---");

const mockJobs = [
  { title: "Senior Frontend Engineer", dept: "Engineering", loc: "Remote", type: "full_time", salary: { min: 140000, max: 180000, currency: "USD" },
    desc: "<p>We're looking for a senior frontend engineer to lead our React/Next.js stack. You'll architect new features, mentor junior developers, and drive performance improvements across our hiring platform.</p>",
    reqs: "5+ years React experience\nTypeScript proficiency\nNext.js expertise\nTailwind CSS\nState management (Zustand/Redux)\nTesting (Jest, Cypress)" },
  { title: "Product Designer", dept: "Design", loc: "New York, NY", type: "full_time", salary: { min: 120000, max: 160000, currency: "USD" },
    desc: "<p>Join our design team to create beautiful, intuitive interfaces. Work closely with engineering and product to ship delightful experiences that HR professionals love.</p>",
    reqs: "4+ years product design\nFigma expertise\nDesign systems experience\nUser research skills\nPrototyping\nAccessibility knowledge" },
  { title: "Backend Engineer", dept: "Engineering", loc: "San Francisco, CA", type: "full_time", salary: { min: 150000, max: 200000, currency: "USD" },
    desc: "<p>Build scalable APIs and services powering our hiring platform. Work with Node.js, Firebase, and cloud infrastructure to handle millions of hiring events.</p>",
    reqs: "5+ years backend development\nNode.js/TypeScript\nFirebase or cloud databases\nREST/GraphQL API design\nDocker/Kubernetes" },
  { title: "Marketing Intern", dept: "Marketing", loc: "Remote", type: "intern",
    desc: "<p>Help us grow our brand presence and create content that resonates with HR professionals and startup founders. Great opportunity to learn growth marketing.</p>",
    reqs: "Currently enrolled in university\nStrong writing skills\nSocial media knowledge\nCreative thinking" },
  { title: "DevOps Engineer", dept: "Engineering", loc: "Remote", type: "contract", salary: { min: 160000, max: 200000, currency: "USD" },
    desc: "<p>Design and maintain our cloud infrastructure, CI/CD pipelines, and monitoring systems. Ensure 99.9% uptime for our SaaS platform.</p>",
    reqs: "4+ years DevOps\nAWS/GCP\nTerraform\nDocker/Kubernetes\nCI/CD (GitHub Actions)\nMonitoring (Datadog)" },
];

const jobIds = [];
for (const job of mockJobs) {
  const jobId = id("job");
  const pipelineId = id("pl");
  const publicId = nanoid(12);
  jobIds.push(jobId);

  await db.collection("job_pipelines").doc(pipelineId).set({
    pipeline_id: pipelineId, tenant_id: tenantId, job_id: jobId,
    name: "Default Pipeline", stages, created_at: now, updated_at: now,
  });

  await db.collection("jobs").doc(jobId).set({
    job_id: jobId, tenant_id: tenantId, public_id: publicId,
    title: job.title, department: job.dept, location: job.loc,
    employment_type: job.type, salary_range: job.salary || null,
    description_html: job.desc, requirements_text: job.reqs,
    visibility: "public", status: "open",
    pipeline_template_id: templateId, pipeline_id: pipelineId,
    recruiter_owner_membership_id: membershipIds.recruiter || membershipIds.admin,
    hiring_manager_membership_ids: [membershipIds.hiring_manager],
    published_at: now, created_by_membership_id: membershipIds.admin,
    created_at: now, updated_at: now,
  });

  console.log(`  ✓ Job: ${job.title} (${jobId})`);
}

// ========== 7. CREATE CANDIDATES & APPLICATIONS ==========
console.log("\n--- Creating Candidates & Applications ---");

const candidates = [
  { name: "Sarah Chen", email: "sarah.chen@email.com", phone: "+1-555-0101", skills: ["React", "TypeScript", "Next.js", "Tailwind", "Jest"], years: 6 },
  { name: "Marcus Johnson", email: "marcus.j@email.com", phone: "+1-555-0102", skills: ["React", "Vue", "JavaScript", "CSS", "Webpack"], years: 4 },
  { name: "Emily Rodriguez", email: "emily.r@email.com", phone: "+1-555-0103", skills: ["Figma", "Sketch", "User Research", "Prototyping", "Design Systems"], years: 5 },
  { name: "Alex Kim", email: "alex.kim@email.com", phone: "+1-555-0104", skills: ["Node.js", "Python", "AWS", "Docker", "PostgreSQL", "Redis"], years: 7 },
  { name: "Priya Patel", email: "priya.p@email.com", phone: "+1-555-0105", skills: ["React", "Angular", "TypeScript", "GraphQL", "Testing"], years: 3 },
  { name: "James O'Brien", email: "james.ob@email.com", phone: "+1-555-0106", skills: ["Terraform", "Kubernetes", "AWS", "CI/CD", "Linux", "Monitoring"], years: 5 },
  { name: "Lisa Wang", email: "lisa.wang@email.com", phone: "+1-555-0107", skills: ["React", "Next.js", "TypeScript", "Performance", "A11y"], years: 8 },
  { name: "David Nakamura", email: "david.n@email.com", phone: "+1-555-0108", skills: ["Figma", "Design Systems", "CSS", "Animation", "Branding"], years: 6 },
  { name: "Fatima Hassan", email: "fatima.h@email.com", phone: "+1-555-0109", skills: ["Node.js", "Firebase", "MongoDB", "REST APIs", "Express"], years: 4 },
  { name: "Ryan Cooper", email: "ryan.c@email.com", phone: "+1-555-0110", skills: ["Content Writing", "Social Media", "SEO", "Analytics", "Canva"], years: 1 },
  { name: "Aisha Mohammed", email: "aisha.m@email.com", phone: "+1-555-0111", skills: ["React", "TypeScript", "Zustand", "Cypress", "Storybook"], years: 5 },
  { name: "Tom Wilson", email: "tom.w@email.com", phone: "+1-555-0112", skills: ["AWS", "GCP", "Docker", "Monitoring", "Python", "Bash"], years: 6 },
  { name: "Nina Petrova", email: "nina.p@email.com", phone: "+1-555-0113", skills: ["React", "Vue", "TypeScript", "Node.js", "SQL"], years: 4 },
  { name: "Carlos Mendez", email: "carlos.m@email.com", phone: "+1-555-0114", skills: ["Java", "Spring", "Kubernetes", "Microservices", "AWS"], years: 8 },
  { name: "Hana Takashi", email: "hana.t@email.com", phone: "+1-555-0115", skills: ["UX Research", "Figma", "Prototyping", "Accessibility"], years: 3 },
];

const assignments = [
  // Senior Frontend - 5 applicants at various stages
  { ci: 0, ji: 0, stage: "offer", score: 92 },
  { ci: 1, ji: 0, stage: "interview", score: 74 },
  { ci: 4, ji: 0, stage: "screening", score: 68 },
  { ci: 6, ji: 0, stage: "interview", score: 88 },
  { ci: 10, ji: 0, stage: "applied", score: 78 },
  // Product Designer - 3 applicants
  { ci: 2, ji: 1, stage: "interview", score: 85 },
  { ci: 7, ji: 1, stage: "screening", score: 76 },
  { ci: 14, ji: 1, stage: "applied", score: 62 },
  // Backend Engineer - 3 applicants
  { ci: 3, ji: 2, stage: "offer", score: 90 },
  { ci: 8, ji: 2, stage: "interview", score: 72 },
  { ci: 13, ji: 2, stage: "applied", score: 58 },
  // Marketing Intern - 1 applicant
  { ci: 9, ji: 3, stage: "applied", score: 45 },
  // DevOps - 3 applicants
  { ci: 5, ji: 4, stage: "interview", score: 84 },
  { ci: 11, ji: 4, stage: "screening", score: 70 },
  { ci: 12, ji: 4, stage: "applied", score: 55 },
];

for (const a of assignments) {
  const c = candidates[a.ci];
  const candidateId = id("cand");
  const applicationId = id("app");
  const processingId = id("proc");
  const stageObj = stages.find(s => s.stage_id === a.stage);

  await db.collection("candidates").doc(candidateId).set({
    candidate_id: candidateId, tenant_id: tenantId, name: c.name, email: c.email, phone: c.phone,
    linkedin_url: "", dedupe_keys: { email_lower: c.email.toLowerCase(), phone_normalized: c.phone.replace(/\D/g, "") },
    master_profile: { skills: c.skills, years_experience: c.years }, created_at: now, updated_at: now,
  });

  await db.collection("applications").doc(applicationId).set({
    application_id: applicationId, tenant_id: tenantId, candidate_id: candidateId,
    candidate_name: c.name, candidate_email: c.email, job_id: jobIds[a.ji],
    job_title: mockJobs[a.ji].title, source_type: "careers_page", source_ref: "",
    current_stage_id: stageObj.stage_id, current_stage_name: stageObj.name,
    status: "active", score_total: a.score, score_status: "processed", parse_status: "processed",
    recruiter_owner_membership_id: membershipIds.recruiter || membershipIds.admin,
    hiring_manager_membership_ids: [membershipIds.hiring_manager],
    manual_review_required: a.score < 60, last_activity_at: now, created_at: now, updated_at: now,
  });

  const quality = a.score >= 80 ? "strong" : a.score >= 60 ? "moderate" : "limited";
  await db.collection("application_processing").doc(processingId).set({
    processing_id: processingId, tenant_id: tenantId, application_id: applicationId,
    parse_status: "processed", parse_confidence: a.score > 70 ? 0.92 : 0.65,
    manual_review_required: a.score < 60, parse_error_code: null, parse_error_message: null,
    rule_score: {
      skills: Math.round(a.score * 0.4), experience: Math.round(a.score * 0.25),
      keywords: Math.round(a.score * 0.2), education: Math.round(a.score * 0.1),
      bonus: Math.round(a.score * 0.05), total: a.score,
    },
    ai_summary: `${c.name} demonstrates ${quality} alignment with the ${mockJobs[a.ji].title} position. Their ${c.skills.slice(0, 3).join(", ")} expertise is ${a.score >= 70 ? "well-suited" : "partially relevant"} for this role.`,
    strengths: c.skills.slice(0, 3).map(s => `Strong proficiency in ${s}`),
    gaps: a.score < 80 ? ["May need ramp-up time in specific domain areas"] : [],
    raw_extracted_text: "", structured_data: {
      name: c.name, email: c.email, phone: c.phone, skills: c.skills,
      experience: [{ company: "Previous Co", title: "Engineer", duration_text: `${c.years} years` }],
      education: [{ degree: "B.S. Computer Science", institution: "University", year: 2020 }],
    },
    reprocess_count: 0, created_at: now, updated_at: now,
  });

  console.log(`  ✓ ${c.name} → ${mockJobs[a.ji].title} (${stageObj.name}, score: ${a.score})`);
}

// ========== 8. CREATE DEFAULT WORKFLOW RULES ==========
console.log("\n--- Creating Workflow Rules ---");

const rules = [
  { name: "Notify on new application", trigger: "application.created", conditions: [], actions: [{ type: "create_notification", params: { target: "recruiter_owner", type: "application_received" } }], plan: "starter", priority: 10 },
  { name: "Notify when score ready", trigger: "application.processing_completed", conditions: [], actions: [{ type: "create_notification", params: { target: "recruiter_owner", type: "score_ready" } }], plan: "starter", priority: 10 },
  { name: "Auto-shortlist 80+ scores", trigger: "application.processing_completed", conditions: [{ path: "score_total", op: ">=", value: 80 }], actions: [{ type: "move_stage", params: { stage_id: "screening" } }], plan: "growth", priority: 20 },
  { name: "Create onboarding on offer accepted", trigger: "offer.accepted", conditions: [], actions: [{ type: "create_onboarding_plan", params: { template: "default" } }], plan: "starter", priority: 10 },
];

for (const r of rules) {
  const ruleId = id("rl");
  await db.collection("workflow_rules").doc(ruleId).set({
    rule_id: ruleId, tenant_id: tenantId, name: r.name, enabled: true,
    priority: r.priority, trigger: r.trigger, conditions: r.conditions,
    actions: r.actions, plan_required: r.plan, created_at: now, updated_at: now,
  });
  console.log(`  ✓ Rule: ${r.name}`);
}

// ========== DONE ==========
console.log("\n========================================");
console.log("  SEED COMPLETE!");
console.log("========================================");
console.log("\n  Login credentials:");
console.log("  ─────────────────");
console.log("  Admin:          admin@hireflow.demo / Admin123!");
console.log("  Recruiter:      recruiter@hireflow.demo / Recruiter123!");
console.log("  Hiring Manager: manager@hireflow.demo / Manager123!");
console.log(`\n  Tenant ID: ${tenantId}`);
console.log(`  Data: 5 jobs, 15 candidates, ${assignments.length} applications`);
console.log("========================================\n");

process.exit(0);
