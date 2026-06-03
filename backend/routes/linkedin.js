import express from 'express';
import { upload } from '../utils/upload.js';
import { handleResumeRequest } from '../utils/aiService.js';
import { saveHistory } from '../utils/historyManager.js';

const router = express.Router();

router.post('/', upload.single('resume'), (req, res) => {
    handleResumeRequest(req, res, ({ resumeText }) => {
        return `Resume: ${resumeText.substring(0, 1200)}

Optimize for LinkedIn. Return ONLY JSON:
{
  "headline": "punchy value-driven headline (max 220 chars)",
  "about": "1st-person About section (3-4 sentences, builds authority)",
  "experience": [{ "company": "company name", "rewritten": "impact-focused summary" }],
  "skillsToPin": ["skill1", "skill2", "skill3"],
  "bannerConcept": "brief banner image concept"
}`;
    }, async (result, meta) => {
        const userId = req.userId;
        await saveHistory({
            type: 'linkedin',
            role: meta.jobRole || 'LinkedIn Profile',
            details: 'Profile optimization generated'
        }, userId);
    });
});

export default router;
