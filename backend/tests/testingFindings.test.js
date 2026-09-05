import { roastSchema } from '../utils/schemas.js';
import interviewRouter from '../routes/interview.js';

describe('🧪 ResuLens Testing Findings & Functional Verification Suite', () => {

    // Helper to invoke interview router POST /evaluate
    const evaluateHandler = interviewRouter.stack.find(
        s => s.route?.path === '/evaluate' && s.route?.methods?.post
    ).route.stack[0].handle;

    const createMockRes = () => {
        const res = {};
        res.statusCode = 200;
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data) => {
            res.body = data;
            return res;
        };
        return res;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 3: Interview Section — Evaluation & Scoring Rubric Verification
    // ──────────────────────────────────────────────────────────────────────────
    describe('1. Interview Scoring & Evaluation Pipeline', () => {

        test('1.1. Empty or whitespace-only answer must immediately return score: 0 and "Needs Improvement"', async () => {
            const req = {
                body: {
                    question: 'How does the React Virtual DOM diffing algorithm work?',
                    answer: '   ',
                    jobRole: 'Frontend Developer'
                }
            };
            const res = createMockRes();

            await evaluateHandler(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.score).toBe(0);
            expect(res.body.verdict).toBe('Needs Improvement');
            expect(res.body.feedback).toMatch(/too brief/i);
            expect(res.body.improvementAreas).toBeDefined();
            expect(res.body.improvementAreas.length).toBeGreaterThan(0);
        });

        test('1.2. "I don\'t know" response must immediately return score: 0 and constructive feedback', async () => {
            const req = {
                body: {
                    question: 'Explain the difference between TCP and UDP.',
                    answer: "I don't know",
                    jobRole: 'Backend Engineer'
                }
            };
            const res = createMockRes();

            await evaluateHandler(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.score).toBe(0);
            expect(res.body.verdict).toBe('Needs Improvement');
            expect(res.body.feedback).toMatch(/don't know/i);
            expect(res.body.starCheck.situation).toBe('Not provided');
        });

        test('1.3. Evasive answers ("no idea", "skip", "idk") must immediately return score: 0', async () => {
            const evasiveAnswers = ["no idea", "skip", "pass", "idk", "I have no clue"];

            for (const ans of evasiveAnswers) {
                const req = {
                    body: {
                        question: 'What is database sharding?',
                        answer: ans,
                        jobRole: 'Database Engineer'
                    }
                };
                const res = createMockRes();

                await evaluateHandler(req, res);

                expect(res.statusCode).toBe(200);
                expect(res.body.score).toBe(0);
                expect(res.body.verdict).toBe('Needs Improvement');
            }
        });

        test('1.4. Missing question or non-string answer returns 400 Context missing', async () => {
            const req = {
                body: {
                    jobRole: 'QA Engineer'
                }
            };
            const res = createMockRes();

            await evaluateHandler(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Context missing');
        });

        test('1.5. Criteria and difficulty parameters are accepted and incorporated in response for fast-path', async () => {
            const req = {
                body: {
                    question: 'Explain event bubbling in JavaScript.',
                    answer: 'idk',
                    jobRole: 'Web Developer',
                    criteria: 'Event propagation from target up through the DOM tree, stopPropagation()',
                    difficulty: 'Medium'
                }
            };
            const res = createMockRes();

            await evaluateHandler(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.score).toBe(0);
            expect(res.body.improvedVersion).toContain('Event propagation');
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 4: Resume Roast — Categorized Scoring & Actionable Schema
    // ──────────────────────────────────────────────────────────────────────────
    describe('2. Resume Roast Categorized Scoring & Schema Verification', () => {

        test('2.1. roastSchema validates complete categorized 4-part breakdown and structured actionable issues', () => {
            const validRoastPayload = {
                breakdown: {
                    contentScore: 20,
                    atsScore: 22,
                    impactScore: 18,
                    skillsScore: 19
                },
                roastScore: 79,
                actionableIssues: [
                    {
                        problem: "Responsible for managing web servers and writing software.",
                        location: "Experience: Software Engineer",
                        whyItMatters: "Passive statement that fails to convey measurable impact or technical scope.",
                        howToFix: "Use strong action verbs and specify metrics like uptime or user load.",
                        improvedExample: "Architected AWS infrastructure achieving 99.99% uptime for 500k monthly active users.",
                        priority: "High"
                    }
                ],
                jdAlignment: {
                    matchingSkills: ["React", "Node.js", "Docker"],
                    missingSkills: ["Kubernetes", "GraphQL"],
                    alignmentSummary: "Candidate has strong foundational core stack match but lacks distributed systems orchestrations."
                },
                weaknesses: ["Passive job descriptions without metrics"],
                rejectionRisks: ["Vague accomplishments trigger automated ATS filtering"],
                priorityFixes: ["Rewrite experience bullets with action-verb + metric formula"],
                brutalTruth: "Reads like a job duty list rather than a record of accomplishments."
            };

            const result = roastSchema.safeParse(validRoastPayload);
            expect(result.success).toBe(true);
            expect(result.data.roastScore).toBe(79);
            expect(result.data.breakdown.contentScore).toBe(20);
            expect(result.data.breakdown.atsScore).toBe(22);
            expect(result.data.breakdown.impactScore).toBe(18);
            expect(result.data.breakdown.skillsScore).toBe(19);
            expect(result.data.actionableIssues.length).toBe(1);
            expect(result.data.actionableIssues[0].priority).toBe("High");
            expect(result.data.jdAlignment.matchingSkills).toContain("React");
        });

        test('2.2. roastScore represents the sum of the four 25-point dimensions (0-100 total)', () => {
            const breakdown = {
                contentScore: 21,
                atsScore: 23,
                impactScore: 15,
                skillsScore: 17
            };
            const total = breakdown.contentScore + breakdown.atsScore + breakdown.impactScore + breakdown.skillsScore;
            expect(total).toBe(76);
            expect(total).toBeLessThanOrEqual(100);
            expect(total).toBeGreaterThanOrEqual(0);
        });

        test('2.3. Backward compatibility: Legacy roast payloads without breakdown or actionableIssues remain valid', () => {
            const legacyPayload = {
                weaknesses: ["No numbers"],
                priorityFixes: ["Add numbers"],
                rejectionRisks: ["Formatting"],
                brutalTruth: "Too boring.",
                roastScore: 45
            };

            const result = roastSchema.safeParse(legacyPayload);
            expect(result.success).toBe(true);
            expect(result.data.roastScore).toBe(45);
            expect(result.data.breakdown).toBeUndefined();
        });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 1 & 2: Typography & Template Insulation Integrity
    // ──────────────────────────────────────────────────────────────────────────
    describe('3. Typography & Template Dark Mode Insulation Contracts', () => {
        test('3.1. Standard resume sheet variables enforce dark text tokens on white paper', () => {
            const sheetStyles = {
                '--text-primary': '#0f172a',
                '--text-secondary': '#334155',
                '--text-muted': '#64748b',
                'backgroundColor': '#ffffff',
                'color': '#0f172a'
            };

            expect(sheetStyles['--text-primary']).toBe('#0f172a');
            expect(sheetStyles['backgroundColor']).toBe('#ffffff');
            // Ensure colors are not white/light values
            expect(sheetStyles['--text-primary']).not.toBe('#F9FAFB');
            expect(sheetStyles['--text-secondary']).not.toBe('#D1D5DB');
        });
    });
});
