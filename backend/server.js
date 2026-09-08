import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load env FIRST — before any other imports that read process.env
dotenv.config();

// ── Environment Guard ─────────────────────────────────────────────────────────
// JWT_SECRET is always required (authentication).
// At least ONE AI provider key is required for analysis to work.
// The system gracefully falls back across providers — you don't need all three.
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
import connectDB from './config/db.js';
import { getHistory, clearHistory } from './utils/historyManager.js';
import { requireAuth } from './middleware/auth.js';
import { timeoutMiddleware } from './middleware/timeout.js';

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

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Core Middleware (CORS & Body Parsing) ─────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
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

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) || 
                          allowedOrigins.includes('*') ||
                          /\.vercel\.app$/i.test(origin) ||
                          (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) ||
                          (process.env.NODE_ENV !== 'production' && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin));
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger (Winston) ──────────────────────────────────────────────────
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
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
        connectSrc: ["'self'", "https://api.groq.com", "https://openrouter.ai", "https://generativelanguage.googleapis.com", "http://localhost:5000", "ws://localhost:5173", "http://localhost:5173"],
        imgSrc: ["'self'", "data:", "blob:", "https://*"],
        objectSrc: ["'none'"]
    }
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_LIMITS_GLOBAL || '100', 10), // Limit each IP to X requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 25, // Limit each IP to 25 AI analyses/evaluations per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests from this IP, please try again after an hour.' }
});

// Strict limiter for auth endpoints — prevents brute force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_LIMITS_AUTH || (process.env.NODE_ENV === 'production' ? '10' : '100'), 10),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts
    message: { error: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.' }
});

const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Limit each IP to 50 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests to admin panel. Please try again after 5 minutes.' }
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_LIMITS_FORGOT_PW || (process.env.NODE_ENV === 'production' ? '5' : '50'), 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many password recovery requests from this IP. Please wait 15 minutes before trying again.' }
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_LIMITS_RESET_PW || (process.env.NODE_ENV === 'production' ? '10' : '100'), 10),
    standardHeaders: true,
    legacyHeaders: false,
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

// ── Health Check ──────────────────────────────────────────────────────────────
const healthHandler = (req, res) => {
    const providerOrder = (process.env.AI_PROVIDER_ORDER || 'gemini,groq,openrouter').split(',').map(p => p.trim());
    res.json({
        status: 'operational',
        service: 'ResuLens API',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        databaseConnected: !!global.isMongoConnected,
        databaseError: global.mongoError || null,
        providers: {
            gemini:      { configured: !!process.env.GEMINI_API_KEY,      model: process.env.GEMINI_MODEL      || 'gemini-2.0-flash' },
            groq:        { configured: !!process.env.GROQ_API_KEY,        model: process.env.GROQ_MODEL        || 'llama-3.3-70b-versatile (auto)' },
            openRouter:  { configured: !!process.env.OPENROUTER_API_KEY,  model: process.env.OPENROUTER_MODEL  || 'google/gemma-4-31b-it:free (auto)' }
        },
        providerOrder
    });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ── Serve Frontend Static Files (Single Host) ─────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
const hasFrontendBuild = fs.existsSync(path.join(frontendDist, 'index.html'));

if (hasFrontendBuild) {
    app.use(express.static(frontendDist));
} else {
    app.get('/', healthHandler);
}

// ── API Routes ────────────────────────────────────────────────────────────────
// File extraction alone is permitted to take up to 180 seconds.  The former
// 120-second API timeout therefore cut off cache-miss analyses before the AI
// response could be returned.  Keep this below the frontend's 300-second
// request timeout, so the server can return a useful error first.
const aiTimeout = timeoutMiddleware(parseInt(process.env.AI_REQUEST_TIMEOUT_SECONDS || '270', 10));

app.use('/api/auth', authRoute);
app.use('/api/admin', requireAuth, adminRoute);
app.use('/api/analyze', requireAuth, aiTimeout, analyzeRoute);
app.use('/api/rewrite', requireAuth, aiTimeout, rewriteRoute);
app.use('/api/cover-letter', requireAuth, aiTimeout, coverLetterRoute);
app.use('/api/interview', requireAuth, aiTimeout, interviewRoute);
app.use('/api/tailor', requireAuth, aiTimeout, tailorRoute);
app.use('/api/skills', requireAuth, aiTimeout, skillsRoute);
app.use('/api/roast', requireAuth, aiTimeout, roastRoute);
app.use('/api/user-resumes', requireAuth, userResumesRoute);
app.use('/api/salary', requireAuth, aiTimeout, salaryRoute);
app.use('/api/market', requireAuth, aiTimeout, marketRoute);
app.use('/api/linkedin', requireAuth, aiTimeout, linkedinRoute);
app.use('/api/email', requireAuth, aiTimeout, emailRoute);
app.use('/api/builder', requireAuth, builderRoute);
app.use('/api/resumes', requireAuth, savedResumesRoute);

// ── History Routes (Strict JWT Protected) ─────────────────────────────────────
app.get('/api/history', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const history = await getHistory(userId);
        res.json(history);
    } catch (err) {
        logger.error('Failed to fetch history: %O', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.delete('/api/history', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        await clearHistory(userId);
        res.json({ success: true });
    } catch (err) {
        logger.error('Failed to clear history: %O', err);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// ── SPA Fallback (Single Host) ────────────────────────────────────────────────
if (hasFrontendBuild) {
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health') return next();
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global Error Handler (must be LAST) ──────────────────────────────────────
app.use((err, req, res, next) => {
    logger.error('[Global Error] %O', err);
    
    // Check if it's a validation error or Multer-specific limits error
    const isClientError = (err.status >= 400 && err.status < 500) || 
                          err.name === 'MulterError' || 
                          (err.message && err.message.includes('Only PDF and DOCX files are allowed'));
                          
    let errorMessage = err.message;
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'File size exceeds the 5MB limit.';
    }

    res.status(err.status || (isClientError ? 400 : 500)).json({
        error: (process.env.NODE_ENV === 'production' && !isClientError) 
            ? 'Internal server error' 
            : errorMessage
    });
});

// ── Server Bootstrap ──────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    logger.info(`🔍 ResuLens API running on Port ${PORT}`);
    logger.info(`Provider order:        ${process.env.AI_PROVIDER_ORDER || 'gemini,groq,openrouter'} (configurable via AI_PROVIDER_ORDER)`);
    logger.info(`Gemini (Primary):      ${process.env.GEMINI_API_KEY      ? '✅ Active' : '⚠️  Not configured'}`);
    logger.info(`Groq (Fallback 1):     ${process.env.GROQ_API_KEY        ? '✅ Active' : '⚠️  Not configured'}`);
    logger.info(`OpenRouter (Fallback): ${process.env.OPENROUTER_API_KEY  ? '✅ Active' : '⚠️  Not configured'}`);
});

server.keepAliveTimeout = 300000;
server.headersTimeout = 305000;
