import axios from "axios";
import fs from "fs";
import crypto from "crypto";
import { extractText } from "./extractText.js";
import AICache from "../models/AICache.js";

// --- GROQ PROVIDER (Primary: Free, No Daily Limit, Ultra-Fast) ---
const callGroq = async (prompt) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;

    const models = [
        "llama-3.3-70b-versatile",
        "gemma2-9b-it",
        "llama-3.1-8b-instant",
        "llama3-70b-8192"
    ];

    for (const model of models) {
        try {
            console.log(`[Groq] Trying ${model}...`);
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model,
                    messages: [{ role: "user", content: prompt + "\n\nRETURN VALID JSON ONLY. No preamble, no markdown." }],
                    temperature: 0,
                    top_p: 1,
                    max_tokens: 1500
                },
                {
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 15000
                }
            );

            const content = response.data.choices?.[0]?.message?.content;
            if (!content) continue;

            try {
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                if (match) return JSON.parse(match[0]);
            }
        } catch (e) {
            const status = e.response?.status;
            console.error(`[Groq] ${model} failed: ${status || e.message}`);
            if (status === 429) {
                console.warn(`[Groq] Rate limited on ${model}, trying next...`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    return null;
};

// --- OPENROUTER PROVIDER (Fallback) ---
const callOpenRouter = async (prompt, model = "google/gemini-2.0-flash-lite-preview-02-05:free") => {
    const fallbacks = [
        "google/gemini-2.0-flash-lite-preview-02-05:free",
        "google/gemma-3-4b-it:free",
        "google/gemma-3-12b-it:free",
        "qwen/qwen3-4b:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "meta-llama/llama-3.2-3b-instruct:free"
    ];

    const tryModel = async (targetModel) => {
        try {
            const key = process.env.OPENROUTER_API_KEY;
            if (!key) return null;
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: targetModel,
                    messages: [{ role: "user", content: prompt + "\n\nRETURN VALID JSON ONLY. No preamble, no markdown." }],
                    temperature: 0,
                    top_p: 1,
                    max_tokens: 1500
                },
                {
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
                        "X-Title": "ResuLens",
                        "Content-Type": "application/json"
                    },
                    timeout: 20000
                }
            );
            const content = response.data.choices?.[0]?.message?.content;
            if (!content) return null;
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
            console.error(`[OpenRouter] ${targetModel} failed: ${status || 'TIMEOUT'} | ${msg}`);
            if (status === 429 && msg.includes("free-models-per-day")) {
                return { error: "QUOTA_EXHAUSTED" };
            }
        }
        return null;
    };

    // Try primary model first
    let result = await tryModel(model);
    if (result && !result.error) return result;
    if (result?.error === "QUOTA_EXHAUSTED") return result;

    // Fallback chain
    for (const fb of fallbacks) {
        if (fb === model) continue;
        result = await tryModel(fb);
        if (result && !result.error) return result;
        if (result?.error === "QUOTA_EXHAUSTED") return result;
    }
    return null;
};

// --- UNIFIED AI CALLER: Groq first, OpenRouter fallback ---
const localCache = new Map();

// Helper to hash prompt string
const getPromptHash = (prompt) => {
    return crypto.createHash('sha256').update(prompt).digest('hex');
};

