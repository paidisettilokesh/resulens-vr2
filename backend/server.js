import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load env FIRST — before any other imports that read process.env
dotenv.config();

// ── Environment Guard ─────────────────────────────────────────────────────────
const missingJwt = !process.env.JWT_SECRET;
const hasAnyAiKey = !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);

if (missingJwt) {
    console.error('❌ CRITICAL CONFIG ERROR: JWT_SECRET is required but not set.');
    process.exit(1);
}
if (!hasAnyAiKey) {
    console.error('❌ CRITICAL CONFIG ERROR: At least one AI provider key is required.');
    console.error('   Set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in your .env file.');
    process.exit(1);
}

// Winston Logger
import logger from './utils/logger.js';

// Utilities & Config
import connectDB, { isDbReady, getDbState } from './config/db.js';
import { getHistory, clearHistory } from './utils/historyManager.js';
import { requireAuth, authMiddleware } from './middleware/auth.js';
import { timeoutMiddleware } from './middleware/timeout.js';
import { requireDb } from './middleware/dbReadiness.js';

// Route Imports
import analyzeRoute from './routes/analyze.js';
import rewriteRoute from './routes/rewrite.js';
import coverLetterRoute from './routes/coverLetter.js';
import interviewRoute from './routes/interview.js';
import tailorRoute from './routes/tailor.js';
import skillsRoute from './routes/skills.js';
import authRoute from './routes/auth.js';
import marketRoute from './routes/market.js';
import linkedinRoute from './routes/linkedin.js';
import emailRoute from './routes/email.js';
import builderRoute from './routes/builder.js';
import roastRoute from './routes/roast.js';
import salaryRoute from './routes/salary.js';
import savedResumesRoute from './routes/savedResumes.js';
import userResumesRoute from './routes/userResumes.js';
import adminRoute from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust Proxy Configuration (Crucial for Render.com deployment) ─────────────
// Render deploys Node apps behind a reverse proxy/load balancer.
// Trusting proxy ensures req.ip and rate-limiting identify actual client IPs.
app.set('trust proxy', 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Request Correlation ID Middleware ─────────────────────────────────────────
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// ── Core Middleware (CORS & Body Parsing) ─────────────────────────────────────
const defaultAllowedOrigins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    'http://localhost:5175', 'http://127.0.0.1:5175',
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'https://mellow-donut-7a1825.netlify.app',
    'https://resulens.netlify.app',
    'https://agent-6a23b7a4e482b8eeb408e324--resulens.netlify.app',
    'https://resulens-vr2-yeti.vercel.app',
    'https://resulens-vr2-1btg.vercel.app'
];

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

// Specific regex matching official project preview deployments on Vercel
const vercelPreviewRegex = /^https:\/\/resulens-vr2-[a-z0-9-]+(-paidisettilokeshs-projects)?\.vercel\.app$/i;
const localDevRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.includes(origin) ||
                          allowedOrigins.includes('*') ||
                          vercelPreviewRegex.test(origin) ||
                          (process.env.NODE_ENV !== 'production' && localDevRegex.test(origin));

        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
            // Return false rather than Error to allow browser to handle preflight cleanly
            callback(null, false);
        }
    },
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parse auth token early so rate limiters and loggers know user ID
app.use(authMiddleware);

// ── Request Logger (Winston with Correlation ID) ──────────────────────────────
app.use((req, res, next) => {
    logger.info(`[${req.id}] ${req.method} ${req.originalUrl} - User: ${req.userId || 'guest'} - IP: ${req.ip}`);
    next();
});

// ── Security Headers (Helmet & CSP) ───────────────────────────────────────────
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.groq.com", "https://openrouter.ai", "https://generativelanguage.googleapis.com", "https://*.vercel.app", "http://localhost:5000", "ws://localhost:5173", "http://localhost:5173"],
        imgSrc: ["'self'", "data:", "blob:", "https://*"],
        objectSrc: ["'none'"]
    }
}));

