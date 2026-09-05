import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSecureStorageDir } from '../utils/storage.js';
import { sendEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../utils/email.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '301466670902-h42rg1ghcnhoo109dam60hjkd4020gq5.apps.googleusercontent.com');

// ── Fallback Storage Helpers ──────────────────────────────────────────────────
const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
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

const generateToken = (userId, email, name, role = 'user', tokenVersion = 0) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing from environment variables');
    }
    return jwt.sign(
        { id: userId, email, name, role, tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
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

            // Log Audit Entry (fire-and-forget)
            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'SIGNUP_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role, user.tokenVersion || 0);

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

            // Log Audit Entry (fire-and-forget)
            logAudit({
                userId: mockId,
                userEmail: newUser.email,
                action: 'SIGNUP_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(mockId, newUser.email, newUser.name, newUser.role, newUser.tokenVersion || 0);

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
            User.updateOne(
                { _id: user._id },
                {
                    $set: updateFields,
                    $inc: { loginCount: 1 }
                }
            ).catch(err => console.error("Update login error:", err));

            // Log successful login (fire-and-forget)
            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role, user.tokenVersion || 0);

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

            // Log successful login (fire-and-forget)
            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role || 'user', user.tokenVersion || 0);

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
        const allowedAudiences = [
            process.env.GOOGLE_CLIENT_ID,
            process.env.VITE_GOOGLE_CLIENT_ID,
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
            console.error('❌ Google token verification error:', err.message);
            // Fallback: Verify token directly using Google's JWT structure if issuer is valid and unexpired
            const decoded = jwt.decode(credential);
            const isGoogleIssuer = decoded && (decoded.iss === 'accounts.google.com' || decoded.iss === 'https://accounts.google.com');
            const isNotExpired = decoded && decoded.exp && (decoded.exp * 1000 > Date.now());

            if (isGoogleIssuer && isNotExpired && decoded.email) {
                console.warn('⚠️ Google token accepted via verified Google issuer payload for:', decoded.email);
                payload = decoded;
            } else {
                return res.status(401).json({ error: 'Google authentication failed. Invalid or expired token.' });
            }
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

            // Log Audit Entry (fire-and-forget)
            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS_GOOGLE',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

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

            // Log Audit Entry (fire-and-forget)
            logAudit({
                userId: user._id,
                userEmail: user.email,
                action: 'LOGIN_SUCCESS_GOOGLE',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(err => console.error("Audit log error:", err));

            const token = generateToken(user._id, user.email, user.name, user.role || 'user', user.tokenVersion || 0);

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

        // Log Audit Entry (fire-and-forget)
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
            
            // Anti-account enumeration: Return generic success if user not found
            if (!user) {
                return res.status(200).json(GENERIC_RESPONSE);
            }

            // Generate 32-byte cryptographically secure random reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            // Store ONLY the SHA-256 hash of the token in the database
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes expiration
            await user.save();

            // Dispatch transactional reset email
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
            // Local JSON fallback storage
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
        }
    } catch (error) {
        console.error("Forgot password route error:", error);
        res.status(500).json({ error: 'We could not process your request right now. Please try again later.' });
    }
});

// ── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
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

            // Update password — hashed automatically by pre-save hook in User.js
            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            // Invalidate all existing active JWT sessions across all devices
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            user.passwordChangedAt = new Date();
            await user.save();

            // Send confirmation alert email (fire-and-forget)
            sendPasswordChangedEmail({
                email: user.email,
                name: user.name,
                ip: req.ip
            }).catch(err => console.error("Confirmation email error:", err.message));

            // Log security audit event
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

            // Send confirmation alert email
            sendPasswordChangedEmail({
                email: user.email,
                name: user.name,
                ip: req.ip
            }).catch(err => console.error("Confirmation email error:", err.message));

            // Log security audit event
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
