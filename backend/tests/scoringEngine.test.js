import { calculateDeterministicScores } from '../utils/scoringEngine.js';

describe('Deterministic Scoring Engine', () => {
    it('should generate higher experience score when years of experience increase', () => {
        const baseFeatures = {
            experience: { yearsOfExperience: 1, hasInternships: false, hasFreelanceOrOSS: false, hasLeadership: false, hasProjects: false, hasQuantifiedAchievements: false }
        };
        const advancedFeatures = {
            experience: { yearsOfExperience: 5, hasInternships: false, hasFreelanceOrOSS: false, hasLeadership: false, hasProjects: false, hasQuantifiedAchievements: false }
        };

        const score1 = calculateDeterministicScores(baseFeatures);
        const score2 = calculateDeterministicScores(advancedFeatures);

        expect(score2.experienceScore).toBeGreaterThan(score1.experienceScore);
    });

    it('should generate higher skills match when missing skills are added to matched', () => {
        const baseFeatures = {
            skillMatch: { matched: ['React'], missing: ['Node', 'AWS', 'Docker'] }
        };
        const advancedFeatures = {
            skillMatch: { matched: ['React', 'Node', 'AWS'], missing: ['Docker'] }
        };

        const score1 = calculateDeterministicScores(baseFeatures);
        const score2 = calculateDeterministicScores(advancedFeatures);

        expect(score2.skillsMatch).toBeGreaterThan(score1.skillsMatch);
    });

    it('should generate higher formatting score when missing ATS structures are added', () => {
        const baseFeatures = {
            formatting: { hasContactInfo: true, hasSummary: false, usesActionVerbs: false, goodGrammarAndReadability: true, clearSectionStructure: false }
        };
        const advancedFeatures = {
            formatting: { hasContactInfo: true, hasSummary: true, usesActionVerbs: true, goodGrammarAndReadability: true, clearSectionStructure: true }
        };

        const score1 = calculateDeterministicScores(baseFeatures);
        const score2 = calculateDeterministicScores(advancedFeatures);

        expect(score2.formattingScore).toBeGreaterThan(score1.formattingScore);
        expect(score2.overallAts).toBeGreaterThan(score1.overallAts);
    });

    it('should never generate negative scores or scores > 100', () => {
        const perfectFeatures = {
            education: { hasDegree: true, degreeRelevance: 'High', hasGPA: true, hasCoursework: true, hasCertifications: true },
            experience: { yearsOfExperience: 20, hasInternships: true, hasFreelanceOrOSS: true, hasLeadership: true, hasProjects: true, hasQuantifiedAchievements: true },
            skillMatch: { matched: ['A', 'B', 'C', 'D', 'E'], missing: [] },
            formatting: { hasContactInfo: true, hasSummary: true, usesActionVerbs: true, goodGrammarAndReadability: true, clearSectionStructure: true }
        };

        const emptyFeatures = {};

        const perfect = calculateDeterministicScores(perfectFeatures);
        const empty = calculateDeterministicScores(emptyFeatures);

        // Perfect limits
        expect(perfect.educationScore).toBe(100);
        expect(perfect.experienceScore).toBe(100);
        expect(perfect.skillsMatch).toBe(100);
        expect(perfect.formattingScore).toBe(100);
        expect(perfect.overallAts).toBe(100);

        // Empty limits
        expect(empty.educationScore).toBe(0);
        expect(empty.experienceScore).toBe(0);
        expect(empty.skillsMatch).toBe(0);
        expect(empty.formattingScore).toBe(0);
        expect(empty.overallAts).toBe(0);
    });
});