// ── Smart Rate Limiting (Keyed by User ID for logged-in accounts) ─────────────
// Prevents multiple mobile users on shared Carrier-Grade NAT (CGNAT) or campus Wi-Fi
// from sharing the exact same rate limit threshold.
const getRateLimitKey = (req) => {
    if (req.userId && !String(req.userId).startsWith('guest_')) {
        return `user:${req.userId}`;
    }
    return `ip:${req.ip}`;
};

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_LIMITS_GLOBAL || '300', 10), // Increased to 300 to accommodate SPA health/user checks
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests. Please wait a moment and try again.',
            code: 'RATE_LIMIT_GLOBAL',
            requestId: req.id
        });
    }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.API_LIMITS_AI || '30', 10),
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'AI analysis hourly rate limit reached. Please try again in a little while.',
            code: 'RATE_LIMIT_AI',
            requestId: req.id
        });
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_LIMITS_AUTH || (process.env.NODE_ENV === 'production' ? '15' : '100'), 10),
    keyGenerator: (req) => `auth:${req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    validate: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
            code: 'RATE_LIMIT_AUTH',
            requestId: req.id
        });
    }
});

const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 60,
    keyGenerator: getRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Too many requests to admin panel. Please try again after 5 minutes.' }
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.API_LIMITS_FORGOT_PW || (process.env.NODE_ENV === 'production' ? '5' : '50'), 10),
    keyGenerator: (req) => `forgot:${req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Too many password recovery requests from this IP. Please wait 15 minutes before trying again.' }
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.API_LIMITS_RESET_PW || (process.env.NODE_ENV === 'production' ? '10' : '100'), 10),
    keyGenerator: (req) => `reset:${req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: 'Too many password reset attempts. Please wait 15 minutes before trying again.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/guest', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api/analyze', aiLimiter);
app.use('/api/rewrite', aiLimiter);
app.use('/api/interview', aiLimiter);
app.use('/api/cover-letter', aiLimiter);
app.use('/api/tailor', aiLimiter);
app.use('/api/roast', aiLimiter);
app.use('/api/skills', aiLimiter);
app.use('/api/market', aiLimiter);
app.use('/api/linkedin', aiLimiter);
app.use('/api/email', aiLimiter);
app.use('/api/salary', aiLimiter);

// ── Health & Readiness Endpoints (For Render monitoring & Frontend diagnostics)
const healthHandler = (req, res) => {
    const db = getDbState();
    const isStrictReadyCheck = req.query.ready === '1';

    // If strict readiness requested by orchestrator/deploy probe
    if (isStrictReadyCheck && process.env.MONGODB_URI && !db.connected) {
        return res.status(503).json({
            status: 'degraded',
            ready: false,
            database: db,
            message: 'Database not ready'
        });
    }

    const providerOrder = (process.env.AI_PROVIDER_ORDER || 'gemini,groq,openrouter').split(',').map(p => p.trim());
    res.json({
        status: db.connected || !process.env.MONGODB_URI ? 'operational' : 'degraded',
        service: 'ResuLens API',
        version: '2.5.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        databaseConnected: db.connected,
        databaseState: db.state,
        databaseError: db.error,
        providers: {
            gemini:      { configured: !!process.env.GEMINI_API_KEY,      model: process.env.GEMINI_MODEL      || 'gemini-2.0-flash' },
            groq:        { configured: !!process.env.GROQ_API_KEY,        model: process.env.GROQ_MODEL        || 'qwen/qwen3.8-27b (auto)' },
            openRouter:  { configured: !!process.env.OPENROUTER_API_KEY,  model: process.env.OPENROUTER_MODEL  || 'google/gemma-4-31b-it:free (auto)' }
        },
        providerOrder,
        requestId: req.id
    });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ── Serve Frontend Static Files (Single Host option) ──────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
const hasFrontendBuild = fs.existsSync(path.join(frontendDist, 'index.html'));

if (hasFrontendBuild) {
    app.use(express.static(frontendDist));
} else {
    app.get('/', healthHandler);
}

// ── API Routes with Timeouts and DB Readiness ─────────────────────────────────
// Keep backend timeout bounded below 95s so it returns a clean JSON error
// before reverse proxies (Render 100s timeout) terminate the idle TCP connection.
const aiTimeout = timeoutMiddleware(parseInt(process.env.AI_REQUEST_TIMEOUT_SECONDS || '85', 10));

app.use('/api/auth', requireDb, authRoute);
app.use('/api/admin', requireAuth, adminRoute);
app.use('/api/analyze', requireAuth, aiTimeout, analyzeRoute);
app.use('/api/rewrite', requireAuth, aiTimeout, rewriteRoute);
app.use('/api/cover-letter', requireAuth, aiTimeout, coverLetterRoute);
app.use('/api/interview', requireAuth, aiTimeout, interviewRoute);
app.use('/api/tailor', requireAuth, aiTimeout, tailorRoute);
app.use('/api/skills', requireAuth, aiTimeout, skillsRoute);
app.use('/api/roast', requireAuth, aiTimeout, roastRoute);
app.use('/api/user-resumes', requireDb, requireAuth, userResumesRoute);
app.use('/api/salary', requireAuth, aiTimeout, salaryRoute);
app.use('/api/market', requireAuth, aiTimeout, marketRoute);
app.use('/api/linkedin', requireAuth, aiTimeout, linkedinRoute);
app.use('/api/email', requireAuth, aiTimeout, emailRoute);
app.use('/api/builder', requireAuth, builderRoute);
app.use('/api/resumes', requireDb, requireAuth, savedResumesRoute);

// ── History Routes (Strict JWT & DB Protected) ────────────────────────────────
app.get('/api/history', requireDb, requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const history = await getHistory(userId);
        res.json(history);
    } catch (err) {
        logger.error(`[${req.id}] Failed to fetch history: %O`, err);
        res.status(500).json({ error: 'Failed to fetch history', requestId: req.id });
    }
});

app.delete('/api/history', requireDb, requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        await clearHistory(userId);
        res.json({ success: true, requestId: req.id });
    } catch (err) {
        logger.error(`[${req.id}] Failed to clear history: %O`, err);
        res.status(500).json({ error: 'Failed to clear history', requestId: req.id });
    }
});

// ── SPA Fallback ──────────────────────────────────────────────────────────────
if (hasFrontendBuild) {
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health') return next();
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.originalUrl}`,
        code: 'ROUTE_NOT_FOUND',
        requestId: req.id
    });
});

