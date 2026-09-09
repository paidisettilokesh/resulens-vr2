import axios from "axios";
import fs from "fs";
import crypto from "crypto";
import { extractText } from "./extractText.js";
import AICache from "../models/AICache.js";
import { analyzeSchema, roastSchema, optimizeSchema } from "./schemas.js";
import { calculateDeterministicScores } from "./scoringEngine.js";
import logger from "./logger.js";

// ── Request Budget ─────────────────────────────────────────────────────────────
// Keep provider retries within a predictable budget. Cache hits return
// immediately; cache misses must not spend several minutes exhausting every
// provider and lose their response to the API gateway timeout.
const AI_REQUEST_BUDGET_MS = Math.max(10000, parseInt(process.env.AI_REQUEST_BUDGET_MS || '85000', 10));
const PRIMARY_PROVIDER_BUDGET_MS   = Math.min(40000, Math.floor(AI_REQUEST_BUDGET_MS * 0.50));
const SECONDARY_PROVIDER_BUDGET_MS = Math.min(25000, Math.floor(AI_REQUEST_BUDGET_MS * 0.30));

const remainingTimeout = (deadline, preferredMs) => {
    const remaining = deadline - Date.now();
    return remaining > 0 ? Math.min(preferredMs, remaining) : 0;
};

// ── Request ID ─────────────────────────────────────────────────────────────────
export const generateRequestId = () => crypto.randomBytes(8).toString('hex');

// ── GEMINI PROVIDER (Primary: Google Generative AI) ───────────────────────────
const callGemini = async (prompt, deadline, requestLog) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;

    const defaultModels = [
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest'
    ];

    const configuredModel = process.env.GEMINI_MODEL;
    const models = configuredModel
        ? [configuredModel, ...defaultModels.filter(m => m !== configuredModel)]
        : defaultModels;

    for (const model of models) {
        const timeout = remainingTimeout(deadline, 25000);
        if (!timeout) break;

        const start = Date.now();
        try {
            logger.info(`[Gemini] Trying ${model}...`);
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                {
                    contents: [{
                        parts: [{ text: prompt + '\n\nRETURN VALID JSON ONLY. No preamble, no markdown, no code fences.' }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topP: 1,
                        maxOutputTokens: 8192,
                        responseMimeType: 'application/json'
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout
                }
            );

            const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) continue;

            if (requestLog) requestLog.providerAttempts.push({ provider: 'gemini', model, status: 'success', durationMs: Date.now() - start });

            try {
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                if (match) return JSON.parse(match[0]);
            }
        } catch (e) {
            const status = e.response?.status;
            const msg = e.response?.data?.error?.message || e.message;
            if (requestLog) requestLog.providerAttempts.push({ provider: 'gemini', model, status: status || 'timeout', durationMs: Date.now() - start });
            logger.error(`[Gemini] ${model} failed: ${status || 'TIMEOUT'} | ${msg}`);
            if (status === 429) logger.warn('[Gemini] Rate limited — will try next model/provider');
        }
    }
    return null;
};

