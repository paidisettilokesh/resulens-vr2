import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
  handleResumeRequest(req, res, ({ resumeText, jobRole, jobDescription }) => {
    const jdSection = jobDescription && jobDescription.trim().length > 10
      ? `\nTarget Job Description:\n${jobDescription.substring(0, 1500)}`
      : "";

    return `You are a brutally honest, elite tech recruiter and resume auditor.
Perform a comprehensive, evidence-based diagnostic roast of this candidate's resume.

Candidate Role: ${jobRole || "Professional"}${jdSection}

Resume Content:
${resumeText.substring(0, 6000)}

EVALUATION RULES:
1. Ground all critiques strictly in quoted evidence from the resume. Identify exact flawed phrases, vague descriptions, and missing impact.
2. DO NOT invent false dates, fake companies, or fabricated metrics.
3. If a Job Description is provided above, cross-reference required skills and identify matches and gaps.
4. Categorize scoring into 4 clear 25-point dimensions (Total = 100):
   - Content & Clarity (0-25): Summary, role progression, grammar, clarity, conciseness
   - ATS Readiness & Formatting (0-25): Standard section headers, parseable text, absence of parsing blockers
   - Impact & Measurable Outcomes (0-25): Action verbs, metrics, quantifiable achievements vs passive duties
   - Skills & JD Alignment (0-25): Relevance of technical & soft skills for the target role/JD
   roastScore MUST equal the exact sum of these 4 scores.

Return ONLY valid JSON matching this exact structure:
{
  "breakdown": {
    "contentScore": 18,
    "atsScore": 20,
    "impactScore": 12,
    "skillsScore": 16
  },
  "roastScore": 66,
  "actionableIssues": [
    {
      "problem": "Exact weak quote from resume",
      "location": "Experience: Role Title or Section",
      "whyItMatters": "Clear recruiter explanation of why this weakens candidate perception",
      "howToFix": "Specific action to correct the issue",
      "improvedExample": "Concrete rewritten bullet without inventing false facts",
      "priority": "High"
    }
  ],
  "jdAlignment": {
    "matchingSkills": ["skill1", "skill2"],
    "missingSkills": ["missingSkill1"],
    "alignmentSummary": "2-sentence summary of JD match strength"
  },
  "weaknesses": [
    "Weakness 1 quoting the resume",
    "Weakness 2 quoting the resume"
  ],
  "rejectionRisks": [
    "Key risk that could trigger recruiter rejection"
  ],
  "priorityFixes": [
    "First action to take to immediately boost recruiter callback rate"
  ],
  "brutalTruth": "1-line sharp, memorable recruiter takeaway."
}`;
  }, async (result, meta) => {
    const userId = req.userId;
    await saveHistory({
      type: 'roast',
      role: meta.jobRole || 'Resume Audit',
      candidateName: 'Recruiter Audit Report',
      atsScore: result.breakdown?.atsScore ? Math.round(result.breakdown.atsScore * 4) : 0,
      matchScore: result.roastScore || result.burnScore || 50
    }, userId);
  });
});

export default router;
