import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, companyName, jobDescription, jobRole }) => {
    const tones = ["Boldly Innovative", "Classically Sophisticated", "Data-Driven Strategic", "Human-Centric"];
    const selectedTone = tones[Math.floor(Math.random() * tones.length)];

    return `Role: ${jobRole} at ${companyName || 'the company'}. Tone: ${selectedTone}.
JD: ${jobDescription?.substring(0, 600) || 'N/A'}
Resume: ${resumeText.substring(0, 1200)}

Write a compelling cover letter. CRITICAL: Never remove or invent truthful dates, companies, or metrics. Ground all suggestions strictly in evidence found within the resume. Return ONLY JSON:
{
  "coverLetter": "Full 2-3 paragraph cover letter text.",
  "toneAnalysis": "1-sentence tone explanation.",
  "keywordsIncluded": ["skill1", "skill2"]
}`;
  }, async (result, meta) => {
    const userId = req.userId;
    await saveHistory({
      type: 'cover-letter',
      role: meta.jobRole || 'Cover Letter',
      details: `Tailored for ${meta.companyName || 'Target Corp'}`
    }, userId);
  });
});

export default router;