// ── GROQ PROVIDER (Fallback 1: Ultra-Fast, Free Tier) ─────────────────────────
const callGroq = async (prompt, deadline, requestLog) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;

    // Currently active Groq models
    const defaultModels = [
        'qwen/qwen3.8-27b',
        'qwen/qwen3.6-27b',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'groq/compound'
    ];

    const configuredModel = process.env.GROQ_MODEL;
    const models = configuredModel
        ? [configuredModel, ...defaultModels.filter(m => m !== configuredModel)]
        : defaultModels;

    for (const model of models) {
        const timeout = remainingTimeout(deadline, 18000);
        if (!timeout) break;
        const start = Date.now();
        try {
            logger.info(`[Groq] Trying ${model}...`);
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model,
                    messages: [{ role: "user", content: prompt + "\n\nRETURN VALID JSON ONLY. No preamble, no markdown." }],
                    temperature: 0.1,
                    top_p: 1,
                    max_tokens: 4096,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    timeout
                }
            );

            const content = response.data.choices?.[0]?.message?.content;
            if (!content) continue;

            if (requestLog) requestLog.providerAttempts.push({ provider: 'groq', model, status: 'success', durationMs: Date.now() - start });

            try {
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                if (match) return JSON.parse(match[0]);
            }
        } catch (e) {
            const status = e.response?.status;
            if (requestLog) requestLog.providerAttempts.push({ provider: 'groq', model, status: status || 'timeout', durationMs: Date.now() - start });
            logger.error(`[Groq] ${model} failed: ${status || e.message}`);
            if (status === 429) {
                logger.warn(`[Groq] Rate limited on ${model}, trying next model...`);
                await new Promise(r => setTimeout(r, 400));
            } else if (status === 400 || status === 404) {
                // Invalid model ID or bad request — skip immediately
                continue;
            }
        }
    }
    return null;
};

// ── OPENROUTER PROVIDER (Fallback 2: Free/Paid Models) ────────────────────────
const callOpenRouter = async (prompt, deadline, requestLog) => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return null;

    const configuredModel = process.env.OPENROUTER_MODEL;
    const defaultModels = [
        "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3.5-lightning:free",
        "minimax/minimax-m2.7:free",
        "liquid/lfm-2.5-2.6b:free"
    ];

    const models = configuredModel
        ? [configuredModel, ...defaultModels.filter(m => m !== configuredModel)]
        : defaultModels;

    for (const targetModel of models) {
        const timeout = remainingTimeout(deadline, 12000);
        if (!timeout) return null;
        const start = Date.now();
        try {
            logger.info(`[OpenRouter] Trying ${targetModel}...`);
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: targetModel,
                    messages: [{ role: "user", content: prompt + "\n\nRETURN VALID JSON ONLY. No preamble, no markdown." }],
                    temperature: 0.1,
                    top_p: 1,
                    max_tokens: 4096
                },
                {
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
                        "X-Title": "ResuLens",
                        "Content-Type": "application/json"
                    },
                    timeout
                }
            );

            const content = response.data.choices?.[0]?.message?.content;
            if (!content) continue;

            if (requestLog) requestLog.providerAttempts.push({ provider: 'openrouter', model: targetModel, status: 'success', durationMs: Date.now() - start });

            try {
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                if (match) return JSON.parse(match[0]);
            }
        } catch (e) {
            const status = e.response?.status;
            const msg = e.response?.data?.error?.message || e.message;
            if (requestLog) requestLog.providerAttempts.push({ provider: 'openrouter', model: targetModel, status: status || 'timeout', durationMs: Date.now() - start });
            logger.error(`[OpenRouter] ${targetModel} failed: ${status || 'TIMEOUT'} | ${msg}`);
            if (status === 429 && msg?.includes("free-models-per-day")) {
                // This specific model's daily quota is exhausted — try next
                continue;
            }
        }
    }
    return null;
};

// ── UNIFIED AI CALLER ─────────────────────────────────────────────────────────
const localCache = new Map();
const getPromptHash = (prompt) => crypto.createHash('sha256').update(prompt).digest('hex');

// Provider order is configurable via AI_PROVIDER_ORDER env var.
// Default: Gemini → Groq → OpenRouter
const getProviderOrder = () => {
    const raw = process.env.AI_PROVIDER_ORDER || 'gemini,groq,openrouter';
    return raw.split(',')
        .map(p => p.trim().toLowerCase())
        .filter(p => ['gemini', 'groq', 'openrouter'].includes(p));
};

