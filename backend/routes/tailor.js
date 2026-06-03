import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobDescription }) => {
    return `JD: ${jobDescription?.substring(0, 800)}
Resume: ${resumeText.substring(0, 1500)}

Match resume to JD. Return ONLY JSON:
{
  "matchScore": 75,
  "keywordAnalysis": [{ "keyword": "React", "resumeDensity": 80, "jdImportance": "High" }],
  "missingSkills": ["skill1", "skill2"],
  "skillRelevance": { "technical": 75, "domain": 60, "soft": 90 },
  "suggestedEdits": [{ "context": "experience section", "suggestion": "brief edit suggestion" }],
  "recruiterGapAnalysis": "1-sentence gap summary."
}`;
  }, async (result, meta) => {
    const userId = req.userId;
    await saveHistory({
      type: 'tailor',
      role: meta.jobDescription?.substring(0, 50) || 'Job Match',
      analysis: result
    }, userId);
  });
});

export default router;
