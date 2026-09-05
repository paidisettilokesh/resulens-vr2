/**
 * ResuLens Unified Scoring Engine
 * 
 * Independently evaluates:
 * 1. ATS Score (Machine Screening / Parsing Compatibility / Keyword Alignment)
 * 2. Intelligence Metrics (Candidate Capability / Skill Depth / Experience Quality / Impact Density)
 * 3. Recruiter Interest (Human Attractiveness / 6-Second Scanability / Seniority Fit / Hiring Signals)
 */

export function calculateDeterministicScores(extractedFeatures = {}, aiData = {}) {
    // ── 1. ATS MACHINE SCREENING METRICS ─────────────────────────────────────────
    let educationScore = 0;
    const edu = extractedFeatures.education || {};
    if (edu.hasDegree) educationScore += 40;
    if (edu.degreeRelevance === 'High') educationScore += 30;
    else if (edu.degreeRelevance === 'Medium') educationScore += 15;
    if (edu.hasGPA) educationScore += 10;
    if (edu.hasCoursework) educationScore += 10;
    if (edu.hasCertifications) educationScore += 10;
    educationScore = Math.min(100, educationScore);

    let experienceScore = 0;
    const exp = extractedFeatures.experience || {};
    if (exp.yearsOfExperience >= 5) experienceScore += 40;
    else if (exp.yearsOfExperience >= 2) experienceScore += 25;
    else if (exp.yearsOfExperience > 0) experienceScore += 15;

    if (exp.hasInternships) experienceScore += 10;
    if (exp.hasFreelanceOrOSS) experienceScore += 10;
    if (exp.hasLeadership) experienceScore += 15;
    if (exp.hasProjects) experienceScore += 10;
    if (exp.hasQuantifiedAchievements) experienceScore += 15;
    experienceScore = Math.min(100, experienceScore);

    let skillsScore = 0;
    const skills = extractedFeatures.skillMatch || {};
    const matchedCount = Array.isArray(skills.matched) ? skills.matched.length : 0;
    const missingCount = Array.isArray(skills.missing) ? skills.missing.length : 0;
    const totalSkills = matchedCount + missingCount;
    if (totalSkills > 0) {
        skillsScore = Math.round((matchedCount / totalSkills) * 100);
    }

    let atsFormattingScore = 0;
    const fmt = extractedFeatures.formatting || {};
    if (fmt.hasContactInfo) atsFormattingScore += 20;
    if (fmt.hasSummary) atsFormattingScore += 20;
    if (fmt.usesActionVerbs) atsFormattingScore += 20;
    if (fmt.goodGrammarAndReadability) atsFormattingScore += 20;
    if (fmt.clearSectionStructure) atsFormattingScore += 20;
    atsFormattingScore = Math.min(100, atsFormattingScore);

    // ATS Keyword Match Score (independent of pure skillsMatch)
    let keywordMatch = 0;
    if (extractedFeatures.keywordScore != null) {
        keywordMatch = Math.min(100, Math.max(0, parseInt(extractedFeatures.keywordScore) || 0));
    } else if (totalSkills > 0) {
        keywordMatch = Math.min(100, Math.max(0, Math.round((matchedCount / totalSkills) * 90) + (fmt.usesActionVerbs ? 10 : 0)));
    }

    // Overall ATS Score (Weighted machine screening formula)
    const overallAts = Math.round(
        (atsFormattingScore * 0.20) +
        (educationScore * 0.15) +
        (experienceScore * 0.35) +
        (skillsScore * 0.30)
    );

    // ── 2. INTELLIGENCE METRICS (CANDIDATE CAPABILITY & DEPTH) ─────────────────────
    // Skill Depth: Breadth + demonstrated mastery of technologies vs superficial buzzwords
    let skillDepth = 0;
    if (totalSkills > 0) {
        const masteryFactor = 0.50 + 
            (exp.hasProjects ? 0.20 : 0) + 
            (exp.hasFreelanceOrOSS ? 0.15 : 0) + 
            (edu.hasCertifications ? 0.15 : 0);
        skillDepth = Math.min(100, Math.round(skillsScore * masteryFactor));
    } else if (exp.hasProjects || exp.hasFreelanceOrOSS) {
        skillDepth = Math.min(100, (exp.hasProjects ? 25 : 0) + (exp.hasFreelanceOrOSS ? 25 : 0));
    }

    // Experience Quality: Commercial progression, tenure, ownership & leadership scope
    let experienceQuality = 0;
    const tenureBase = exp.yearsOfExperience >= 7 ? 40 : (exp.yearsOfExperience >= 4 ? 30 : (exp.yearsOfExperience >= 2 ? 20 : (exp.yearsOfExperience >= 1 ? 10 : 0)));
    const leadershipBonus = exp.hasLeadership ? 30 : 0;
    const impactBonus = exp.hasQuantifiedAchievements ? (exp.yearsOfExperience >= 2 ? 20 : 10) : 0;
    const degreeRelevanceBonus = edu.degreeRelevance === 'High' ? 10 : (edu.degreeRelevance === 'Medium' ? 5 : 0);
    experienceQuality = Math.min(100, tenureBase + leadershipBonus + impactBonus + degreeRelevanceBonus);

    // Impact & Quantified Results: Density of measurable business achievements
    let impactDensity = 0;
    if (exp.hasQuantifiedAchievements) {
        const tenureScale = exp.yearsOfExperience >= 3 ? 45 : (exp.yearsOfExperience > 0 ? 25 : 15);
        impactDensity = Math.min(100, tenureScale + (fmt.usesActionVerbs ? 25 : 10) + (exp.hasLeadership ? 25 : 0));
    } else if (fmt.usesActionVerbs) {
        impactDensity = 20;
    } else if (exp.hasProjects) {
        impactDensity = 15;
    }

    // Composite Profile Strength (Weighted candidate substance)
    const profileStrength = Math.round(
        (skillDepth * 0.40) +
        (experienceQuality * 0.40) +
        (impactDensity * 0.20)
    );

    // ── 3. RECRUITER INTEREST (HUMAN HIRING APPEAL & CALLBACK PROBABILITY) ──────────
    // 1. Role & Skill Fit (45%): Core match against target job expectations
    const roleFit = (aiData.jobMatchScore != null && Number(aiData.jobMatchScore) > 0)
        ? Number(aiData.jobMatchScore)
        : skillsScore;

    // 2. Seniority & Track Alignment (35%): Role tenure and title readiness
    let seniorityAlignment = 0;
    if (exp.yearsOfExperience >= 5) seniorityAlignment += 45;
    else if (exp.yearsOfExperience >= 2) seniorityAlignment += 30;
    else if (exp.yearsOfExperience > 0) seniorityAlignment += 15;
    if (exp.hasLeadership) seniorityAlignment += 25;
    if (edu.hasDegree) seniorityAlignment += 20;
    if (edu.degreeRelevance === 'High') seniorityAlignment += 10;
    seniorityAlignment = Math.min(100, seniorityAlignment);

    // 3. High-Value Hiring Signals (10%): Certs, quantified proof, OSS
    let hiringSignals = 0;
    if (exp.hasQuantifiedAchievements) hiringSignals += 35;
    if (exp.hasLeadership) hiringSignals += 25;
    if (edu.hasCertifications) hiringSignals += 20;
    if (exp.hasFreelanceOrOSS) hiringSignals += 15;
    if (edu.hasGPA) hiringSignals += 10;
    hiringSignals = Math.min(100, hiringSignals);

    // 4. 6-Second Scanability & Presentation (10%): Hygiene presentation factor
    let scanability = 0;
    if (fmt.hasContactInfo) scanability += 25;
    if (fmt.hasSummary) scanability += 25;
    if (fmt.clearSectionStructure) scanability += 25;
    if (fmt.goodGrammarAndReadability) scanability += 25;
    scanability = Math.min(100, scanability);

    // Recruiter Interest: Weighted probability of callback
    let recruiterInterest = Math.round(
        (roleFit * 0.45) +
        (seniorityAlignment * 0.35) +
        (hiringSignals * 0.10) +
        (scanability * 0.10)
    );

    // Recruiter Verdict Alignment: Ground score in the qualitative hiring verdict
    const rawVerdict = (aiData.jobMatchAnalysis?.recruiterVerdict || aiData.verdict || '').toLowerCase();
    if (rawVerdict.includes('needs improvement') || rawVerdict.includes('reject') || rawVerdict.includes('low match')) {
        recruiterInterest = Math.min(recruiterInterest, 48);
    } else if (rawVerdict.includes('exceptional') || rawVerdict.includes('elite')) {
        recruiterInterest = Math.max(recruiterInterest, 85);
    } else if (rawVerdict.includes('strong') || rawVerdict.includes('high match')) {
        recruiterInterest = Math.max(recruiterInterest, 72);
    }
    recruiterInterest = Math.min(100, Math.max(0, recruiterInterest));

    // Recruiter Verdict Category
    let interestCategory = 'Moderate';
    if (recruiterInterest >= 85) interestCategory = 'Excellent';
    else if (recruiterInterest >= 70) interestCategory = 'Strong';
    else if (recruiterInterest >= 50) interestCategory = 'Moderate';
    else interestCategory = 'Needs Improvement';

    return {
        // ATS machine breakdown (backward compatible keys)
        educationScore,
        experienceScore,
        skillsMatch: skillsScore,
        formattingScore: atsFormattingScore,
        keywordMatch,
        overallAts,

        // Candidate Intelligence Metrics
        intelligenceMetrics: {
            skillDepth,
            experienceQuality,
            impactDensity,
            profileStrength
        },

        // Recruiter Human Interest
        recruiterInterest,
        recruiterInterestBreakdown: {
            score: recruiterInterest,
            category: interestCategory,
            seniorityAlignment,
            scanability,
            hiringSignals
        }
    };
}
