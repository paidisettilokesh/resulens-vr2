import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import bcrypt from 'bcryptjs';

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

const generateToken = (userId, email, name) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing from environment variables');
    }
    return jwt.sign(
        { id: userId, email, name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Simple field-level validation — no third-party lib required
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (pw) => typeof pw === 'string' && pw.length >= 8;

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

        if (global.isMongoConnected) {
            // Duplicate account check
            const existing = await User.findOne({ email: email.toLowerCase().trim() });
            if (existing) {
                return res.status(409).json({ error: 'An account with this email already exists.' });
            }

            // Create user — password is hashed by the pre-save hook in User.js
            const user = new User({
                email: email.toLowerCase().trim(),
                password,
                name: String(name).trim()
            });
            await user.save();

            const token = generateToken(user._id, user.email, user.name);

            return res.status(201).json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan
            });
        } else {
            // FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            const emailLower = email.toLowerCase().trim();
            const existing = users.find(u => u.email === emailLower);
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
                email: emailLower,
                password: hashedPassword,
                plan: 'free',
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            await saveLocalUsers(users);

            const token = generateToken(mockId, newUser.email, newUser.name);

            return res.status(201).json({
                token,
                id: mockId,
                name: newUser.name,
                email: newUser.email,
                plan: newUser.plan
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

        if (global.isMongoConnected) {
            // Explicitly select password back (schema has select: false)
            const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
            if (!user) {
                // Generic message to prevent user enumeration
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // Update last login timestamp (save without triggering password re-hash)
            user.lastLoginAt = new Date();
            await user.save();

            const token = generateToken(user._id, user.email, user.name);

            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                picture: user.picture || ''
            });
        } else {
            // FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            const emailLower = email.toLowerCase().trim();
            const user = users.find(u => u.email === emailLower);
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // Update last login timestamp in local storage
            user.lastLoginAt = new Date().toISOString();
            await saveLocalUsers(users);

            const token = generateToken(user._id, user.email, user.name);

            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
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

        if (global.isMongoConnected) {
            // Find or create the user record
            let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

            if (user) {
                user.lastLoginAt = new Date();
                if (!user.googleId) user.googleId = googleId;
                if (picture && user.picture !== picture) user.picture = picture;
                if (name && user.name !== name) user.name = name;
                await user.save();
            } else {
                user = new User({
                    name: name || email.split('@')[0],
                    email: email.toLowerCase(),
                    googleId,
                    picture,
                    lastLoginAt: new Date()
                });
                await user.save();
            }

            const token = generateToken(user._id, user.email, user.name);

            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture || '',
                plan: user.plan
            });
        } else {
            // FALLBACK TO JSON USER STORAGE
            const users = await getLocalUsers();
            const emailLower = email.toLowerCase().trim();
            let user = users.find(u => u.googleId === googleId || u.email === emailLower);

            if (user) {
                user.lastLoginAt = new Date().toISOString();
                if (!user.googleId) user.googleId = googleId;
                if (picture && user.picture !== picture) user.picture = picture;
                if (name && user.name !== name) user.name = name;
            } else {
                user = {
                    _id: 'local_user_' + Math.random().toString(36).substr(2, 9),
                    name: name || email.split('@')[0],
                    email: emailLower,
                    googleId,
                    picture,
                    plan: 'free',
                    lastLoginAt: new Date().toISOString()
                };
                users.push(user);
            }
            await saveLocalUsers(users);

            const token = generateToken(user._id, user.email, user.name);

            return res.json({
                token,
                id: user._id,
                name: user.name,
                email: user.email,
                picture: user.picture || '',
                plan: user.plan
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
        const token = generateToken(mockId, 'guest@resulens.ai', 'Guest User');
        res.json({
            token,
            id: mockId,
            name: 'Guest User',
            email: 'guest@resulens.ai',
            plan: 'free'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to initialize guest session.' });
    }
});

export default router;
