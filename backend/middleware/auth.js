import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import { getSecureStorageDir } from '../utils/storage.js';

const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const USERS_FALLBACK_FILE = path.join(FALLBACK_DIR, 'users_fallback.json');

const getUserRole = async (userId) => {
    if (!userId) return 'user';
    if (global.isMongoConnected) {
        try {
            const user = await User.findById(userId);
            return user ? (user.role || 'user') : 'user';
        } catch (e) {
            return 'user';
        }
    } else {
        try {
            const fileData = await fs.readFile(USERS_FALLBACK_FILE, 'utf8');
            const users = JSON.parse(fileData);
            const user = users.find(u => u._id === userId);
            return user ? (user.role || 'user') : 'user';
        } catch (e) {
            return 'user';
        }
    }
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
                    return res.status(500).json({ error: 'Server authentication misconfigured: JWT_SECRET missing' });
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                req.userId = decoded.id;
                return next();
            }
        }

        // Set to guest/null if no token provided (allows public routes to proceed, but requireAuth will block them)
        req.userId = null;
        req.user = null;
        next();
    } catch (err) {
        console.warn('⚠️ AUTH MIDDLEWARE: Token verification failed:', err.message);
        return res.status(401).json({ error: `Authentication failed: ${err.message}` });
    }
};

/**
 * Middleware to enforce strict authentication
 */
export const requireAuth = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required' });
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
            return res.status(401).json({ error: 'Authentication required' });
        }
        const role = await getUserRole(req.userId);
        if (role !== 'admin' && role !== 'founder') {
            return res.status(403).json({ error: 'Access denied: Administrator privileges required' });
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
            return res.status(401).json({ error: 'Authentication required' });
        }
        const role = await getUserRole(req.userId);
        if (role !== 'founder') {
            return res.status(403).json({ error: 'Access denied: Founder privileges required' });
        }
        req.userRole = role;
        next();
    });
};