export const callAI = async (prompt, requestLog = null) => {
    const hash = getPromptHash(prompt);

    // 1. Memory cache (ultrafast)
    if (localCache.has(hash)) {
        const cached = localCache.get(hash);
        if (cached.expiresAt > Date.now()) {
            logger.info('[AI Cache] ⚡ Hit (Memory Cache)');
            if (requestLog) requestLog.cacheHit = 'memory';
            return cached.response;
        }
        localCache.delete(hash); // Expired
    }

    // 2. MongoDB cache
    if (global.isMongoConnected) {
        try {
            const cachedRecord = await AICache.findOne({ promptHash: hash });
            if (cachedRecord) {
                logger.info('[AI Cache] ⚡ Hit (Database Cache)');
                if (requestLog) requestLog.cacheHit = 'database';
                localCache.set(hash, {
                    response: cachedRecord.response,
                    expiresAt: cachedRecord.expiresAt.getTime()
                });
                return cachedRecord.response;
            }
        } catch (err) {
            logger.error('[AI Cache] MongoDB cache query error: %s', err.message);
        }
    }

    // 3. Live API call — walk the configured provider chain
    const deadline = Date.now() + AI_REQUEST_BUDGET_MS;
    const providerOrder = getProviderOrder();
    let result = null;

    for (let i = 0; i < providerOrder.length; i++) {
        const provider = providerOrder[i];
        if (!remainingTimeout(deadline, 1000)) {
            logger.warn('[AI] Global request budget exhausted — no more provider attempts');
            break;
        }

        // Each provider gets a shrinking slice of the overall budget
        const budgetMs = i === 0 ? PRIMARY_PROVIDER_BUDGET_MS
            : i === 1 ? SECONDARY_PROVIDER_BUDGET_MS
            : AI_REQUEST_BUDGET_MS; // Last provider gets whatever is left
        const providerDeadline = Math.min(deadline, Date.now() + budgetMs);

        logger.info(`[AI] Provider ${i + 1}/${providerOrder.length}: ${provider}`);

        if (provider === 'gemini')     result = await callGemini(prompt, providerDeadline, requestLog);
        else if (provider === 'groq')  result = await callGroq(prompt, providerDeadline, requestLog);
        else if (provider === 'openrouter') result = await callOpenRouter(prompt, providerDeadline, requestLog);

        if (result && !result.error) break; // Success — stop walking the chain

        if (result?.error === 'QUOTA_EXHAUSTED') {
            result = null; // Try next provider
        }
    }

    // 4. Cache valid results (not broken/all-zero responses)
    const looksValid = result && !result.error &&
        !(result.atsScore === 0 && result.jobMatchScore === 0 && !result.candidateName);

    if (looksValid) {
        const expiryDuration = 48 * 60 * 60 * 1000; // 48 hours
        const expiresAt = Date.now() + expiryDuration;

        if (localCache.size >= 200) {
            const oldestKey = localCache.keys().next().value;
            localCache.delete(oldestKey);
        }
        localCache.set(hash, { response: result, expiresAt });

        if (global.isMongoConnected) {
            try {
                await AICache.findOneAndUpdate(
                    { promptHash: hash },
                    { promptHash: hash, response: result, expiresAt: new Date(expiresAt) },
                    { upsert: true, new: true }
                );
            } catch (err) {
                logger.error('[AI Cache] Failed to write cache to MongoDB: %s', err.message);
            }
        }
    }

    return result;
};


// ── FEATURE-SPECIFIC NORMALIZERS ──────────────────────────────────────────────

const safeJoin = (val, sep = ". ") => {
    if (!val) return "";
    if (Array.isArray(val)) return val.join(sep);
    return String(val);
};

const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [String(val)];
};

