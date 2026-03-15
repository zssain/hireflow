import type { StructuredData, RuleScore } from "./processing.types";

const SKILL_ALIASES: Record<string, string[]> = {
  react: ["reactjs", "react.js"],
  "node.js": ["nodejs", "node"],
  "next.js": ["nextjs", "next"],
  typescript: ["ts"],
  javascript: ["js"],
  python: ["py"],
  postgresql: ["postgres"],
  kubernetes: ["k8s"],
};

function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (lower === canonical || aliases.includes(lower)) return canonical;
  }
  return lower;
}

export function calculateScore(
  structured: StructuredData,
  rawText: string,
  jobRequirements: string,
  jobDescription: string
): RuleScore {
  const skills = scoreSkills(structured.skills, jobRequirements);
  const experience = scoreExperience(structured.experience, jobRequirements);
  const keywords = scoreKeywords(rawText, jobDescription);
  const education = scoreEducation(structured.education, jobRequirements);
  const bonus = scoreBonus(structured, rawText);

  return {
    skills,
    experience,
    keywords,
    education,
    bonus,
    total: skills + experience + keywords + education + bonus,
  };
}

function scoreSkills(candidateSkills: string[], jobRequirements: string): number {
  const requiredSkills = extractSkillsFromText(jobRequirements);
  if (requiredSkills.length === 0) return 20; // No requirements = half score

  const normalizedCandidate = candidateSkills.map(normalizeSkill);
  const normalizedRequired = requiredSkills.map(normalizeSkill);

  const matched = normalizedRequired.filter((req) => normalizedCandidate.includes(req));
  return Math.min(40, Math.round((matched.length / normalizedRequired.length) * 40));
}

function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    "javascript","typescript","python","java","go","rust","ruby","php","swift","kotlin",
    "react","angular","vue","next.js","node.js","express","django","flask","spring",
    "aws","gcp","azure","docker","kubernetes","git",
    "sql","postgresql","mysql","mongodb","redis",
    "html","css","tailwind","graphql","rest",
    "machine learning","tensorflow","pytorch",
    "figma","agile","scrum",
  ];

  const lower = text.toLowerCase();
  return commonSkills.filter((skill) => lower.includes(skill));
}

function scoreExperience(
  experience: StructuredData["experience"],
  jobRequirements: string
): number {
  const totalYears = experience.reduce((sum, exp) => sum + (exp.years ?? 1), 0);
  const requiredYears = extractRequiredYears(jobRequirements);

  if (requiredYears === 0) return 20;

  const diff = totalYears - requiredYears;
  if (diff >= 0) return 25;
  if (diff >= -1) return 20;
  if (diff >= -2) return 15;
  if (diff >= -3) return 10;
  return totalYears > 0 ? 5 : 0;
}

function extractRequiredYears(text: string): number {
  const match = text.match(/(\d+)\+?\s*years?/i);
  if (match) return parseInt(match[1]);

  if (/\bsenior\b/i.test(text)) return 5;
  if (/\blead\b/i.test(text)) return 8;
  if (/\bmid[- ]?level\b/i.test(text)) return 3;
  if (/\bjunior\b/i.test(text)) return 0;

  return 0;
}

function scoreKeywords(rawText: string, jobDescription: string): number {
  const keywords = jobDescription
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .filter((w) => !["about", "their", "would", "should", "could", "which", "where", "there", "these", "those", "being", "other"].includes(w));

  const unique = [...new Set(keywords)];
  if (unique.length === 0) return 10;

  const lower = rawText.toLowerCase();
  const found = unique.filter((kw) => lower.includes(kw));

  return Math.min(20, Math.round((found.length / unique.length) * 20));
}

function scoreEducation(
  education: StructuredData["education"],
  jobRequirements: string
): number {
  const requiresDegree = /\b(degree|bachelor|master|phd|b\.?s\.?|m\.?s\.?)\b/i.test(jobRequirements);

  if (!requiresDegree) return 10;
  if (education.length === 0) return 2;

  const hasMatchingDegree = education.some((e) => {
    const lower = e.degree.toLowerCase();
    return /\b(bachelor|master|phd|mba|b\.?s\.?|m\.?s\.?)\b/i.test(lower);
  });

  return hasMatchingDegree ? 10 : 5;
}

function scoreBonus(structured: StructuredData, rawText: string): number {
  let bonus = 0;

  if (/linkedin\.com/i.test(rawText)) bonus += 1;
  if (/github\.com/i.test(rawText) || /portfolio/i.test(rawText)) bonus += 1;
  if (structured.certifications && structured.certifications.length > 0) bonus += 2;
  // Location bonus skipped for V1 (would need job location context)

  return Math.min(5, bonus);
}
