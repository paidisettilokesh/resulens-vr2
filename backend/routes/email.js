import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole, candidateName, companyName }) => {
    return `Generate 3 high-conversion cold email templates for networking.
        Role: ${jobRole}
        Candidate: ${candidateName}
        Target Company: ${companyName || 'Target Company'}
        Resume Context: ${resumeText.substring(0, 2000)}

        Return JSON:
        {
          "templates": [
            { "type": "Recruiter Direct", "subject": "...", "body": "..." },
            { "type": "Employee Referral Request", "subject": "...", "body": "..." },
            { "type": "Informational Interview", "subject": "...", "body": "..." }
          ]
        }`;
  }, async (result, meta) => {
    const userId = req.userId;
    await saveHistory({
      type: 'email',
      role: meta.jobRole || 'Cold Email',
      details: `Generated templates for ${meta.companyName || 'Target Company'}`
    }, userId);
  });
});

export default router;
