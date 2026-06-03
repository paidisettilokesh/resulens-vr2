import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole, location }) => {
    return `Role: ${jobRole}, Location: ${location || 'Global'}

Provide 2026 job market insights. Return ONLY JSON:
{
  "marketInsights": {
    "demand": "High/Medium/Low",
    "topSkills": ["skill1", "skill2", "skill3"],
    "salaryTrend": "e.g. $90k-$140k",
    "growthDirection": "brief career trajectory"
  },
  "learningPath": {
    "roadmap": [
      { "level": "Beginner", "topic": "...", "why": "brief" },
      { "level": "Intermediate", "topic": "...", "why": "brief" },
      { "level": "Advanced", "topic": "...", "why": "brief" }
    ],
    "prioritySkill": "single most important skill"
  },
  "stats": {
    "remoteRatio": "70",
    "growthForecast": "+15%",
    "topHiringCompanies": ["Co1", "Co2", "Co3"]
  }
}`;
  }, async (result, meta) => {
    const userId = req.userId;
    await saveHistory({
      type: 'market',
      role: meta.jobRole || 'Market Check',
      details: `Analysis for ${meta.location || 'Global Market'}`
    }, userId);
  });
});

export default router;
