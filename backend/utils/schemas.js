import { z } from 'zod';

export const analyzeSchema = z.object({
    candidateName: z.string().optional(),
    location: z.string().optional(),
    atsScore: z.number().optional(),
    score: z.number().optional(), // Fallback
    jobMatchScore: z.number().optional(),
    matchScore: z.number().optional(), // Fallback
    recruiterInterest: z.number().optional(),
    educationScore: z.number().optional(),
    experienceScore: z.number().optional(),
    skillsMatch: z.number().optional(),
    atsScoreBreakdown: z.object({
        skillsMatch: z.number().optional(),
        keywordMatch: z.number().optional(),
        experienceMatch: z.number().optional(),
        educationMatch: z.number().optional(),
        formattingMatch: z.number().optional(),
        total: z.number().optional()
    }).nullable().optional(),
    summary: z.string().optional(),
    competencyMatrix: z.array(z.object({
        skill: z.string().optional(),
        level: z.number().optional(),
        benchmark: z.string().optional(),
        category: z.string().optional(),
        gap: z.string().optional()
    })).optional(),
    atsAnalysis: z.object({
        reasoning: z.object({
            keywordRelevance: z.string().optional(),
            formattingCompatibility: z.string().optional(),
            sectionClarity: z.string().optional(),
            measurableImpact: z.string().optional()
        }).optional(),
        resumeStructure: z.string().optional(),
        suggestions: z.array(z.string()).optional(),
        issues: z.array(z.string()).optional()
    }).optional(),
    jobMatchAnalysis: z.object({
        skillMatch: z.object({
            matched: z.array(z.string()).optional(),
            missing: z.array(z.string()).optional()
        }).optional(),
        experienceAlignment: z.string().optional(),
        experienceQuality: z.string().optional(),
        recruiterVerdict: z.string().optional()
    }).optional(),
    mobileAnalysis: z.object({
        superpowers: z.array(z.string()).optional(),
        demerits: z.array(z.string()).optional()
    }).optional(),
    strengths: z.array(z.string()).optional(), // Fallback
    weaknesses: z.array(z.string()).optional(), // Fallback
    recommendedCourses: z.array(z.object({
        title: z.string().optional(),
        platform: z.string().optional(),
        milestones: z.array(z.string()).optional(),
        timeEstimate: z.string().optional()
    })).optional(),
    extractedFeatures: z.object({
        education: z.object({
            hasDegree: z.boolean().optional(),
            degreeRelevance: z.string().optional(),
            hasGPA: z.boolean().optional(),
            hasCoursework: z.boolean().optional(),
            hasCertifications: z.boolean().optional()
        }).optional(),
        experience: z.object({
            yearsOfExperience: z.number().optional(),
            hasInternships: z.boolean().optional(),
            hasFreelanceOrOSS: z.boolean().optional(),
            hasLeadership: z.boolean().optional(),
            hasProjects: z.boolean().optional(),
            hasQuantifiedAchievements: z.boolean().optional()
        }).optional(),
        formatting: z.object({
            hasContactInfo: z.boolean().optional(),
            hasSummary: z.boolean().optional(),
            usesActionVerbs: z.boolean().optional(),
            goodGrammarAndReadability: z.boolean().optional(),
            clearSectionStructure: z.boolean().optional()
        }).optional()
    }).optional()
}).passthrough();

export const roastSchema = z.object({
    weaknesses: z.array(z.string()).optional(),
    critique: z.string().optional(),
    priorityFixes: z.array(z.string()).optional(),
    rejectionRisks: z.array(z.string()).optional(),
    brutalTruth: z.string().optional(),
    roastScore: z.number().optional(),
    burnScore: z.number().optional()
}).passthrough();

export const optimizeSchema = z.object({
    rewrittenBullets: z.array(z.any()).optional(),
    bullets: z.array(z.string()).optional(),
    skillGapAnalysis: z.array(z.string()).optional(),
    optimizedSkills: z.object({
        core: z.array(z.string()).optional(),
        tools: z.array(z.string()).optional(),
        soft: z.array(z.string()).optional()
    }).optional(),
    atsSummary: z.string().optional(),
    performanceMetrics: z.object({
        before: z.number().optional(),
        after: z.number().optional(),
        delta: z.string().optional()
    }).optional(),
    overallAdvice: z.string().optional()
}).passthrough();

export const fallbackSchema = z.object({}).passthrough();
