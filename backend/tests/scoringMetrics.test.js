import { calculateDeterministicScores } from '../utils/scoringEngine.js';

describe('ResuLens Independent Scoring Metrics Test Suite', () => {
    // 1. Archetype 1: Senior Staff Engineer
    // Deep tenure, high impact achievements, OSS/leadership, clean ATS formatting
    const seniorStaffFeatures = {
        education: { hasDegree: true, degreeRelevance: 'High', hasGPA: false, hasCoursework: false, hasCertifications: true },
        experience: { yearsOfExperience: 8, hasInternships: false, hasFreelanceOrOSS: true, hasLeadership: true, hasProjects: true, hasQuantifiedAchievements: true },
        skillMatch: {
            matched: ['React', 'Node.js', 'System Architecture', 'Kubernetes', 'AWS', 'PostgreSQL', 'Microservices'],
            missing: ['Go']
        },
        formatting: { hasContactInfo: true, hasSummary: true, usesActionVerbs: true, goodGrammarAndReadability: true, clearSectionStructure: true },
        keywordScore: 92
    };

    // 2. Archetype 2: Fresher / Recent Graduate
    // CS degree, strong GPA, student projects, but 0-1 years tenure, no leadership, no formal achievements
    const fresherFeatures = {
        education: { hasDegree: true, degreeRelevance: 'High', hasGPA: true, hasCoursework: true, hasCertifications: false },
        experience: { yearsOfExperience: 0.5, hasInternships: true, hasFreelanceOrOSS: false, hasLeadership: false, hasProjects: true, hasQuantifiedAchievements: false },
        skillMatch: {
            matched: ['Python', 'SQL', 'Git'],
            missing: ['AWS', 'Docker', 'Kubernetes', 'Kafka', 'Redis', 'CI/CD']
        },
        formatting: { hasContactInfo: true, hasSummary: true, usesActionVerbs: false, goodGrammarAndReadability: true, clearSectionStructure: true },
        keywordScore: 35
    };

    // 3. Archetype 3: Senior Executive / Director with Terrible ATS Formatting
    // 15 years experience, executive leadership, quantified revenue impact, but messy multi-column layout missing standard headers
    const executivePoorFormatFeatures = {
        education: { hasDegree: true, degreeRelevance: 'High', hasGPA: false, hasCoursework: false, hasCertifications: true },
        experience: { yearsOfExperience: 15, hasInternships: false, hasFreelanceOrOSS: false, hasLeadership: true, hasProjects: true, hasQuantifiedAchievements: true },
        skillMatch: {
            matched: ['Executive Leadership', 'P&L Management', 'Cloud Strategy', 'Team Building'],
            missing: ['Hands-on Kubernetes', 'Golang']
        },
        formatting: { hasContactInfo: true, hasSummary: false, usesActionVerbs: true, goodGrammarAndReadability: true, clearSectionStructure: false },
        keywordScore: 65
    };

    // 4. Archetype 4: Keyword-Stuffed Resume with Superficial Experience
    // Matches 100% of skills by listing them in a block, but 0 actual experience, no projects, no quantified impact
    const keywordStuffedFeatures = {
        education: { hasDegree: false, degreeRelevance: 'None', hasGPA: false, hasCoursework: false, hasCertifications: false },
        experience: { yearsOfExperience: 0, hasInternships: false, hasFreelanceOrOSS: false, hasLeadership: false, hasProjects: false, hasQuantifiedAchievements: false },
        skillMatch: {
            matched: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'TypeScript', 'GraphQL'],
            missing: []
        },
        formatting: { hasContactInfo: true, hasSummary: false, usesActionVerbs: false, goodGrammarAndReadability: false, clearSectionStructure: false },
        keywordScore: 95
    };

    // 5. Archetype 5: Irrelevant Domain Profile
    // 6 years experience in non-technical role, 0 technical skills matched
    const irrelevantDomainFeatures = {
        education: { hasDegree: true, degreeRelevance: 'Low', hasGPA: false, hasCoursework: false, hasCertifications: false },
        experience: { yearsOfExperience: 6, hasInternships: false, hasFreelanceOrOSS: false, hasLeadership: false, hasProjects: false, hasQuantifiedAchievements: false },
        skillMatch: {
            matched: [],
            missing: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'SQL', 'Git']
        },
        formatting: { hasContactInfo: true, hasSummary: true, usesActionVerbs: true, goodGrammarAndReadability: true, clearSectionStructure: true },
        keywordScore: 10
    };

    describe('Archetype Metric Variance & Independence', () => {
        const seniorResult = calculateDeterministicScores(seniorStaffFeatures);
        const fresherResult = calculateDeterministicScores(fresherFeatures);
        const execResult = calculateDeterministicScores(executivePoorFormatFeatures);
        const stuffedResult = calculateDeterministicScores(keywordStuffedFeatures);
        const irrelevantResult = calculateDeterministicScores(irrelevantDomainFeatures);

        test('1. Senior Staff Engineer produces top-tier scores across all 3 dimensions', () => {
            expect(seniorResult.overallAts).toBeGreaterThanOrEqual(80);
            expect(seniorResult.intelligenceMetrics.profileStrength).toBeGreaterThanOrEqual(75);
            expect(seniorResult.recruiterInterest).toBeGreaterThanOrEqual(80);
            expect(['Strong', 'Excellent']).toContain(seniorResult.recruiterInterestBreakdown.category);
        });

        test('2. Fresher exhibits decent ATS formatting and Education, but lower Recruiter Seniority & Experience Quality', () => {
            // ATS formatting & education should be reasonably high
            expect(fresherResult.formattingScore).toBeGreaterThanOrEqual(80);
            expect(fresherResult.educationScore).toBeGreaterThanOrEqual(60);

            // Experience Quality & Recruiter Interest should be significantly lower than senior
            expect(fresherResult.intelligenceMetrics.experienceQuality).toBeLessThan(40);
            expect(fresherResult.recruiterInterestBreakdown.seniorityAlignment).toBeLessThan(50);
            expect(fresherResult.recruiterInterest).toBeLessThan(seniorResult.recruiterInterest);
        });

        test('3. Executive with Bad ATS Formatting shows high Recruiter Interest / Intelligence, but penalised ATS Score', () => {
            // ATS formatting is penalised
            expect(execResult.formattingScore).toBeLessThanOrEqual(60);
            
            // But human appeal (Recruiter Interest) and Experience Quality are very high
            expect(execResult.intelligenceMetrics.experienceQuality).toBeGreaterThanOrEqual(80);
            expect(execResult.recruiterInterestBreakdown.seniorityAlignment).toBeGreaterThanOrEqual(80);
            expect(execResult.recruiterInterest).toBeGreaterThan(execResult.overallAts);
        });

        test('4. Keyword-Stuffed Resume shows high Skills Match but low Experience Quality and low Recruiter Interest', () => {
            // Skills match is 100%
            expect(stuffedResult.skillsMatch).toBe(100);

            // But experience quality and recruiter interest reflect the lack of substance
            expect(stuffedResult.intelligenceMetrics.experienceQuality).toBe(0);
            expect(stuffedResult.intelligenceMetrics.impactDensity).toBe(0);
            expect(stuffedResult.recruiterInterest).toBeLessThan(50);
            expect(stuffedResult.recruiterInterestBreakdown.category).toBe('Needs Improvement');
            
            // Distinct divergence: skills match vs recruiter interest
            expect(stuffedResult.skillsMatch - stuffedResult.recruiterInterest).toBeGreaterThanOrEqual(40);
        });

        test('5. Irrelevant Domain Candidate has low Skills Match and low Keyword Match despite tenure', () => {
            expect(irrelevantResult.skillsMatch).toBe(0);
            expect(irrelevantResult.keywordMatch).toBe(10);
            expect(irrelevantResult.overallAts).toBeLessThan(50);
            expect(irrelevantResult.intelligenceMetrics.skillDepth).toBe(0);
        });

        test('6. Verifies that the 3 primary metrics are mathematically distinct across all profiles', () => {
            const profiles = [seniorResult, fresherResult, execResult, stuffedResult, irrelevantResult];
            
            profiles.forEach((p, idx) => {
                // Assert all numbers are within safe bounds
                expect(p.overallAts).toBeGreaterThanOrEqual(0);
                expect(p.overallAts).toBeLessThanOrEqual(100);
                expect(p.intelligenceMetrics.profileStrength).toBeGreaterThanOrEqual(0);
                expect(p.intelligenceMetrics.profileStrength).toBeLessThanOrEqual(100);
                expect(p.recruiterInterest).toBeGreaterThanOrEqual(0);
                expect(p.recruiterInterest).toBeLessThanOrEqual(100);

                // Not all 3 metrics are identical (they must not collapse into a single value)
                const allEqual = (p.overallAts === p.intelligenceMetrics.profileStrength) && 
                                 (p.intelligenceMetrics.profileStrength === p.recruiterInterest);
                expect(allEqual).toBe(false);
            });
        });
    });
});
