export function calculateDeterministicScores(extractedFeatures) {
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
    const matched = skills.matched ? skills.matched.length : 0;
    const total = matched + (skills.missing ? skills.missing.length : 0);
    if (total > 0) {
        skillsScore = Math.round((matched / total) * 100);
    }

    let atsFormattingScore = 0;
    const fmt = extractedFeatures.formatting || {};
    if (fmt.hasContactInfo) atsFormattingScore += 20;
    if (fmt.hasSummary) atsFormattingScore += 20;
    if (fmt.usesActionVerbs) atsFormattingScore += 20;
    if (fmt.goodGrammarAndReadability) atsFormattingScore += 20;
    if (fmt.clearSectionStructure) atsFormattingScore += 20;
    atsFormattingScore = Math.min(100, atsFormattingScore);

    // Configurable weights for overall ATS score
    // Formatting: 20%, Education: 15%, Experience: 35%, Skills: 30%
    const overallAts = Math.round(
        (atsFormattingScore * 0.20) +
        (educationScore * 0.15) +
        (experienceScore * 0.35) +
        (skillsScore * 0.30)
    );

    return {
        educationScore,
        experienceScore,
        skillsMatch: skillsScore,
        formattingScore: atsFormattingScore,
        overallAts
    };
}