// ── Global Error Handler (Guaranteed last) ────────────────────────────────────
app.use((err, req, res, next) => {
    if (res.headersSent || res.writableEnded) {
        return;
    }

    logger.error(`[Global Error] [${req.id}] %O`, err);

    const isClientError = (err.status >= 400 && err.status < 500) ||
                          err.name === 'MulterError' ||
                          (err.message && err.message.includes('Only PDF and DOCX files are allowed'));

    let errorMessage = err.message;
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'File size exceeds the 5MB limit.';
    }

    const statusCode = err.status || (isClientError ? 400 : 500);

    // Sanitize production 500 error messages to prevent leakage of internal paths or secrets
    const safeMessage = (process.env.NODE_ENV === 'production' && statusCode >= 500)
        ? 'Internal server error. Please try again later.'
        : errorMessage;

    res.status(statusCode).json({
        error: safeMessage,
        code: err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
        requestId: req.id
    });
});

// ── Server Bootstrap with Startup Sequence ───────────────────────────────────
export const startServer = async () => {
    // Await initial MongoDB connection attempt before accepting requests
    await connectDB();

    const server = app.listen(PORT, () => {
        logger.info(`🔍 ResuLens API running on Port ${PORT}`);
        logger.info(`Provider order:        ${process.env.AI_PROVIDER_ORDER || 'gemini,groq,openrouter'}`);
        logger.info(`Gemini (Primary):      ${process.env.GEMINI_API_KEY      ? '✅ Active' : '⚠️  Not configured'}`);
        logger.info(`Groq (Fallback 1):     ${process.env.GROQ_API_KEY        ? '✅ Active' : '⚠️  Not configured'}`);
        logger.info(`OpenRouter (Fallback): ${process.env.OPENROUTER_API_KEY  ? '✅ Active' : '⚠️  Not configured'}`);
    });

    // Configure keepAliveTimeout slightly above Render reverse proxy idle timeout (60s)
    // Prevents proxy 502 race conditions on reused keep-alive connections
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    return server;
};

// Start automatically if executed directly
if (process.env.NODE_ENV !== 'test') {
    startServer().catch(err => {
        logger.error('Failed to start ResuLens backend server:', err);
    });
}

export default app;
