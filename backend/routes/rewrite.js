import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js"; // Import history manager

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole }) => {
    return `Resume: ${resumeText.substring(0, 1500)}
Role: ${jobRole}

Rewrite resume for ATS and ${jobRole}. Return ONLY JSON:
{
  "rewrittenBullets": [{ "original": "...", "rewritten": "...", "reasoning": "brief" }],
  "skillGapAnalysis": ["skill1", "skill2"],
  "optimizedSkills": { "core": ["s1"], "tools": ["t1"], "soft": ["soft1"] },
  "atsSummary": "2-sentence ATS-optimized summary.",
  "performanceMetrics": { "before": 45, "after": 90, "delta": "+45%" },
  "overallAdvice": "1-sentence strategic advice."
}`;
  }, async (result, meta) => {
    // Save to history
    const userId = req.userId;
    await saveHistory({
      type: 'rewrite',
      role: meta.jobRole,
      candidateName: 'Rewritten Candidate',
      details: result.atsSummary || (result.rewrittenBullets && result.rewrittenBullets[0]?.rewritten) || 'Resume optimized for ATS performance.'
    }, userId);
  });
});

export default router;
