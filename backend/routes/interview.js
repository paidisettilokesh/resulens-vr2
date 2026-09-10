import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

// 1. GENERATE QUESTIONS (JD-CENTRIC)
router.post("/generate", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole, jobDescription }) => {
    return `Role: ${jobRole}
JD: ${jobDescription?.substring(0, 3000) || jobRole}
Resume: ${resumeText.substring(0, 7000)}

Generate 15 interview questions (5 each: Technical, Behavioral, Scenario). Return ONLY JSON:
{
  "sections": [
    { "type": "Technical Round", "questions": [{ "id": 1, "question": "...", "criteria": "brief", "difficulty": "Hard" }] },
    { "type": "Behavioral Round", "questions": [{ "id": 6, "question": "...", "criteria": "brief", "difficulty": "Medium" }] },
    { "type": "Scenario Round", "questions": [{ "id": 11, "question": "...", "criteria": "brief", "difficulty": "Hard" }] }
  ]
}`;
  }, async (result, meta) => {
    const userId = req.userId;
    await saveHistory({
      type: 'interview',
      role: meta.jobRole || 'Interview Prep',
      details: `Generated 15 diagnostic questions`
    }, userId);
  });
});

// 2. EVALUATE ANSWER
router.post("/evaluate", (req, res) => {
  const { question, answer, jobRole, criteria, difficulty } = req.body;
  if (!question || typeof answer !== "string") {
    return res.status(400).json({ error: "Context missing" });
  }

  const trimmedAnswer = answer.trim();

  // Fast-path: detect empty, ultra-short, or ignorance responses ("I don't know", "no idea", "pass", "skip", "idk")
  const ignorancePatterns = [
    /^(i\s+)?(don'?t|do\s+not)\s+know/i,
    /^no\s+idea/i,
    /^(i\s+have\s+)?no\s+clue/i,
    /^(i('?m|\s+am)\s+)?not\s+sure/i,
    /^(skip|pass|idk|na|n\/a|none)$/i,
    /^[?.!,\s]+$/i
  ];

  const isIgnorance = ignorancePatterns.some(pattern => pattern.test(trimmedAnswer));
  const isTooShort = trimmedAnswer.length < 5;

  if (isIgnorance || isTooShort) {
    return res.json({
      score: 0,
      verdict: "Needs Improvement",
      feedback: isTooShort && !isIgnorance
        ? "The response is too brief to demonstrate technical competency or reasoning."
        : "You stated that you don't know the answer. In an interview, even when uncertain, explain relevant fundamental principles or your approach to finding a solution.",
      missingKeywords: criteria ? [criteria] : ["Technical Core Concepts", "STAR Method"],
      improvementAreas: [
        "Address the specific technical concepts outlined in the question",
        "Structure responses using the STAR method (Situation, Task, Action, Result)",
        "Demonstrate problem-solving methodologies even when unfamiliar with exact syntax"
      ],
      starCheck: {
        situation: "Not provided",
        task: "Not provided",
        action: "Not provided",
        result: "Not provided"
      },
      improvedVersion: `When faced with this scenario, a strong candidate explains: ${criteria || "the core architectural concepts, key trade-offs, and concrete technical solutions based on real experience."}`
    });
  }

  handleResumeRequest(req, res, () => {
    return `Role: ${jobRole || "Candidate"}.
Evaluate this candidate's interview response with high professional rigor.

Question: "${question}"
Target Criteria: "${criteria || "Technical depth, practical experience, problem-solving reasoning"}"
Difficulty: "${difficulty || "Medium"}"
Candidate Answer: "${trimmedAnswer.substring(0, 1000)}"

STRICT EVALUATION RUBRIC:
- 0–15 (Wrong / Irrelevant / Gibberish): The answer is factually incorrect, makes false technical claims, discusses unrelated topics, or is nonsense. Score MUST be between 0 and 15 (Verdict: "Needs Improvement"). NEVER award points for generic filler or writing long irrelevant sentences.
- 16–45 (Severely Deficient / Incomplete): The answer demonstrates severe misunderstandings or fails to address core technical mechanisms. (Verdict: "Needs Improvement").
- 46–69 (Partially Correct): The answer shows basic conceptual familiarity but misses key nuances, lacks depth, or is missing practical execution details. (Verdict: "Satisfactory").
- 70–84 (Competent / Solid): The answer is technically accurate and directly addresses the question with sound reasoning. (Verdict: "Satisfactory" or "Strong").
- 85–100 (Exemplary / Strong): The answer is exceptionally thorough, precise, well-structured (STAR format where relevant), mentions trade-offs, and provides concrete measurable impact. (Verdict: "Strong").

CRITICAL RULES:
1. Do NOT award arbitrary points for polite phrases or length.
2. If the candidate gives an incorrect or irrelevant explanation, the score MUST be 0-15.
3. Provide constructive, non-generic feedback specifically referencing the concepts in the question.

Return ONLY valid JSON matching this exact structure:
{
  "score": 75,
  "verdict": "Strong/Satisfactory/Needs Improvement",
  "feedback": "2-sentence precise evaluation of what was correct and what was missing.",
  "missingKeywords": ["keyword1", "keyword2"],
  "improvementAreas": ["Specific area to improve"],
  "starCheck": { "situation": "brief", "task": "brief", "action": "brief", "result": "brief" },
  "improvedVersion": "2-sentence model response demonstrating the ideal answer."
}`;
  });
});

export default router;
