import type { StructuredData } from "./processing.types";

const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w+/;
const PHONE_REGEX = /[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}/;

const SECTION_HEADERS = {
  experience: /\b(experience|work history|employment|professional background)\b/i,
  education: /\b(education|academic|degree|university|college)\b/i,
  skills: /\b(skills|technologies|technical skills|competencies|proficiencies)\b/i,
  certifications: /\b(certifications?|licenses?|credentials)\b/i,
  projects: /\b(projects?|portfolio)\b/i,
};

export function extractStructuredData(rawText: string): StructuredData {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  return {
    name: extractName(lines),
    email: extractMatch(rawText, EMAIL_REGEX),
    phone: extractMatch(rawText, PHONE_REGEX),
    skills: extractSkills(rawText),
    experience: extractExperience(rawText),
    education: extractEducation(rawText),
    certifications: extractCertifications(rawText),
    projects: extractProjects(rawText),
  };
}

function extractName(lines: string[]): string {
  for (const line of lines.slice(0, 5)) {
    if (EMAIL_REGEX.test(line) || PHONE_REGEX.test(line) || /https?:\/\//.test(line)) continue;
    if (line.length > 50 || line.length < 2) continue;
    return line;
  }
  return "";
}

function extractMatch(text: string, regex: RegExp): string {
  return text.match(regex)?.[0] ?? "";
}

function extractSkills(text: string): string[] {
  const section = extractSection(text, SECTION_HEADERS.skills);
  if (section) {
    const skills = section.split(/[,;|•·\n]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 50);
    return [...new Set(skills)];
  }

  const commonSkills = [
    "JavaScript","TypeScript","Python","Java","Go","Rust","Ruby","PHP","Swift","Kotlin",
    "React","Angular","Vue","Next.js","Node.js","Express","Django","Flask","Spring",
    "AWS","GCP","Azure","Docker","Kubernetes","Git",
    "SQL","PostgreSQL","MySQL","MongoDB","Redis",
    "HTML","CSS","Tailwind","GraphQL","REST",
    "Machine Learning","TensorFlow","PyTorch",
    "Figma","Agile","Scrum",
  ];

  return commonSkills.filter((skill) => new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

function extractExperience(text: string): StructuredData["experience"] {
  const section = extractSection(text, SECTION_HEADERS.experience);
  if (!section) return [];

  const entries: StructuredData["experience"] = [];
  const lines = section.split("\n").filter((l) => l.trim());
  let current: { company: string; title: string; duration_text: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/\b(19|20)\d{2}\b/.test(trimmed) || /\b(present|current)\b/i.test(trimmed)) {
      if (current) entries.push(current);
      current = { company: "", title: trimmed, duration_text: trimmed };
    } else if (current && !current.company && trimmed.length > 2) {
      current.company = trimmed;
    }
  }
  if (current) entries.push(current);
  return entries.slice(0, 10);
}

function extractEducation(text: string): StructuredData["education"] {
  const section = extractSection(text, SECTION_HEADERS.education);
  if (!section) return [];

  return section
    .split("\n")
    .filter((l) => l.trim().length > 3)
    .filter((l) => /\b(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|Bachelor|Master|MBA|Associate|Diploma)\b/i.test(l) || /\b(19|20)\d{2}\b/.test(l))
    .map((l) => ({
      degree: l.trim(),
      institution: "",
      year: parseInt(l.match(/\b(19|20)\d{2}\b/)?.[0] ?? "0") || undefined,
    }))
    .slice(0, 5);
}

function extractCertifications(text: string): string[] {
  const section = extractSection(text, SECTION_HEADERS.certifications);
  if (!section) return [];
  return section.split("\n").map((l) => l.trim()).filter((l) => l.length > 2 && l.length < 100).slice(0, 10);
}

function extractProjects(text: string): Array<{ name: string; description: string }> {
  const section = extractSection(text, SECTION_HEADERS.projects);
  if (!section) return [];

  const lines = section.split("\n").filter((l) => l.trim());
  const projects: Array<{ name: string; description: string }> = [];
  for (let i = 0; i < lines.length; i += 2) {
    projects.push({ name: lines[i].trim(), description: lines[i + 1]?.trim() ?? "" });
  }
  return projects.slice(0, 5);
}

function extractSection(text: string, headerRegex: RegExp): string | null {
  const lines = text.split("\n");
  let startIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (headerRegex.test(lines[i])) { startIdx = i + 1; break; }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  const allHeaders = Object.values(SECTION_HEADERS);
  for (let i = startIdx; i < lines.length; i++) {
    if (allHeaders.some((h) => h !== headerRegex && h.test(lines[i]))) { endIdx = i; break; }
  }

  return lines.slice(startIdx, endIdx).join("\n");
}

export function evaluateConfidence(structured: StructuredData, rawText: string): number {
  let signals = 0;
  if (structured.email) signals++;
  if (structured.phone) signals++;
  if (structured.experience.length > 0) signals++;
  if (structured.skills.length >= 3) signals++;
  if (structured.education.length > 0) signals++;
  if (rawText.length > 200) signals++;
  return signals / 6;
}