export const callAI = async (prompt) => {
    const hash = getPromptHash(prompt);

    // 1. Check local in-memory cache first (ultrafast)
    if (localCache.has(hash)) {
        const cached = localCache.get(hash);
        if (cached.expiresAt > Date.now()) {
            console.log('[AI Cache] ⚡ Hit (Memory Cache)');
            return cached.response;
        }
        localCache.delete(hash); // Expired
    }

    // 2. Check MongoDB cache if connected
    if (global.isMongoConnected) {
        try {
            const cachedRecord = await AICache.findOne({ promptHash: hash });
            if (cachedRecord) {
                console.log('[AI Cache] ⚡ Hit (Database Cache)');
                // Hydrate local cache
                localCache.set(hash, {
                    response: cachedRecord.response,
                    expiresAt: cachedRecord.expiresAt.getTime()
                });
                return cachedRecord.response;
            }
        } catch (err) {
            console.error('[AI Cache] MongoDB cache query error:', err.message);
        }
    }

    // 3. Cache Miss: Execute actual API call
    console.log(`[AI] Attempting Groq (primary)...`);
    let result = await callGroq(prompt);

    if (!result) {
        console.warn(`[AI] Groq unavailable, falling back to OpenRouter...`);
        result = await callOpenRouter(prompt);
    }

    if (result && result.error === "QUOTA_EXHAUSTED") {
        return { error: "QUOTA_EXHAUSTED", message: "Both Groq and OpenRouter free daily limits are exhausted. Add a GROQ_API_KEY to .env or add OpenRouter credits." };
    }

    // 4. Save to caches if execution succeeded
    if (result) {
        const expiryDuration = 48 * 60 * 60 * 1000; // 48 Hours
        const expiresAt = Date.now() + expiryDuration;

        // Save in memory
        localCache.set(hash, { response: result, expiresAt });

        // Save in MongoDB if connected
        if (global.isMongoConnected) {
            try {
                await AICache.findOneAndUpdate(
                    { promptHash: hash },
                    {
                        promptHash: hash,
                        response: result,
                        expiresAt: new Date(expiresAt)
                    },
                    { upsert: true, new: true }
                );
            } catch (err) {
                console.error('[AI Cache] Failed to write cache to MongoDB:', err.message);
            }
        }
    }

    return result;
};


// --- FEATURE-SPECIFIC NORMALIZERS ---

// --- HELPERS ---
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

    return {
        candidateName: data.candidateName || data.name || 'Candidate',
        location: data.location || 'N/A',
        atsScore: parseScore(data.atsScore || data.score),
        jobMatchScore: parseScore(data.jobMatchScore || data.matchScore),
        recruiterInterest: parseScore(data.recruiterInterest),
        educationScore: parseScore(data.educationScore),
        experienceScore: parseScore(data.experienceScore),
        skillsMatch: parseScore(data.skillsMatch),
        atsScoreBreakdown: data.atsScoreBreakdown || null,
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
    sections: [
        { title: "Visual & Structural Gaps", critique: safeJoin(data.weaknesses) || data.critique || "Formatting needs more executive breathability.", fix: safeJoin(data.priorityFixes) },
        { title: "Recruiter Dismissal Risks", critique: safeJoin(data.rejectionRisks) || "Generic bullets dilute the impact.", fix: "Optimize for high-speed scanning." },
        { title: "Executive Polish", critique: data.brutalTruth || "Decent foundation, lacks elite-grade punch.", fix: "Implement quantitative impact metrics." }
    ],
    overallVerdict: data.brutalTruth || "Decent foundation, lacks elite-grade punch.",
    roastScore: data.roastScore || data.burnScore || 45
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
        return {
            score: data.score || 0,
            verdict: data.verdict || "Analysis Pending",
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

// --- UNIFIED HANDLER ---
export const handleResumeRequest = async (req, res, promptBuilder, onSuccess) => {
    let filePath = null;
    try {
        const file = req.file;
        let resumeText = req.body.resumeText || "";

        if (file) {
            filePath = file.path;
            resumeText = await extractText(file);
        }

        const prompt = typeof promptBuilder === 'function'
            ? promptBuilder({ ...req.body, resumeText })
            : promptBuilder;

        const url = req.originalUrl.toLowerCase();

        let result = await callAI(prompt);

        if (!result) {
            throw new Error("All AI providers failed. Please add a GROQ_API_KEY to your .env file or wait for your OpenRouter quota to reset.");
        }

        if (result.error === "QUOTA_EXHAUSTED") {
            throw new Error(result.message);
        }

        if (url.includes('analyze')) {
            result = normalizeAnalysis(result);
        } else if (url.includes('roast')) {
            result = normalizeRoast(result);
        } else if (url.includes('rewrite') || url.includes('linkedin') || url.includes('tailor') || url.includes('cover-letter') || url.includes('coverletter')) {
            result = normalizeOptimization(result, url);
        }

        if (onSuccess) await onSuccess(result, req.body);
        res.json({ ...result, raw: resumeText });

    } catch (error) {
        console.error("Handler Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            setTimeout(() => fs.unlink(filePath, () => { }), 1000);
        }
    }
};
