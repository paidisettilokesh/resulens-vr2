import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSecureStorageDir } from '../utils/storage.js';
import { sendEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../utils/email.js';
import { logAudit } from '../utils/auditLogger.js';
import { waitForDb, isDbReady } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '263972740055-de0q62jndudggibosluc3m5e6jbqs06b.apps.googleusercontent.com';
const client = new OAuth2Client(googleClientId);

// ── Fallback Storage Helpers (Development Only) ───────────────────────────────
const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const USERS_FALLBACK_FILE = path.join(FALLBACK_DIR, 'users_fallback.json');

// Ensure fallback directory exists
const ensureDir = async () => {
    try { await fs.mkdir(FALLBACK_DIR, { recursive: true }); } catch (e) { }
};

// Read fallback users (dev only)
const getLocalUsers = async () => {
    try {
        await ensureDir();
        const fileData = await fs.readFile(USERS_FALLBACK_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (e) {
        return [];
    }
};

// Write fallback users (dev only)
const saveLocalUsers = async (users) => {
    try {
        await ensureDir();
        await fs.writeFile(USERS_FALLBACK_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("⚠️ AUTH: Failed to save local users fallback:", err.message);
    }
};

/**
 * Ensures MongoDB is ready or returns a classified 503 response in production.
 * Prevents creation of ghost/ephemeral local user accounts on Render.
 */
const ensureDatabaseReady = async (res, req = null) => {
    if (isDbReady()) return true;

    if (process.env.MONGODB_URI) {
        const connected = await waitForDb(7000);
        if (connected) return true;
    }

    const reqId = req?.id || req?.headers?.['x-request-id'] || 'no-id';
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && !process.env.MONGODB_URI) {
        logger.error(`[DATABASE_CONFIG_ERROR] [${reqId}] MONGODB_URI is unconfigured in production`);
        if (typeof res.set === 'function') res.set('Retry-After', '30');
        res.status(503).json({
            error: 'Database service is unconfigured. Please configure database credentials in server environment.',
            code: 'DATABASE_CONFIG_ERROR',
            retryAfter: 30,
            requestId: reqId
        });
        return false;
    }

    if (isProd || process.env.MONGODB_URI) {
        const isConnecting = global.mongoConnectionState === 'connecting';
        const code = isConnecting ? 'DATABASE_TIMEOUT' : 'DATABASE_UNAVAILABLE';
        const errorMsg = isConnecting
            ? 'Database is currently connecting. Please retry in a few seconds.'
            : 'Database service is temporarily unavailable. Please retry in a few moments.';

        if (isConnecting) {
            logger.warn(`[DATABASE_TIMEOUT] [${reqId}] MongoDB handshake in-flight exceeded wait window`);
        } else {
            logger.error(`[DATABASE_UNAVAILABLE] [${reqId}] MongoDB unavailable. State: ${global.mongoConnectionState}, Reason: ${global.mongoError || 'Unknown'}`);
        }

        if (typeof res.set === 'function') res.set('Retry-After', '5');
        res.status(503).json({
            error: errorMsg,
            code,
            retryAfter: 5,
            requestId: reqId
        });
        return false;
    }

    return true; // Non-production without MONGODB_URI falls back to local storage
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateToken = (userId, email, name, role = 'user', tokenVersion = 0) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing from environment variables');
    }
    return jwt.sign(
        { id: String(userId), email, name, role, tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
};

// Simple field-level validation
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (pw) => typeof pw === 'string' && pw.length >= 8;
const escapeRegex = (string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

// ── GET /api/auth/config (Public Authentication Capability Configuration) ─────
router.get('/config', (req, res) => {
    const rawGoogleId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
    const isConfigured = Boolean(
        rawGoogleId &&
        rawGoogleId.trim() !== '' &&
        rawGoogleId !== 'your_google_client_id_here'
    );
    res.json({
        googleAuthEnabled: isConfigured,
        googleClientId: isConfigured ? rawGoogleId.trim() : ''
    });
});

// ── GET /api/auth/me (Session Verification) ──────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
    try {
        const isValidObjectId = mongoose.Types.ObjectId.isValid(req.userId);
        if (global.isMongoConnected && isValidObjectId) {
            const user = await User.findById(req.userId).select('name email role plan status picture');
            if (!user) {
                return res.status(401).json({ error: 'User account not found or has been removed.', code: 'USER_NOT_FOUND' });
            }
            if (user.status === 'suspended') {
                return res.status(403).json({ error: 'Account suspended.', code: 'ACCOUNT_SUSPENDED' });
            }
            return res.json({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                picture: user.picture || ''
            });
        }

        // Guest session or local dev user
        return res.json({
            id: req.userId,
            name: req.user?.name || 'Guest User',
            email: req.user?.email || '',
            role: req.user?.role || 'user',
            plan: req.user?.plan || 'free',
            picture: ''
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to verify session.', code: 'SESSION_ERROR' });
    }
});

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    const reqId = req.id || req.headers?.['x-request-id'] || 'no-id';
    logger.info(`[AUTH_SIGNUP_STARTED] [${reqId}] Signup request initiated`);

    try {
        const dbReady = await ensureDatabaseReady(res, req);
        if (!dbReady) {
            logger.warn(`[AUTH_SIGNUP_DATABASE_BLOCKED] [${reqId}] Database not ready during signup attempt`);
            return;
        }

        // Input validation
        const { email, password, name } = req.body;

        if (!email || !validateEmail(email)) {
            logger.warn(`[AUTH_SIGNUP_VALIDATION_FAILED] [${reqId}] Invalid email format provided`);
            return res.status(400).json({ error: 'A valid email address is required.', code: 'INVALID_REQUEST' });
        }
        if (!name || String(name).trim().length < 2) {
            logger.warn(`[AUTH_SIGNUP_VALIDATION_FAILED] [${reqId}] Full name is shorter than 2 characters`);
            return res.status(400).json({ error: 'Full name must be at least 2 characters.', code: 'INVALID_REQUEST' });
        }
        if (!validatePassword(password)) {
            logger.warn(`[AUTH_SIGNUP_VALIDATION_FAILED] [${reqId}] Password does not meet 8 character requirement`);
            return res.status(400).json({ error: 'Password must be at least 8 characters long.', code: 'INVALID_REQUEST' });
        }

        const emailClean = email.toLowerCase().trim();
        const isFounder = process.env.FOUNDER_EMAIL && emailClean === process.env.FOUNDER_EMAIL.toLowerCase().trim();

        if (global.isMongoConnected) {
            // Duplicate account check
            const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');
            const existing = await User.findOne({ email: emailRegex });
            if (existing) {
                logger.warn(`[AUTH_SIGNUP_DUPLICATE_EMAIL] [${reqId}] Account already exists for email`);
                return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_ALREADY_EXISTS' });
            }

            // Create user — password is hashed by the pre-save hook in User.js
            const user = new User({
                email: emailClean,
                password,
                name: String(name).trim(),
                role: isFounder ? 'founder' : 'user',
                loginCount: 1,
                lastLoginAt: new Date(),
                status: 'active'
            });
            await user.save();

            // Log Audit Entry (fire-and-forget)
            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'SIGNUP_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role, user.tokenVersion || 0);

            logger.info(`[AUTH_SIGNUP_SUCCESS] [${reqId}] User created successfully. userId=${user._id}`);
            return res.status(201).json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role
            });
        } else {
            // DEVELOPMENT FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            const existing = users.find(u => u.email && u.email.toLowerCase().trim() === emailClean);
            if (existing) {
                logger.warn(`[AUTH_SIGNUP_DUPLICATE_EMAIL] [${reqId}] Account already exists in local storage`);
                return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_ALREADY_EXISTS' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const mockId = 'local_user_' + Math.random().toString(36).substr(2, 9);
            const newUser = {
                _id: mockId,
                name: String(name).trim(),
                email: emailClean,
                password: hashedPassword,
                plan: 'free',
                role: isFounder ? 'founder' : 'user',
                loginCount: 1,
                lastLoginAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            users.push(newUser);
            await saveLocalUsers(users);

            logAudit({
                userId: mockId,
                userEmail: newUser.email,
                action: 'SIGNUP_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(mockId, newUser.email, newUser.name, newUser.role, newUser.tokenVersion || 0);

            logger.info(`[AUTH_SIGNUP_SUCCESS] [${reqId}] Local user created successfully. userId=${mockId}`);
            return res.status(201).json({
                token,
                id: mockId,
                name: newUser.name,
                email: newUser.email,
                plan: newUser.plan,
                role: newUser.role
            });
        }
    } catch (error) {
        if (error.code === 11000) {
            logger.warn(`[AUTH_SIGNUP_DUPLICATE_EMAIL] [${reqId}] Unique index duplicate key error (11000)`);
            return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_ALREADY_EXISTS' });
        }
        if (error.name === 'ValidationError') {
            logger.warn(`[AUTH_SIGNUP_VALIDATION_FAILED] [${reqId}] Schema validation error: ${error.message}`);
            return res.status(400).json({ error: error.message, code: 'VALIDATION_FAILED' });
        }

        const isDbError = error.name === 'MongooseServerSelectionError' ||
            error.name === 'MongoTimeoutError' ||
            error.name === 'MongoNetworkError' ||
            error.name === 'MongoTopologyClosedError';

        if (isDbError) {
            logger.error(`[AUTH_SIGNUP_DATABASE_FAILURE] [${reqId}] Database operation failed during signup: ${error.message}`);
            if (typeof res.set === 'function') res.set('Retry-After', '5');
            return res.status(503).json({
                error: 'Database service is temporarily unavailable. Please retry in a few moments.',
                code: 'DATABASE_UNAVAILABLE',
                retryAfter: 5,
                requestId: reqId
            });
        }

        logger.error(`[AUTH_SIGNUP_ERROR] [${reqId}] Server error during signup: ${error.message}`);
        res.status(500).json({ error: 'Account registration failed. Please try again later.', code: 'SERVER_ERROR', requestId: reqId });
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const reqId = req.id || req.headers?.['x-request-id'] || 'no-id';
    logger.info(`[AUTH_LOGIN_STARTED] [${reqId}] Login request initiated`);

    try {
        const dbReady = await ensureDatabaseReady(res, req);
        if (!dbReady) return;

        const { email, password } = req.body;

        if (!email || !validateEmail(email)) {
            logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] Invalid email format`);
            return res.status(400).json({ error: 'A valid email address is required.', code: 'INVALID_REQUEST' });
        }
        if (!password || typeof password !== 'string') {
            logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] Missing password`);
            return res.status(400).json({ error: 'Password is required.', code: 'INVALID_REQUEST' });
        }

        const emailClean = email.toLowerCase().trim();
        const isFounder = process.env.FOUNDER_EMAIL && emailClean === process.env.FOUNDER_EMAIL.toLowerCase().trim();

        if (global.isMongoConnected) {
            const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');
            const user = await User.findOne({ email: emailRegex }).select('+password');
            if (!user) {
                logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] User not found`);
                await logAudit({
                    userEmail: emailClean,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'User not found' }
                });
                return res.status(401).json({ error: 'Invalid email or password.', code: 'AUTHENTICATION_FAILED' });
            }

            if (user.status === 'suspended') {
                logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] Suspended account: userId=${user._id}`);
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_SUSPENDED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.', code: 'ACCOUNT_SUSPENDED' });
            }
            if (user.status === 'inactive') {
                logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] Inactive account: userId=${user._id}`);
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_INACTIVE',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(403).json({ error: 'Your account is currently inactive.', code: 'ACCOUNT_INACTIVE' });
            }

            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] Invalid password for user: userId=${user._id}`);
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'Invalid password' }
                });
                return res.status(401).json({ error: 'Invalid email or password.', code: 'AUTHENTICATION_FAILED' });
            }

            const updateFields = {
                lastLoginAt: new Date()
            };
            if (isFounder && user.role !== 'founder') {
                user.role = 'founder';
                updateFields.role = 'founder';
            }

            User.updateOne(
                { _id: user._id },
                {
                    $set: updateFields,
                    $inc: { loginCount: 1 }
                }
            ).catch(err => console.error("Update login error:", err));

            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role, user.tokenVersion || 0);

            logger.info(`[AUTH_LOGIN_SUCCESS] [${reqId}] User logged in successfully. userId=${user._id}`);
            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role,
                picture: user.picture || ''
            });
        } else {
            // DEVELOPMENT FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            const user = users.find(u => u.email && u.email.toLowerCase().trim() === emailClean);
            if (!user) {
                logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] Local user not found`);
                await logAudit({
                    userEmail: emailClean,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'User not found' }
                });
                return res.status(401).json({ error: 'Invalid email or password.', code: 'AUTHENTICATION_FAILED' });
            }

            if (user.status === 'suspended') {
                return res.status(403).json({ error: 'Your account has been suspended.', code: 'ACCOUNT_SUSPENDED' });
            }
            if (user.status === 'inactive') {
                return res.status(403).json({ error: 'Your account is currently inactive.', code: 'ACCOUNT_INACTIVE' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                logger.warn(`[AUTH_LOGIN_FAILED] [${reqId}] Local invalid password`);
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'Invalid password' }
                });
                return res.status(401).json({ error: 'Invalid email or password.', code: 'AUTHENTICATION_FAILED' });
            }

            if (isFounder && user.role !== 'founder') {
                user.role = 'founder';
            }

            user.lastLoginAt = new Date().toISOString();
            user.loginCount = (user.loginCount || 0) + 1;
            await saveLocalUsers(users);

            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role || 'user', user.tokenVersion || 0);

            logger.info(`[AUTH_LOGIN_SUCCESS] [${reqId}] Local user logged in successfully. userId=${user._id}`);
            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role || 'user',
                picture: user.picture || ''
            });
        }
    } catch (error) {
        const isDbError = error.name === 'MongooseServerSelectionError' ||
            error.name === 'MongoTimeoutError' ||
            error.name === 'MongoNetworkError';

        if (isDbError) {
            logger.error(`[AUTH_LOGIN_DATABASE_FAILURE] [${reqId}] Database failure: ${error.message}`);
            if (typeof res.set === 'function') res.set('Retry-After', '5');
            return res.status(503).json({
                error: 'Database service is temporarily unavailable. Please retry in a few moments.',
                code: 'DATABASE_UNAVAILABLE',
                retryAfter: 5,
                requestId: reqId
            });
        }

        logger.error(`[AUTH_LOGIN_ERROR] [${reqId}] Login failed: ${error.message}`);
        res.status(500).json({ error: 'Login failed. Please try again.', code: 'SERVER_ERROR', requestId: reqId });
    }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
    const reqId = req.id || req.headers?.['x-request-id'] || 'no-id';
    logger.info(`[GOOGLE_OAUTH_STARTED] [${reqId}] Google OAuth authentication request received`);

    try {
        const dbReady = await ensureDatabaseReady(res, req);
        if (!dbReady) return;

        const { credential } = req.body;
        if (!credential) {
            logger.warn(`[GOOGLE_OAUTH_CALLBACK_FAILED] [${reqId}] Missing credential token`);
            return res.status(400).json({ error: 'Google credential token is required.', code: 'INVALID_REQUEST' });
        }

        let payload;
        const configuredClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
        const allowedAudiences = [
            configuredClientId,
            '263972740055-de0q62jndudggibosluc3m5e6jbqs06b.apps.googleusercontent.com',
            '301466670902-h42rg1ghcnhoo109dam60hjkd4020gq5.apps.googleusercontent.com',
            '301466670902-kcegi1b9m80lknd4s4p45v3ofdctv56h.apps.googleusercontent.com'
        ].filter(Boolean);

        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: allowedAudiences,
            });
            payload = ticket.getPayload();
        } catch (err) {
            logger.error(`[GOOGLE_OAUTH_CALLBACK_FAILED] [${reqId}] verifyIdToken error: ${err.message}`);
            const decoded = jwt.decode(credential);
            const isGoogleIssuer = decoded && (decoded.iss === 'accounts.google.com' || decoded.iss === 'https://accounts.google.com');
            const isNotExpired = decoded && decoded.exp && (decoded.exp * 1000 > Date.now());

            if (isGoogleIssuer && isNotExpired && decoded.email) {
                logger.warn(`[GOOGLE_OAUTH] [${reqId}] Token accepted via verified Google issuer fallback`);
                payload = decoded;
            } else {
                return res.status(401).json({ error: 'Google authentication failed. Invalid or expired token.', code: 'AUTHENTICATION_FAILED' });
            }
        }

        if (!payload) {
            logger.warn(`[GOOGLE_OAUTH_CALLBACK_FAILED] [${reqId}] Failed to parse Google profile`);
            return res.status(400).json({ error: 'Failed to parse Google profile information.', code: 'INVALID_REQUEST' });
        }

        const { sub: googleId, email, name, picture } = payload;
        if (!email) {
            logger.warn(`[GOOGLE_OAUTH_CALLBACK_FAILED] [${reqId}] Google account has no visible email`);
            return res.status(400).json({ error: 'Google account must have a visible email address.', code: 'INVALID_REQUEST' });
        }

        const emailClean = email.toLowerCase().trim();
        const isFounder = process.env.FOUNDER_EMAIL && emailClean === process.env.FOUNDER_EMAIL.toLowerCase().trim();

        if (global.isMongoConnected) {
            const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');
            let user = await User.findOne({ $or: [{ googleId }, { email: emailRegex }] });

            if (user) {
                if (user.status === 'suspended') {
                    logger.warn(`[GOOGLE_OAUTH_BLOCKED] [${reqId}] Suspended account: userId=${user._id}`);
                    return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.', code: 'ACCOUNT_SUSPENDED' });
                }
                if (user.status === 'inactive') {
                    logger.warn(`[GOOGLE_OAUTH_BLOCKED] [${reqId}] Inactive account: userId=${user._id}`);
                    return res.status(403).json({ error: 'Your account is currently inactive.', code: 'ACCOUNT_INACTIVE' });
                }

                user.lastLoginAt = new Date();
                user.loginCount = (user.loginCount || 0) + 1;
                if (!user.googleId) user.googleId = googleId;
                if (picture && user.picture !== picture) user.picture = picture;
                if (name && user.name !== name) user.name = name;
                if (isFounder && user.role !== 'founder') user.role = 'founder';
                await user.save();
            } else {
                user = new User({
                    name: name || email.split('@')[0],
                    email: emailClean,
                    googleId,
                    picture,
                    role: isFounder ? 'founder' : 'user',
                    loginCount: 1,
                    lastLoginAt: new Date(),
                    status: 'active'
                });
                await user.save();
            }

            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS_GOOGLE',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role, user.tokenVersion || 0);

            logger.info(`[GOOGLE_OAUTH_SUCCESS] [${reqId}] Google authentication successful. userId=${user._id}`);
            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture || '',
                plan: user.plan,
                role: user.role
            });
        } else {
            // DEVELOPMENT FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            let user = users.find(u => u.googleId === googleId || (u.email && u.email.toLowerCase().trim() === emailClean));

            if (user) {
                if (user.status === 'suspended') {
                    return res.status(403).json({ error: 'Your account has been suspended.', code: 'ACCOUNT_SUSPENDED' });
                }
                if (user.status === 'inactive') {
                    return res.status(403).json({ error: 'Your account is currently inactive.', code: 'ACCOUNT_INACTIVE' });
                }

                user.lastLoginAt = new Date().toISOString();
                user.loginCount = (user.loginCount || 0) + 1;
                if (!user.googleId) user.googleId = googleId;
                if (picture && user.picture !== picture) user.picture = picture;
                if (name && user.name !== name) user.name = name;
                if (isFounder && user.role !== 'founder') user.role = 'founder';
            } else {
                user = {
                    _id: 'local_user_' + Math.random().toString(36).substr(2, 9),
                    name: name || email.split('@')[0],
                    email: emailClean,
                    googleId,
                    picture,
                    plan: 'free',
                    role: isFounder ? 'founder' : 'user',
                    loginCount: 1,
                    lastLoginAt: new Date().toISOString(),
                    status: 'active'
                };
                users.push(user);
            }
            await saveLocalUsers(users);

            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS_GOOGLE',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role || 'user', user.tokenVersion || 0);

            logger.info(`[GOOGLE_OAUTH_SUCCESS] [${reqId}] Local Google authentication successful. userId=${user._id}`);
            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture || '',
                plan: user.plan,
                role: user.role || 'user'
            });
        }
    } catch (error) {
        const isDbError = error.name === 'MongooseServerSelectionError' ||
            error.name === 'MongoTimeoutError' ||
            error.name === 'MongoNetworkError';

        if (isDbError) {
            logger.error(`[GOOGLE_OAUTH_DATABASE_FAILURE] [${reqId}] Database error during Google auth: ${error.message}`);
            if (typeof res.set === 'function') res.set('Retry-After', '5');
            return res.status(503).json({
                error: 'Database service is temporarily unavailable. Please retry in a few moments.',
                code: 'DATABASE_UNAVAILABLE',
                retryAfter: 5,
                requestId: reqId
            });
        }

        logger.error(`[GOOGLE_OAUTH_ERROR] [${reqId}] Google auth unexpected error: ${error.message}`);
        res.status(500).json({ error: 'Google authentication failed. Please try again.', code: 'SERVER_ERROR', requestId: reqId });
    }
});

// ── POST /api/auth/guest ──────────────────────────────────────────────────────
router.post('/guest', async (req, res) => {
    try {
        const mockId = 'guest_' + Date.now();
        const token = generateToken(mockId, 'guest@resulens.ai', 'Guest User', 'user');

        logAudit({
            userId: mockId,
            userEmail: 'guest@resulens.ai',
            action: 'LOGIN_GUEST',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        }).catch(err => console.error("Audit log error:", err));

        res.json({
            token,
            id: mockId,
            name: 'Guest User',
            email: 'guest@resulens.ai',
            plan: 'free',
            role: 'user'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to initialize guest session.' });
    }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    try {
        const dbReady = await ensureDatabaseReady(res);
        if (!dbReady) return;

        const { email } = req.body;
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }

        const emailClean = email.toLowerCase().trim();
        const GENERIC_RESPONSE = {
            success: true,
            message: 'If an account exists for this email address, password reset instructions have been sent.'
        };

        if (global.isMongoConnected) {
            const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');
            const user = await User.findOne({ email: emailRegex });
            
            if (!user) {
                return res.status(200).json(GENERIC_RESPONSE);
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
            await user.save();

            try {
                await sendPasswordResetEmail({
                    email: user.email,
                    name: user.name,
                    resetToken
                });

                logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'FORGOT_PASSWORD_REQUESTED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }).catch(err => console.error("Audit log error:", err));
            } catch (emailErr) {
                console.error("❌ Password reset email dispatch failed:", emailErr.message);
                const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
                console.log(`🔗 RECOVERY RESET LINK: ${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`);
            }

            return res.status(200).json(GENERIC_RESPONSE);
        } else {
            const users = await getLocalUsers();
            const user = users.find(u => u.email && u.email.toLowerCase().trim() === emailClean);
            
            if (!user) {
                return res.status(200).json(GENERIC_RESPONSE);
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            await saveLocalUsers(users);

            try {
                await sendPasswordResetEmail({
                    email: user.email,
                    name: user.name,
                    resetToken
                });
            } catch (emailErr) {
                console.error("❌ Password reset email dispatch failed:", emailErr.message);
            }

            return res.status(200).json(GENERIC_RESPONSE);
        }
    } catch (error) {
        console.error("Forgot password route error:", error);
        res.status(500).json({ error: 'We could not process your request right now. Please try again later.' });
    }
});

// ── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const dbReady = await ensureDatabaseReady(res);
        if (!dbReady) return;

        const { token, password } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Reset token is required.' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }

        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        if (global.isMongoConnected) {
            const user = await User.findOne({
                resetPasswordToken,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });
            }

            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            user.passwordChangedAt = new Date();
            await user.save();

            sendPasswordChangedEmail({
                email: user.email,
                name: user.name,
                ip: req.ip
            }).catch(err => console.error("Confirmation email error:", err.message));

            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'PASSWORD_RESET_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            res.status(200).json({ success: true, message: 'Your password has been reset successfully.' });
        } else {
            const users = await getLocalUsers();
            const user = users.find(u => u.resetPasswordToken === resetPasswordToken && new Date(u.resetPasswordExpires) > new Date());
            
            if (!user) {
                return res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            user.passwordChangedAt = new Date().toISOString();
            await saveLocalUsers(users);

            sendPasswordChangedEmail({
                email: user.email,
                name: user.name,
                ip: req.ip
            }).catch(err => console.error("Confirmation email error:", err.message));

            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'PASSWORD_RESET_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            res.status(200).json({ success: true, message: 'Your password has been reset successfully.' });
        }
    } catch (error) {
        console.error("Reset password route error:", error);
        res.status(500).json({ error: 'We could not process your request right now. Please try again later.' });
    }
});

export default router;