const normalizeAnalysis = (data) => {
    const parseScore = (val) => {
        const n = parseInt(val);
        return isNaN(n) ? 0 : Math.min(Math.max(n, 0), 100);
    };

    let ds = null;
    if (data.extractedFeatures) {
        ds = calculateDeterministicScores({
            ...data.extractedFeatures,
            skillMatch: data.jobMatchAnalysis?.skillMatch
        }, data);
    }

    const atsScore = ds ? ds.overallAts : parseScore(data.atsScore || data.score);
    const jobMatchScore = parseScore(data.jobMatchScore || data.matchScore);
    const recruiterInterest = ds?.recruiterInterest != null
        ? ds.recruiterInterest
        : (data.recruiterInterest != null ? parseScore(data.recruiterInterest) : Math.round((atsScore * 0.4) + (jobMatchScore * 0.6)));

    const educationScore = ds ? ds.educationScore : parseScore(data.educationScore);
    const experienceScore = ds ? ds.experienceScore : parseScore(data.experienceScore);
    const skillsMatch = ds ? ds.skillsMatch : parseScore(data.skillsMatch);

    const intelligenceMetrics = ds?.intelligenceMetrics || {
        skillDepth: Math.round(skillsMatch * 0.8),
        experienceQuality: Math.round(experienceScore * 0.85),
        impactDensity: Math.round(experienceScore * 0.7),
        profileStrength: Math.round((skillsMatch * 0.35) + (experienceScore * 0.35) + (educationScore * 0.30))
    };

    const recruiterInterestBreakdown = ds?.recruiterInterestBreakdown || {
        score: recruiterInterest,
        category: recruiterInterest >= 85 ? 'Excellent' : recruiterInterest >= 70 ? 'Strong' : recruiterInterest >= 50 ? 'Moderate' : 'Needs Improvement',
        seniorityAlignment: Math.round(experienceScore * 0.9),
        scanability: 80,
        hiringSignals: Math.round((skillsMatch * 0.5) + (experienceScore * 0.5))
    };

    return {
        candidateName: data.candidateName || data.name || 'Candidate',
        location: data.location || 'N/A',
        atsScore,
        jobMatchScore,
        recruiterInterest,
        recruiterInterestBreakdown,
        educationScore,
        experienceScore,
        skillsMatch,
        intelligenceMetrics,
        atsScoreBreakdown: ds ? {
            educationMatch: ds.educationScore,
            educationMatchMax: 100,
            experienceMatch: ds.experienceScore,
            experienceMatchMax: 100,
            skillsMatch: ds.skillsMatch,
            skillsMatchMax: 100,
            keywordMatch: ds.keywordMatch,
            keywordMatchMax: 100,
            formattingMatch: ds.formattingScore,
            formattingMatchMax: 100,
            total: ds.overallAts
        } : data.atsScoreBreakdown || null,
        summary: data.summary || '',
        competencyMatrix: ensureArray(data.competencyMatrix).map(c => ({
            skill: c.skill || "Core Competency",
            level: c.level || 5,
            benchmark: c.benchmark || "Senior Standard",
            category: c.category || "General",
            gap: c.gap || "Growth opportunity identified."
        })),
        atsAnalysis: {
            reasoning: data.atsAnalysis?.reasoning || {
                keywordRelevance: "High-density integration of industry-standard terms.",
                formattingCompatibility: "Clean, parsable structure detected.",
                sectionClarity: "Clear delineation of professional history.",
                measurableImpact: "Strong use of quantitative milestones."
            },
            resumeStructure: data.atsAnalysis?.resumeStructure || "Elite Professional",
            suggestions: ensureArray(data.atsAnalysis?.suggestions || ["Ensure consistent bullet formatting.", "Highlight specific cloud architecture milestones."]),
            issues: ensureArray(data.atsAnalysis?.issues)
        },
        jobMatchAnalysis: {
            skillMatch: data.jobMatchAnalysis?.skillMatch || { matched: [], missing: [] },
            experienceAlignment: data.jobMatchAnalysis?.experienceAlignment || "Aligned with target role benchmarks.",
            experienceQuality: data.jobMatchAnalysis?.experienceQuality || "High-caliber impact density.",
            recruiterVerdict: data.jobMatchAnalysis?.recruiterVerdict || "Exceptional Match"
        },
        mobileAnalysis: {
            superpowers: ensureArray(data.mobileAnalysis?.superpowers || data.strengths),
            demerits: ensureArray(data.mobileAnalysis?.demerits || data.weaknesses)
        },
        recommendedCourses: ensureArray(data.recommendedCourses).map(course => ({
            title: course.title || "Career Path",
            platform: course.platform || "Industry Leader",
            milestones: ensureArray(course.milestones),
            timeEstimate: course.timeEstimate || "Flexible"
        }))
    };
};

