import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
   handleResumeRequest(req, res, ({ resumeText, jobRole }) => {
      return `Resume: """${resumeText.substring(0, 2000)}"""
Role: "${jobRole}"

ANALYZE this resume vs the target role. Return ONLY this JSON (no preamble, markdown blocks, or extra text):
{
  "candidateName": "Full name from resume",
  "location": "City, Country",
  "atsScore": 75,
  "jobMatchScore": 70,
  "recruiterInterest": 82,
  "educationScore": 85,
  "experienceScore": 70,
  "skillsMatch": 78,
  "resumeCompleteness": 80,
  "formattingScore": 85,
  "verdict": "Strong Candidate/Moderate Candidate/Needs Improvement",
  "summary": "2-sentence professional executive summary",
  "atsAnalysis": {
    "reasoning": { 
      "keywordRelevance": "brief explanation", 
      "formattingCompatibility": "brief explanation", 
      "sectionClarity": "brief explanation", 
      "measurableImpact": "brief explanation" 
    },
    "resumeStructure": "Professional/Standard/Fragmented",
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "atsScoreBreakdown": {
    "educationMatch": 80,
    "educationMatchMax": 100,
    "experienceMatch": 75,
    "experienceMatchMax": 100,
    "skillsMatch": 85,
    "skillsMatchMax": 100,
    "keywordMatch": 70,
    "keywordMatchMax": 100,
    "formattingMatch": 90,
    "formattingMatchMax": 100
  },
  "competencyMatrix": [
    { "skill": "Skill Name", "level": 8, "benchmark": "Senior/Mid/Junior", "category": "Technical/Soft", "gap": "brief gap explanation" }
  ],
  "jobMatchAnalysis": {
    "skillMatch": { 
      "matched": ["React", "JavaScript"], 
      "missing": ["AWS", "Docker"] 
    },
    "experienceAlignment": "brief alignment description",
    "experienceQuality": "brief quality description",
    "recruiterVerdict": "Strong/Moderate/Needs Improvement - brief hiring reasoning"
  },
  "mobileAnalysis": {
    "superpowers": ["Superpower: explanation"],
    "demerits": ["Gap: explanation"]
  },
  "recommendedCourses": [
    { "title": "Course Title", "platform": "Coursera/Udemy/edX", "milestones": ["milestone1"], "timeEstimate": "4w" }
  ],
  "roadmap": [
    { "priority": "High/Medium/Low", "text": "Optimize formatting", "boost": "+10%", "reason": "To increase parser visibility" }
  ],
  "badges": ["Full Stack Developer", "Cloud Certified", "Problem Solver"],
  "careerCoach": [
    { "priority": "High", "text": "Add cloud-related projects to showcase experience with AWS/Docker." }
  ],
  "personalizedMotivation": "A brief AI encouragement statement for their career path."
}`;
   }, async (result, meta) => {
      // Save to history on success
      const userId = req.userId;
      await saveHistory({
         type: 'analysis',
         role: meta.jobRole,
         analysis: result // Save full analysis object
      }, userId);
   });
});

export default router;
