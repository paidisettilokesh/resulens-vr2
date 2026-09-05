import express from "express";
import { upload } from "../utils/upload.js";
import { handleResumeRequest } from "../utils/aiService.js";
import { saveHistory } from "../utils/historyManager.js";

const router = express.Router();

router.post("/", upload.single("resume"), (req, res) => {
   handleResumeRequest(req, res, ({ resumeText, jobRole, jobDescription, companyName, location }) => {
      const cleanResume = (resumeText || "").slice(0, 14000);
      const roleContext = jobRole || req.body.jobRole || "Professional";
      const jdContext = (jobDescription || req.body.jobDescription || "").trim();
      const compContext = (companyName || req.body.companyName || "").trim();
      const locContext = (location || req.body.location || "Global").trim();

      return `Resume Content:
"""
${cleanResume}
"""

Target Role: "${roleContext}"${compContext ? ` at "${compContext}"` : ''} (Location: ${locContext})
${jdContext ? `Target Job Description / Requirements:\n"""\n${jdContext.slice(0, 4000)}\n"""\n` : ''}
INSTRUCTIONS:
Carefully analyze the resume against the target role and requirements.
Evaluate strictly on actual evidence present in the resume. Do NOT hallucinate skills or qualifications not mentioned.
- Set booleans to true ONLY if explicitly supported by the resume text.
- Estimate realistic "yearsOfExperience" (e.g. 0 for freshers/students, exact years based on employment dates).
- Objectively identify matched vs missing skills for this target role.
- Calculate realistic scores (0-100) reflecting this specific candidate's strengths and weaknesses.

Return ONLY this JSON (no markdown formatting, no code fences, no extra text):
{
  "candidateName": "Full name identified from resume or 'Candidate'",
  "location": "City, Country or 'N/A'",
  "extractedFeatures": {
    "education": {
      "hasDegree": false,
      "degreeRelevance": "High/Medium/Low/None",
      "hasGPA": false,
      "hasCoursework": false,
      "hasCertifications": false
    },
    "experience": {
      "yearsOfExperience": 0,
      "hasInternships": false,
      "hasFreelanceOrOSS": false,
      "hasLeadership": false,
      "hasProjects": false,
      "hasQuantifiedAchievements": false
    },
    "formatting": {
      "hasContactInfo": false,
      "hasSummary": false,
      "usesActionVerbs": false,
      "goodGrammarAndReadability": false,
      "clearSectionStructure": false
    },
    "keywordScore": 50
  },
  "jobMatchScore": 50,
  "recruiterInterest": 50,
  "verdict": "Strong Match/Moderate Match/Needs Improvement",
  "summary": "2-sentence executive summary grounded in the candidate's actual background",
  "atsAnalysis": {
    "reasoning": { 
      "keywordRelevance": "Specific evaluation of keyword density and alignment for this role", 
      "formattingCompatibility": "Specific evaluation of headings, fonts, contact details and parsability", 
      "sectionClarity": "Specific evaluation of section structure and layout", 
      "measurableImpact": "Specific evaluation of quantified achievements, metrics and data points" 
    },
    "resumeStructure": "Professional/Standard/Fragmented",
    "issues": ["Specific concrete issue 1", "Specific concrete issue 2"],
    "suggestions": [
      "Specific suggestion 1 referencing the actual content from the resume",
      "Specific suggestion 2 referencing the actual content from the resume"
    ]
  },
  "competencyMatrix": [
    { "skill": "Skill Name", "level": 7, "benchmark": "Senior/Mid/Junior", "category": "Technical/Soft", "gap": "Specific gap description" }
  ],
  "jobMatchAnalysis": {
    "skillMatch": { 
      "matched": ["Skill1", "Skill2"], 
      "missing": ["MissingSkill1", "MissingSkill2"] 
    },
    "experienceAlignment": "Specific alignment description for this role",
    "experienceQuality": "Specific quality description based on their past projects/tenure",
    "recruiterVerdict": "Strong/Moderate/Needs Improvement - specific hiring reasoning"
  },
  "mobileAnalysis": {
    "superpowers": ["Key strength: evidence from resume"],
    "demerits": ["Key gap: evidence from resume"]
  },
  "recommendedCourses": [
    { "title": "Course Title", "platform": "Coursera/Udemy/edX", "milestones": ["milestone 1"], "timeEstimate": "3-4 weeks" }
  ],
  "roadmap": [
    { "priority": "High/Medium/Low", "text": "Actionable task", "boost": "+5%", "reason": "Why this improves ATS/Recruiter outcome" }
  ],
  "badges": ["Relevant Badge 1", "Relevant Badge 2"],
  "careerCoach": [
    { "priority": "High/Medium", "text": "Actionable career advice for this candidate" }
  ],
  "personalizedMotivation": "A personalized motivational encouragement for their specific career path."
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
