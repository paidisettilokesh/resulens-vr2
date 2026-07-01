import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole }) => {
    return `Resume: ${resumeText.substring(0, 1200)}
Role: ${jobRole}

Give an honest recruiter critique. CRITICAL: Never remove or invent truthful dates, companies, or metrics. Ground all suggestions strictly in evidence found within the resume. Return ONLY JSON:
{
  "weaknesses": [
    "Weakness 1 (Must directly quote or reference specific flawed phrases from the resume)",
    "Weakness 2 (Must directly quote or reference specific flawed phrases from the resume)"
  ],
  "rejectionRisks": [
    "Risk 1 (Must cite resume content)",
    "Risk 2 (Must cite resume content)"
  ],
  "priorityFixes": ["fix1", "fix2"],
  "brutalTruth": "1-line sharp assessment.",
  "roastScore": 50
}`;
  }, async (result, meta) => {
    // Save to history? Maybe not needed for a roast, or as a fun item.
    // Let's save it.
    const userId = req.userId;
    await saveHistory({
      type: 'roast',
      role: meta.jobRole,
      candidateName: 'Audit Report',
      atsScore: 0,
      matchScore: result.roastScore || result.burnScore || 45
    }, userId);
  });
});

export default router;
