import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole }) => {
    return `Resume: ${resumeText.substring(0, 1200)}
Role: ${jobRole}

Identify 5 missing/weak skills for this role. Return ONLY JSON:
{
  "roadmap": [
    {
      "skill": "skill name",
      "priority": "High",
      "learningSource": "Platform",
      "sourceUrl": "https://...",
      "milestones": ["Phase 1", "Phase 2", "Phase 3"],
      "topics": ["topic1", "topic2"],
      "estimatedTime": "4 Weeks",
      "projectIdea": "brief project idea"
    }
  ],
  "overallGaps": "1-sentence gap summary."
}`;
  }, async (result, meta) => {
    const userId = req.userId;
    await saveHistory({
      type: 'skills',
      role: meta.jobRole,
      details: `Gap Analysis: ${result.roadmap?.length || 0} gaps found`
    }, userId);
  });
});

export default router;