const normalizeRoast = (data) => ({
    breakdown: data.breakdown || (data.roastScore ? {
        contentScore: Math.round(data.roastScore * 0.25),
        atsScore: Math.round(data.roastScore * 0.25),
        impactScore: Math.round(data.roastScore * 0.25),
        skillsScore: Math.round(data.roastScore * 0.25)
    } : null),
    actionableIssues: ensureArray(data.actionableIssues).map(issue => ({
        problem: issue.problem || "Unquantified task statement.",
        location: issue.location || "Professional Experience",
        whyItMatters: issue.whyItMatters || "Fails to provide measurable proof of competency.",
        howToFix: issue.howToFix || "Add metrics and action verbs.",
        improvedExample: issue.improvedExample || "",
        priority: issue.priority || "High"
    })),
    jdAlignment: data.jdAlignment || null,
    weaknesses: ensureArray(data.weaknesses),
    priorityFixes: ensureArray(data.priorityFixes),
    rejectionRisks: ensureArray(data.rejectionRisks),
    brutalTruth: data.brutalTruth || data.overallVerdict || "",
    sections: [
        { title: "Visual & Structural Gaps", critique: safeJoin(data.weaknesses) || data.critique || "Formatting needs more executive breathability.", fix: safeJoin(data.priorityFixes) },
        { title: "Recruiter Dismissal Risks", critique: safeJoin(data.rejectionRisks) || "Generic bullets dilute the impact.", fix: "Optimize for high-speed scanning." },
        { title: "Executive Polish", critique: data.brutalTruth || "Decent foundation, lacks elite-grade punch.", fix: "Implement quantitative impact metrics." }
    ],
    overallVerdict: data.brutalTruth || "Decent foundation, lacks elite-grade punch.",
    roastScore: data.roastScore ?? data.burnScore ?? 50
});

const normalizeOptimization = (data, url) => {
    if (url.includes('rewrite')) {
        return {
            rewrittenBullets: data.rewrittenBullets || data.bullets || [],
            skillGapAnalysis: ensureArray(data.skillGapAnalysis),
            optimizedSkills: data.optimizedSkills || { core: [], tools: [], soft: [] },
            atsSummary: data.atsSummary || "",
            performanceMetrics: data.performanceMetrics || { before: 0, after: 0, delta: "0%" },
            overallAdvice: data.overallAdvice || ""
        };
    }

    if (url.includes('tailor')) {
        return {
            matchScore: data.matchScore || 0,
            keywordAnalysis: ensureArray(data.keywordAnalysis).map(k => ({
                keyword: k.keyword || "N/A",
                resumeDensity: k.resumeDensity || 0,
                jdImportance: k.jdImportance || "Medium"
            })),
            missingSkills: ensureArray(data.missingSkills),
            skillRelevance: data.skillRelevance || { technical: 0, domain: 0, soft: 0 },
            suggestedEdits: ensureArray(data.suggestedEdits),
            recruiterGapAnalysis: data.recruiterGapAnalysis || ""
        };
    }

    if (url.includes('linkedin')) {
        return {
            headline: data.headline || "",
            about: data.about || "",
            experience: data.experience || [],
            bannerConcept: data.bannerConcept || "",
            skillsToPin: data.skillsToPin || []
        };
    }

    if (url.includes('evaluate')) {
        const rawScore = data.score;
        const parsedScore = typeof rawScore === 'string'
            ? (parseInt(rawScore.replace(/[^0-9]/g, ''), 10) || 0)
            : (Number(rawScore) || 0);
        return {
            score: Math.min(100, Math.max(0, parsedScore)),
            verdict: data.verdict || (parsedScore >= 70 ? "Strong" : parsedScore >= 40 ? "Satisfactory" : "Needs Improvement"),
            feedback: data.feedback || "",
            missingKeywords: ensureArray(data.missingKeywords),
            improvementAreas: ensureArray(data.improvementAreas),
            starCheck: data.starCheck || {},
            improvedVersion: data.improvedVersion || ""
        };
    }

    return {
        coverLetter: data.coverLetter || data.fullLetter || "",
        toneAnalysis: data.toneAnalysis || "",
        keywordsIncluded: ensureArray(data.keywordsIncluded)
    };
};

