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
{ "optimized": "The formal, executive-grade rewritten bullet points..." }`;
    });
});

export default router;
