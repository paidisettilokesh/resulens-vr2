import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

// 1. GENERATE QUESTIONS (JD-CENTRIC)
router.post("/generate", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole, jobDescription }) => {
    return `Role: ${jobRole}
JD: ${jobDescription?.substring(0, 1000) || jobRole}
Resume: ${resumeText.substring(0, 1200)}

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
  const { question, answer, jobRole } = req.body;
  if (!question || !answer) return res.status(400).json({ error: "Context missing" });

  handleResumeRequest(req, res, () => {
    return `Role: ${jobRole}. Evaluate this interview answer.
Q: "${question}"
A: "${answer.substring(0, 800)}"

Return ONLY JSON:
{
  "score": "0-100",
  "verdict": "Strong/Satisfactory/Needs Improvement",
  "feedback": "2-sentence overview",
  "missingKeywords": ["keyword1"],
  "improvementAreas": ["point1"],
  "starCheck": { "situation": "brief", "task": "brief", "action": "brief", "result": "brief" },
  "improvedVersion": "2-sentence ideal answer."
}`;
  });
});

export default router;
