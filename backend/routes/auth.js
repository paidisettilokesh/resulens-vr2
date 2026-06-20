import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import bcrypt from 'bcryptjs';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Fallback Storage Helpers ──────────────────────────────────────────────────
const FALLBACK_DIR = path.join(os.tmpdir(), 'talentsync-v2-data');
const USERS_FALLBACK_FILE = path.join(FALLBACK_DIR, 'users_fallback.json');

// Ensure fallback directory exists
const ensureDir = async () => {
    try { await fs.mkdir(FALLBACK_DIR, { recursive: true }); } catch (e) { }
};

// Read fallback users
const getLocalUsers = async () => {
    try {
        await ensureDir();
        const fileData = await fs.readFile(USERS_FALLBACK_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (e) {
        return [];
    }
};

// Write fallback users
const saveLocalUsers = async (users) => {
    try {
        await ensureDir();
        await fs.writeFile(USERS_FALLBACK_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("⚠️ AUTH: Failed to save local users fallback:", err.message);
    }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateToken = (userId, email, name, role = 'user') => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing from environment variables');
    }
    return jwt.sign(
        { id: userId, email, name, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Simple field-level validation — no third-party lib required
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (pw) => typeof pw === 'string' && pw.length >= 8;
const escapeRegex = (string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        // Input validation
        const { email, password, name } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }
        if (!name || String(name).trim().length < 2) {
            return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }

        const emailClean = email.toLowerCase().trim();
        const isFounder = process.env.FOUNDER_EMAIL && emailClean === process.env.FOUNDER_EMAIL.toLowerCase().trim();

        if (global.isMongoConnected) {
            // Duplicate account check
            const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');
            const existing = await User.findOne({ email: emailRegex });
            if (existing) {
                return res.status(409).json({ error: 'An account with this email already exists.' });
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

            // Log Audit Entry
            await logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'SIGNUP_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            const token = generateToken(user._id, user.email, user.name, user.role);

            return res.status(201).json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role
            });
        } else {
            // FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            const existing = users.find(u => u.email && u.email.toLowerCase().trim() === emailClean);
            if (existing) {
                return res.status(409).json({ error: 'An account with this email already exists.' });
            }

            // Hash password
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

            // Log Audit Entry
            await logAudit({
                userId: mockId,
                userEmail: newUser.email,
                action: 'SIGNUP_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            const token = generateToken(mockId, newUser.email, newUser.name, newUser.role);

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
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        res.status(400).json({ error: error.message });
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Password is required.' });
        }

        const emailClean = email.toLowerCase().trim();
        const isFounder = process.env.FOUNDER_EMAIL && emailClean === process.env.FOUNDER_EMAIL.toLowerCase().trim();

        if (global.isMongoConnected) {
            // Explicitly select password back (schema has select: false) (case-insensitive query)
            const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');
            const user = await User.findOne({ email: emailRegex }).select('+password');
            if (!user) {
                // Log failed login
                await logAudit({
                    userEmail: emailClean,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'User not found' }
                });
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // Check account status
            if (user.status === 'suspended') {
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_SUSPENDED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
            }
            if (user.status === 'inactive') {
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_INACTIVE',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(403).json({ error: 'Your account is currently inactive.' });
            }

            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                // Log failed login
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'Invalid password' }
                });
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // Auto-bootstrap founder role if email matches
            const updateFields = {
                lastLoginAt: new Date()
            };
            if (isFounder && user.role !== 'founder') {
                user.role = 'founder';
                updateFields.role = 'founder';
            }

            // Update last login timestamp and increment loginCount in DB without saving/triggering pre-save hook
            await User.updateOne(
                { _id: user._id },
                {
                    $set: updateFields,
                    $inc: { loginCount: 1 }
                }
            );

            // Log successful login
            await logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            const token = generateToken(user._id, user.email, user.name, user.role);

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
            // FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            const user = users.find(u => u.email && u.email.toLowerCase().trim() === emailClean);
            if (!user) {
                // Log failed login
                await logAudit({
                    userEmail: emailClean,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'User not found' }
                });
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // Check account status
            if (user.status === 'suspended') {
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_SUSPENDED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
            }
            if (user.status === 'inactive') {
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_INACTIVE',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(403).json({ error: 'Your account is currently inactive.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                // Log failed login
                await logAudit({
                    userId: user._id,
                    userEmail: user.email,
                    action: 'LOGIN_FAILED',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    details: { reason: 'Invalid password' }
                });
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // Auto-bootstrap founder role in JSON fallback
            if (isFounder && user.role !== 'founder') {
                user.role = 'founder';
            }

            // Update last login timestamp and login count in local storage
            user.lastLoginAt = new Date().toISOString();
            user.loginCount = (user.loginCount || 0) + 1;
            await saveLocalUsers(users);

            // Log successful login
            await logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            const token = generateToken(user._id, user.email, user.name, user.role || 'user');

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
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'Google credential token is required.' });
        }

        let payload;
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        const isProduction = process.env.NODE_ENV === 'production';

        if (googleClientId) {
            // Production: verify token signature with Google
            try {
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: googleClientId,
                });
                payload = ticket.getPayload();
            } catch (err) {
                console.error('❌ Google token verification failed:', err.message);
                return res.status(401).json({ error: 'Google authentication failed. Invalid or expired token.' });
            }
        } else {
            // Development only: decode without verification
            if (isProduction) {
                console.error('❌ GOOGLE_CLIENT_ID is missing in production environment!');
                return res.status(500).json({ error: 'Google authentication is not configured on this server.' });
            }
            console.warn('⚠️ GOOGLE_CLIENT_ID not set — decoding without verification (development only).');
            payload = jwt.decode(credential);
        }

        if (!payload) {
            return res.status(400).json({ error: 'Failed to parse Google profile information.' });
        }

        const { sub: googleId, email, name, picture } = payload;
        if (!email) {
            return res.status(400).json({ error: 'Google account must have a visible email address.' });
        }

        const emailClean = email.toLowerCase().trim();
        const isFounder = process.env.FOUNDER_EMAIL && emailClean === process.env.FOUNDER_EMAIL.toLowerCase().trim();

        if (global.isMongoConnected) {
            // Find or create the user record (case-insensitive email lookup)
            const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');
            let user = await User.findOne({ $or: [{ googleId }, { email: emailRegex }] });

            if (user) {
                // Check account status
                if (user.status === 'suspended') {
                    await logAudit({
                        userId: user._id,
                        userEmail: user.email,
                        action: 'LOGIN_SUSPENDED_GOOGLE',
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                    return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
                }
                if (user.status === 'inactive') {
                    await logAudit({
                        userId: user._id,
                        userEmail: user.email,
                        action: 'LOGIN_INACTIVE_GOOGLE',
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                    return res.status(403).json({ error: 'Your account is currently inactive.' });
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

            // Log Audit Entry
            await logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS_GOOGLE',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            const token = generateToken(user._id, user.email, user.name, user.role);

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
            // FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            let user = users.find(u => u.googleId === googleId || (u.email && u.email.toLowerCase().trim() === emailClean));

            if (user) {
                // Check account status
                if (user.status === 'suspended') {
                    await logAudit({
                        userId: user._id,
                        userEmail: user.email,
                        action: 'LOGIN_SUSPENDED_GOOGLE',
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                    return res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
                }
                if (user.status === 'inactive') {
                    await logAudit({
                        userId: user._id,
                        userEmail: user.email,
                        action: 'LOGIN_INACTIVE_GOOGLE',
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                    return res.status(403).json({ error: 'Your account is currently inactive.' });
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

            // Log Audit Entry
            await logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS_GOOGLE',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            const token = generateToken(user._id, user.email, user.name, user.role || 'user');

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
        console.error('Google auth route error:', error);
        res.status(500).json({ error: 'Google authentication failed. Please try again.' });
    }
});

// ── POST /api/auth/guest ──────────────────────────────────────────────────────
router.post('/guest', async (req, res) => {
    try {
        const mockId = 'guest_' + Date.now();
        const token = generateToken(mockId, 'guest@resulens.ai', 'Guest User', 'user');

        // Log Audit Entry
        await logAudit({
            userId: mockId,
            userEmail: 'guest@resulens.ai',
            action: 'LOGIN_GUEST',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

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

export default router;
