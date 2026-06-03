import express from 'express';
import { upload } from '../utils/upload.js';
import { handleResumeRequest } from '../utils/aiService.js';
import { saveHistory } from '../utils/historyManager.js';

const router = express.Router();

router.post('/', upload.single('resume'), (req, res) => {
    handleResumeRequest(req, res, ({ resumeText, jobRole }) => {
        return `
        Resume & Role: "${jobRole}" (fallback to resume text if generic).
        Resume Preview: "${resumeText.substring(0, 1000)}"

        TASK: Estimate the market salary range for this candidate based on their experience level implied in the text and the target role of "${jobRole}". Default location: India/US/Global (infer from text or assume Global Remote).

        RETURN JSON STRICTLY:
        {
            "estimation": {
                "salaryRange": { "min": "$Xk", "max": "$Yk", "currency": "USD/INR" },
                "experienceLevel": "Junior/Mid/Senior",
                "locationFactors": { "marketDemand": "High/Med/Low", "location": "Detected Location" },
                "explanation": "Brief explanation of why this range."
            }
        }
        `;
    }, async (result, meta) => {
        const userId = req.userId;
        await saveHistory({
            type: 'salary',
            role: meta.jobRole || 'Salary Check',
            analysis: result
        }, userId);
    });
});

export default router;
