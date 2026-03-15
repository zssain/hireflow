export interface AISummaryResult {
  summary: string;
  strengths: string[];
  gaps: string[];
}

export async function generateAISummary(
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[],
  candidateName: string,
  candidateSkills: string[],
  experienceJson: string,
  educationJson: string
): Promise<AISummaryResult> {
  const prompt = `You are an HR screening assistant. Given a candidate's resume data and a job description, provide:

1. A 2-3 sentence summary of how well this candidate fits the role.
2. A list of 3-5 strengths relevant to this role.
3. A list of 1-3 gaps or concerns.

Be factual and concise. Do not make hiring recommendations.
Do not hallucinate skills or experience not present in the data.

Job Title: ${jobTitle}
Job Description: ${jobDescription}
Required Skills: ${requiredSkills.join(", ")}

Candidate Data:
Name: ${candidateName}
Skills: ${candidateSkills.join(", ")}
Experience: ${experienceJson}
Education: ${educationJson}

Respond in this exact JSON format:
{
  "summary": "...",
  "strengths": ["...", "..."],
  "gaps": ["...", "..."]
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content) as AISummaryResult;
  return {
    summary: parsed.summary ?? "",
    strengths: parsed.strengths ?? [],
    gaps: parsed.gaps ?? [],
  };
}
