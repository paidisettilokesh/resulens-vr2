import express from "express";
import { handleResumeRequest } from "../utils/aiService.js";

const router = express.Router();

router.post("/suggest-bio", (req, res) => {
    const { name, role, skills, experienceSummary } = req.body;
    handleResumeRequest(req, res, () => {
        return `Suggest a high-end, formal professional summary for a resume. Use an executive and sophisticated tone. 
Candidate Name: ${name}
Target Role: ${role}
Skills: ${skills}
Brief Experience: ${experienceSummary}

Return JSON:
{ "bio": "A compelling, formal 3-4 sentence summary using executive language..." }`;
    });
});

router.post("/optimize-experience", (req, res) => {
    const { role, company, details } = req.body;
    handleResumeRequest(req, res, () => {
        return `Act as an executive resume consultant. Rewrite the following job experience bullet points to be formal, high-impact, and professional. 
Use strong action verbs, emphasize leadership, and quantify results with metrics (%, $, time). 

Role: ${role} at ${company}
Original Points: ${details}

Return JSON:
{ "optimized": "The formal, executive-grade rewritten bullet points separated by newlines..." }`;
    });
});

router.post("/blueprint-generator", (req, res) => {
    const { jobDescription, userSummary } = req.body;
    handleResumeRequest(req, res, () => {
        return `Act as an elite ATS resume architect. Based on the target job description and the user's brief summary, generate a complete resume structure.

Target Job: ${jobDescription}
User Background: ${userSummary}

Return JSON:
{
  "personal": {
    "bio": "A highly targeted, ATS-optimized professional summary."
  },
  "experience": [
    {
      "role": "Suggested Job Title matching JD",
      "company": "Company Name (placeholder)",
      "period": "Start Year - End Year",
      "details": "Bullet points targeted to the JD. (Use quantifiable metrics)"
    }
  ],
  "skills": "List of comma separated core competencies mapped directly from the JD"
}`;
    });
});

router.post("/evaluate-health", (req, res) => {
    const { resumeData } = req.body;
    handleResumeRequest(req, res, () => {
        return `Evaluate the health and ATS compatibility of this resume data.
Data: ${JSON.stringify(resumeData)}

Provide a strict, professional evaluation.

Return JSON:
{
  "atsScore": 85,
  "readabilityScore": 90,
  "keywordScore": 80,
  "completenessScore": 95,
  "feedback": ["Suggestion 1", "Suggestion 2"]
}`;
    });
});

export default router;
