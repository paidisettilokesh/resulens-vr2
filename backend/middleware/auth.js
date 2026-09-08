import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import { getSecureStorageDir } from '../utils/storage.js';

const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const USERS_FALLBACK_FILE = path.join(FALLBACK_DIR, 'users_fallback.json');

const getUserRole = async (userId) => {
    if (!userId) return 'user';
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);

    if (global.isMongoConnected && isValidObjectId) {
        try {
            const user = await User.findById(userId);
            return user ? (user.role || 'user') : 'user';
        } catch (e) {
            return 'user';
        }
    } else if (process.env.NODE_ENV !== 'production') {
        try {
            const fileData = await fs.readFile(USERS_FALLBACK_FILE, 'utf8');
            const users = JSON.parse(fileData);
            const user = users.find(u => u._id === userId);
            return user ? (user.role || 'user') : 'user';
        } catch (e) {
            return 'user';
        }
    }
    return 'user';
};

/**
 * JWT Authentication Middleware
 * Validates JWT token strictly. Does NOT fall back to raw x-user-id.
 */
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token && token !== 'null' && token !== 'undefined') {
                if (!process.env.JWT_SECRET) {
                    return res.status(500).json({
                        error: 'Server authentication misconfigured: JWT_SECRET missing',
                        code: 'AUTH_MISCONFIGURED'
                    });
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                req.userId = decoded.id;
                return next();
            }
        }

        // Set to guest/null if no token provided
        req.userId = null;
        req.user = null;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Your session has expired. Please log in again.',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            error: `Authentication failed: ${err.message}`,
            code: 'TOKEN_INVALID'
        });
    }
};

const isSessionValid = async (userId, tokenVersion) => {
    if (!userId || String(userId).startsWith('guest_')) return true;

    try {
        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        let currentVersion = 0;

        if (global.isMongoConnected) {
            if (!isValidObjectId) {
                // Non-ObjectId user ID in a MongoDB production environment is invalid
                return process.env.NODE_ENV !== 'production';
            }
            const user = await User.findById(userId).select('tokenVersion status');
            if (!user) return false;
            if (user.status === 'suspended') return false;
            currentVersion = user.tokenVersion || 0;
        } else if (process.env.NODE_ENV !== 'production') {
            const fileData = await fs.readFile(USERS_FALLBACK_FILE, 'utf8');
            const users = JSON.parse(fileData);
            const user = users.find(u => u._id === userId);
            if (!user) return false;
            currentVersion = user.tokenVersion || 0;
        } else {
            // MongoDB is temporarily reconnecting in production.
            // Do NOT invalidate legitimate active user sessions during a brief database reconnect.
            return true;
        }

        const payloadVersion = tokenVersion ?? 0;
        return payloadVersion >= currentVersion;
    } catch (e) {
        return true; // Fail open on transient read error
    }
};

/**
 * Middleware to enforce strict authentication
 */
export const requireAuth = (req, res, next) => {
    authMiddleware(req, res, async () => {
        if (!req.userId) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        const valid = await isSessionValid(req.userId, req.user?.tokenVersion);
        if (!valid) {
            return res.status(401).json({
                error: 'Session expired or invalidated. Please log in again.',
                code: 'SESSION_INVALID'
            });
        }
        next();
    });
};

/**
 * Middleware to enforce Admin or Founder privileges
 */
export const requireAdmin = (req, res, next) => {
    authMiddleware(req, res, async () => {
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        const role = await getUserRole(req.userId);
        if (role !== 'admin' && role !== 'founder') {
            return res.status(403).json({ error: 'Access denied: Administrator privileges required', code: 'FORBIDDEN' });
        }
        req.userRole = role;
        next();
    });
};

/**
 * Middleware to enforce Founder-only privileges
 */
export const requireFounder = (req, res, next) => {
    authMiddleware(req, res, async () => {
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        const role = await getUserRole(req.userId);
        if (role !== 'founder') {
            return res.status(403).json({ error: 'Access denied: Founder privileges required', code: 'FORBIDDEN' });
        }
        req.userRole = role;
        next();
    });
};