// ── UNIFIED HANDLER ───────────────────────────────────────────────────────────
export const handleResumeRequest = async (req, res, promptBuilder, onSuccess) => {
    const requestId = req.id || generateRequestId();
    const requestStart = Date.now();

    // Structured per-request log — written to Winston on completion/failure
    const requestLog = {
        requestId,
        fileType: null,
        fileSizeBytes: null,
        extractedCharCount: null,
        ocrUsed: false,
        providerAttempts: [],
        cacheHit: null,
        retryCount: 0,
        validationPassed: false,
        totalDurationMs: null,
        success: false
    };

    let filePath = null;
    try {
        const file = req.file;
        let resumeText = req.body.resumeText || "";

        if (file) {
            requestLog.fileType = file.mimetype;
            requestLog.fileSizeBytes = file.size;
            if (file.size === 0) {
                throw new Error("File is empty (0 bytes). Please upload a valid resume.");
            }
            filePath = file.path;
            resumeText = await extractText(file);
        }

        requestLog.extractedCharCount = resumeText?.length || 0;

        // Guard: check if file or text was provided
        if (!file && (!resumeText || resumeText.trim().length === 0)) {
            throw new Error('No resume file or resume content was received by the server. Please select a resume file (PDF or DOCX) to upload.');
        }

        // Guard: reject if extracted text is too short to be a real resume
        if (!resumeText || resumeText.trim().length < 80) {
            throw new Error('Could not extract readable text from your file. Please upload a text-based PDF or DOCX (not a scanned image).');
        }

        const basePrompt = typeof promptBuilder === 'function'
            ? promptBuilder({ ...req.body, resumeText })
            : promptBuilder;

        const url = req.originalUrl.toLowerCase();

        let result = null;
        let retries = 1;
        let currentPrompt = basePrompt;

        while (retries >= 0) {
            // Check if connection was closed or timed out before calling AI
            if ((req.isTimedOut && req.isTimedOut()) || req.isClientClosed || res.headersSent || res.writableEnded) {
                logger.warn(`[AI] [${requestId}] Client disconnected or timed out. Halting AI processing.`);
                return;
            }

            result = await callAI(currentPrompt, requestLog);

            if (!result || result.error) {
                if (result?.error === "QUOTA_EXHAUSTED") {
                    throw new Error("All configured AI providers have exhausted their daily quotas. Please try again tomorrow.");
                }
                if (retries > 0) {
                    requestLog.retryCount++;
                    logger.warn(`[AI] Validation or parse failed. Retrying... (${retries} left)`);
                    currentPrompt = basePrompt + "\n\nCRITICAL: You failed to provide valid JSON in the correct schema. You MUST return strictly valid JSON matching the requested structure.";
                    retries--;
                    continue;
                }
                throw new Error("All AI providers failed to return a valid response. Please try again in a moment.");
            }

            // Validate against schema based on URL
            let parsed = null;
            if (url.includes('analyze'))     parsed = analyzeSchema.safeParse(result);
            else if (url.includes('roast'))  parsed = roastSchema.safeParse(result);
            else                             parsed = optimizeSchema.safeParse(result);

            if (parsed && parsed.success) {
                result = parsed.data;
                requestLog.validationPassed = true;
                break; // Valid!
            } else {
                logger.warn('[AI Validation] Schema mismatch: %O', parsed?.error);
                if (retries > 0) {
                    requestLog.retryCount++;
                    currentPrompt = basePrompt + "\n\nCRITICAL: Your JSON did not match the requested schema. Please strictly adhere to the provided schema.";
                    retries--;
                    continue; // Retry
                }

                // Exhausted retries — safe fallback
                logger.warn('[AI] Exhausted retries. Applying safe fallback.');
                if (url.includes('roast')) {
                    result = {
                        weaknesses: ["Unable to analyze due to AI validation error."],
                        critique: "The AI parser failed to validate the response.",
                        priorityFixes: ["Please try submitting the document again."],
                        rejectionRisks: ["Formatting was not parseable."],
                        brutalTruth: "System error: Failed to parse AI JSON.",
                        roastScore: 0
                    };
                } else if (url.includes('analyze')) {
                    result = {
                        extractedFeatures: {},
                        summary: "Analysis failed due to AI output mismatch. Returning original document text.",
                        atsAnalysis: { suggestions: ["Try re-uploading the resume."] }
                    };
                } else {
                    result = {
                        rewrittenBullets: [],
                        overallAdvice: "AI optimization failed due to formatting issues. Please try again."
                    };
                }
                break;
            }
        }

        if ((req.isTimedOut && req.isTimedOut()) || req.isClientClosed || res.headersSent || res.writableEnded) {
            logger.warn(`[AI] [${requestId}] Skipping response delivery: client disconnected or timed out.`);
            return;
        }

        if (url.includes('analyze')) {
            result = normalizeAnalysis(result);

            // Detect empty/useless analysis — all-zero scores with no candidate name or summary
            const hasContent = result.atsScore > 0
                || result.jobMatchScore > 0
                || (result.candidateName && result.candidateName !== 'Candidate')
                || (result.summary && result.summary.length > 50);

            if (!hasContent) {
                throw new Error(
                    'We couldn\'t generate a meaningful analysis for this resume. ' +
                    'Your file was uploaded successfully, but the AI service returned empty results. ' +
                    'Please try again, or re-upload as a DOCX file for best compatibility.'
                );
            }
        } else if (url.includes('roast')) {
            result = normalizeRoast(result);
        } else if (url.includes('rewrite') || url.includes('linkedin') || url.includes('tailor') || url.includes('cover-letter') || url.includes('coverletter')) {
            result = normalizeOptimization(result, url);
        }

        if (onSuccess) await onSuccess(result, req.body);

        requestLog.success = true;
        requestLog.totalDurationMs = Date.now() - requestStart;
        logger.info('[Request Complete] requestId=%s duration=%dms provider_attempts=%d cache=%s',
            requestLog.requestId, requestLog.totalDurationMs,
            requestLog.providerAttempts.length, requestLog.cacheHit || 'none');

        if (!res.headersSent && !res.writableEnded) {
            res.json({ ...result, raw: resumeText, requestId: requestLog.requestId });
        }

    } catch (error) {
        requestLog.totalDurationMs = Date.now() - requestStart;
        logger.error('[Request Failed] requestId=%s error=%s duration=%dms attempts=%d',
            requestLog.requestId, error.message, requestLog.totalDurationMs,
            requestLog.providerAttempts.length);

        if (res.headersSent || res.writableEnded) {
            return;
        }

        const isClientFileError = error.message && (
            error.message.includes('PDF') ||
            error.message.includes('image') ||
            error.message.includes('scanned') ||
            error.message.includes('readable text') ||
            error.message.includes('empty') ||
            error.message.includes('DOCX') ||
            error.message.includes('Unsupported file')
        );

        const httpStatus = isClientFileError ? 400 : 500;
        res.status(httpStatus).json({
            error: error.message,
            code: isClientFileError ? 'UNSUPPORTED_OR_SCANNED_FILE' : 'AI_PROCESSING_ERROR',
            requestId: requestLog.requestId
        });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            setTimeout(() => fs.unlink(filePath, () => {}), 1000);
        }
    }
};
