import express from 'express';
import User from '../models/User.js';
import Analysis from '../models/Analysis.js';
import AuditLog from '../models/AuditLog.js';
import { requireAdmin, requireFounder } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLogger.js';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getSecureStorageDir } from '../utils/storage.js';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback configuration paths
const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const USERS_FALLBACK_FILE = path.join(FALLBACK_DIR, 'users_fallback.json');
const HISTORY_FALLBACK_FILE = path.join(FALLBACK_DIR, 'history_fallback.json');
const AUDIT_FALLBACK_FILE = path.join(FALLBACK_DIR, 'audit_fallback.json');

// Helper to read fallback files safely
const readFallbackFile = async (filePath) => {
    try {
        const fileData = await fs.readFile(filePath, 'utf8');
        return JSON.parse(fileData);
    } catch (e) {
        return [];
    }
};

// Helper to save fallback users
const saveLocalUsers = async (users) => {
    try {
        await fs.mkdir(FALLBACK_DIR, { recursive: true });
        await fs.writeFile(USERS_FALLBACK_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("⚠️ ADMIN: Failed to save local users fallback:", err.message);
    }
};

// ── POST /api/admin/verify-password ───────────────────────────────────────────
router.post('/verify-password', requireAdmin, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: "Password is required" });
        }

        let userRecord;
        if (global.isMongoConnected) {
            userRecord = await User.findById(req.userId).select('+password');
        } else {
            const users = await readFallbackFile(USERS_FALLBACK_FILE);
            userRecord = users.find(u => u._id === req.userId);
        }

        if (!userRecord || !userRecord.password) {
            return res.status(401).json({ error: "User authentication record not found" });
        }

        const isMatch = await bcrypt.compare(password, userRecord.password);
        if (!isMatch) {
            await logAudit({
                userId: req.userId,
                userEmail: userRecord.email,
                action: 'ADMIN_UNLOCK_FAILED',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            return res.status(401).json({ error: "Invalid password" });
        }

        await logAudit({
            userId: req.userId,
            userEmail: userRecord.email,
            action: 'ADMIN_UNLOCKED',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Admin Verify Password Error:", error);
        res.status(500).json({ error: "Failed to verify admin password" });
    }
});

// ── GET /api/admin/audit-logs ────────────────────────────────────────────────
router.get('/audit-logs', requireAdmin, async (req, res) => {
    try {
        if (global.isMongoConnected) {
            const logs = await AuditLog.find({})
                .sort({ timestamp: -1 })
                .limit(100);
            res.json(logs);
        } else {
            const logs = await readFallbackFile(AUDIT_FALLBACK_FILE);
            res.json(logs);
        }
    } catch (error) {
        console.error("Admin Audit Logs Fetch Error:", error);
        res.status(500).json({ error: "Failed to retrieve security audit logs" });
    }
});

// ── GET /api/admin/system/logs ────────────────────────────────────────────────
router.get('/system/logs', requireAdmin, async (req, res) => {
    try {
        const logPath = path.join(__dirname, '../logs/combined.log');
        let fileContent = '';
        try {
            fileContent = await fs.readFile(logPath, 'utf8');
        } catch (e) {
            // Check in parent logs dir fallback
            try {
                fileContent = await fs.readFile(path.join(__dirname, '../../logs/combined.log'), 'utf8');
            } catch (e2) {
                fileContent = 'Log file not found or is currently empty.';
            }
        }
        
        const lines = fileContent.trim().split('\n').filter(Boolean).slice(-50);
        
        // Sanitize sensitive information before sending logs to client
        const sanitizedLines = lines.map(line => {
            return line
                .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '[REDACTED EMAIL]') // Redact plain emails
                .replace(/(password|token|secret|key)["']?\s*[:=]\s*["']?[^"'\s,]+/gi, '$1: [REDACTED]') // Redact key-value secrets
                .replace(/(Bearer\s+)[A-Za-z0-9-._~+/]+=*/gi, '$1[REDACTED TOKEN]'); // Redact Bearer tokens
        });

        res.json({ logs: sanitizedLines });
    } catch (error) {
        console.error("System Log Read Error:", error);
        res.status(500).json({ error: "Failed to read system logs" });
    }
});

let analyticsCache = null;
let analyticsCacheTime = 0;

// ── GET /api/admin/analytics ──────────────────────────────────────────────────
router.get('/analytics', requireAdmin, async (req, res) => {
    try {
        if (analyticsCache && Date.now() - analyticsCacheTime < 60000) {
            return res.json(analyticsCache);
        }

        // 1. Calculate System Health Stats
        const system = {
            status: 'healthy',
            mongoConnected: global.isMongoConnected || false,
            uptime: Math.round(process.uptime()),
            memory: {
                rss: process.memoryUsage().rss,
                heapUsed: process.memoryUsage().heapUsed
            },
            nodeVersion: process.version,
            providers: {
                groq: !!process.env.GROQ_API_KEY,
                openRouter: !!process.env.OPENROUTER_API_KEY
            }
        };

        let totalUsers = 0;
        let active7 = 0;
        let active30Days = 0;
        let active90 = 0;
        let totalLogins = 0;
        let recentLogins = [];
        let growthTrend = [];
        let loginTrend = [];
        let featureUsage = {
            atsAnalysis: 0,
            rewrite: 0,
            interview: 0,
            coverLetter: 0,
            roast: 0,
            skills: 0,
            market: 0,
            linkedin: 0,
            email: 0,
            tailor: 0,
            other: 0
        };
        let activityTrend = [];

        // 2. Fetch User & Analytics Data based on Connection Mode
        if (global.isMongoConnected) {
            // MongoDB queries
            totalUsers = await User.countDocuments();
            
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

            active7 = await User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } });
            active30Days = await User.countDocuments({ lastLoginAt: { $gte: thirtyDaysAgo } });
            active90 = await User.countDocuments({ lastLoginAt: { $gte: ninetyDaysAgo } });

            const loginSum = await User.aggregate([
                { $group: { _id: null, total: { $sum: "$loginCount" } } }
            ]);
            totalLogins = loginSum[0]?.total || 0;

            recentLogins = await User.find({ lastLoginAt: { $exists: true } })
                .sort({ lastLoginAt: -1 })
                .limit(10)
                .select('name email role lastLoginAt loginCount plan status');

            // Generate user registration growth trend (last 7 days)
            for (let i = 6; i >= 0; i--) {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - i);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);

                const count = await User.countDocuments({ createdAt: { $gte: start, $lt: end } });
                growthTrend.push({
                    date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    registrations: count
                });
            }

            // Feature usage counts
            const knownFeatureTypes = ['analysis', 'rewrite', 'interview', 'coverLetter', 'roast', 'skills', 'market', 'linkedin', 'email', 'tailor'];
            featureUsage.atsAnalysis = await Analysis.countDocuments({ type: 'analysis' });
            featureUsage.rewrite = await Analysis.countDocuments({ type: 'rewrite' });
            featureUsage.interview = await Analysis.countDocuments({ type: 'interview' });
            featureUsage.coverLetter = await Analysis.countDocuments({ type: 'coverLetter' });
            featureUsage.roast = await Analysis.countDocuments({ type: 'roast' });
            featureUsage.skills = await Analysis.countDocuments({ type: 'skills' });
            featureUsage.market = await Analysis.countDocuments({ type: 'market' });
            featureUsage.linkedin = await Analysis.countDocuments({ type: 'linkedin' });
            featureUsage.email = await Analysis.countDocuments({ type: 'email' });
            featureUsage.tailor = await Analysis.countDocuments({ type: 'tailor' });

            const totalActions = await Analysis.countDocuments();
            const knownCount = Object.values(featureUsage).reduce((a, b) => a + b, 0);
            featureUsage.other = Math.max(0, totalActions - knownCount);

            // Generate activity trend (last 7 days)
            for (let i = 6; i >= 0; i--) {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - i);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);

                const count = await Analysis.countDocuments({ createdAt: { $gte: start, $lt: end } });
                activityTrend.push({
                    date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    actions: count
                });
            }

            // Generate login trend (last 7 days)
            for (let i = 6; i >= 0; i--) {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - i);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);

                const count = await AuditLog.countDocuments({
                    action: { $in: ['LOGIN_SUCCESS', 'LOGIN_SUCCESS_GOOGLE', 'LOGIN_GUEST'] },
                    timestamp: { $gte: start, $lt: end }
                });
                loginTrend.push({
                    date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    logins: count
                });
            }
        } else {
            // JSON Fallback calculation
            const users = await readFallbackFile(USERS_FALLBACK_FILE);
            const history = await readFallbackFile(HISTORY_FALLBACK_FILE);

            totalUsers = users.length;
            
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

            active7 = users.filter(u => u.lastLoginAt && (Date.now() - Date.parse(u.lastLoginAt)) <= sevenDaysMs).length;
            active30Days = users.filter(u => u.lastLoginAt && (Date.now() - Date.parse(u.lastLoginAt)) <= thirtyDaysMs).length;
            active90 = users.filter(u => u.lastLoginAt && (Date.now() - Date.parse(u.lastLoginAt)) <= ninetyDaysMs).length;

            totalLogins = users.reduce((acc, curr) => acc + (curr.loginCount || 0), 0);

            recentLogins = [...users]
                .filter(u => u.lastLoginAt)
                .sort((a, b) => Date.parse(b.lastLoginAt) - Date.parse(a.lastLoginAt))
                .slice(0, 10)
                .map(u => ({
                    _id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role || 'user',
                    plan: u.plan || 'free',
                    lastLoginAt: u.lastLoginAt,
                    loginCount: u.loginCount || 0,
                    status: u.status || 'active'
                }));

            // Generate growth trend (last 7 days)
            for (let i = 6; i >= 0; i--) {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - i);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);

                const count = users.filter(u => {
                    const date = u.createdAt ? new Date(u.createdAt) : new Date();
                    return date >= start && date < end;
                }).length;

                growthTrend.push({
                    date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    registrations: count
                });
            }

            // Feature usage calculation from history fallback JSON
            const knownFeatureTypes = ['analysis', 'rewrite', 'interview', 'coverLetter', 'roast', 'skills', 'market', 'linkedin', 'email', 'tailor'];
            history.forEach(h => {
                const type = h.type || 'analysis';
                if (!knownFeatureTypes.includes(type)) {
                    featureUsage.other++;
                } else if (type === 'analysis') {
                    featureUsage.atsAnalysis++;
                } else {
                    featureUsage[type] = (featureUsage[type] || 0) + 1;
                }
            });

            // Generate activity trend (last 7 days)
            for (let i = 6; i >= 0; i--) {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - i);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);

                const count = history.filter(h => {
                    const date = h.timestamp ? new Date(h.timestamp) : new Date();
                    return date >= start && date < end;
                }).length;

                activityTrend.push({
                    date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    actions: count
                });
            }

            // Generate login trend (last 7 days)
            const auditLogsLocal = await readFallbackFile(AUDIT_FALLBACK_FILE);
            for (let i = 6; i >= 0; i--) {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - i);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);

                const count = auditLogsLocal.filter(log => {
                    const date = log.timestamp ? new Date(log.timestamp) : new Date();
                    const isLogin = ['LOGIN_SUCCESS', 'LOGIN_SUCCESS_GOOGLE', 'LOGIN_GUEST'].includes(log.action);
                    return isLogin && date >= start && date < end;
                }).length;

                loginTrend.push({
                    date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    logins: count
                });
            }
        }

        const result = {
            users: {
                total: totalUsers,
                active7,
                active30Days,
                active90,
                totalLogins,
                growthTrend,
                recentLogins,
                loginTrend
            },
            usage: {
                featureUsage,
                activityTrend
            },
            system
        };

        analyticsCache = result;
        analyticsCacheTime = Date.now();
        res.json(result);

    } catch (error) {
        console.error("Admin Analytics Error:", error);
        res.status(500).json({ error: "Failed to load admin analytics statistics" });
    }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
    try {
        if (global.isMongoConnected) {
            const users = await User.find({})
                .sort({ createdAt: -1 })
                .select('name email role lastLoginAt loginCount plan createdAt status');
            res.json(users);
        } else {
            const users = await readFallbackFile(USERS_FALLBACK_FILE);
            const sortedUsers = [...users]
                .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''))
                .map(u => ({
                    _id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role || 'user',
                    plan: u.plan || 'free',
                    lastLoginAt: u.lastLoginAt,
                    loginCount: u.loginCount || 0,
                    createdAt: u.createdAt,
                    status: u.status || 'active'
                }));
            res.json(sortedUsers);
        }
    } catch (error) {
        console.error("Admin Users Listing Error:", error);
        res.status(500).json({ error: "Failed to load user directory" });
    }
});

// ── PUT /api/admin/users/:userId/role ─────────────────────────────────────────
router.put('/users/:userId/role', requireFounder, async (req, res) => {
    try {
        const { role } = req.body;
        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: "Invalid role specified. Role must be 'user' or 'admin'" });
        }

        let oldRole = '';
        let targetEmail = '';

        if (global.isMongoConnected) {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            if (user.role === 'founder') {
                return res.status(403).json({ error: "Founder credentials cannot be altered" });
            }
            oldRole = user.role || 'user';
            targetEmail = user.email;
            user.role = role;
            await user.save();
        } else {
            const users = await readFallbackFile(USERS_FALLBACK_FILE);
            const userIndex = users.findIndex(u => u._id === req.params.userId);
            if (userIndex === -1) {
                return res.status(404).json({ error: "User not found" });
            }
            if (users[userIndex].role === 'founder') {
                return res.status(403).json({ error: "Founder credentials cannot be altered" });
            }
            oldRole = users[userIndex].role || 'user';
            targetEmail = users[userIndex].email;
            users[userIndex].role = role;
            await saveLocalUsers(users);
        }

        // Log administrative role change event
        await logAudit({
            userId: req.userId,
            userEmail: req.user.email,
            action: 'ROLE_CHANGE',
            targetUserId: req.params.userId,
            targetUserEmail: targetEmail,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            details: { oldRole, newRole: role }
        });

        res.json({ success: true, message: `User role successfully updated to ${role}` });
    } catch (error) {
        console.error("Admin Role Change Error:", error);
        res.status(500).json({ error: "Failed to update user role" });
    }
});

// ── PUT /api/admin/users/:userId/status ───────────────────────────────────────
router.put('/users/:userId/status', requireFounder, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Must be 'active', 'inactive', or 'suspended'" });
        }

        if (req.params.userId === req.userId) {
            return res.status(400).json({ error: "You cannot alter your own owner account status" });
        }

        let oldStatus = '';
        let targetEmail = '';

        if (global.isMongoConnected) {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            if (user.role === 'founder') {
                return res.status(403).json({ error: "Cannot modify founder account status" });
            }
            oldStatus = user.status || 'active';
            targetEmail = user.email;
            user.status = status;
            await user.save();
        } else {
            const users = await readFallbackFile(USERS_FALLBACK_FILE);
            const userIndex = users.findIndex(u => u._id === req.params.userId);
            if (userIndex === -1) {
                return res.status(404).json({ error: "User not found" });
            }
            if (users[userIndex].role === 'founder') {
                return res.status(403).json({ error: "Cannot modify founder account status" });
            }
            oldStatus = users[userIndex].status || 'active';
            targetEmail = users[userIndex].email;
            users[userIndex].status = status;
            await saveLocalUsers(users);
        }

        // Log administrative status change event
        await logAudit({
            userId: req.userId,
            userEmail: req.user.email,
            action: `ACCOUNT_${status.toUpperCase()}`,
            targetUserId: req.params.userId,
            targetUserEmail: targetEmail,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            details: { oldStatus, newStatus: status }
        });

        res.json({ success: true, message: `Account status updated to ${status}` });
    } catch (error) {
        console.error("Admin Status Update Error:", error);
        res.status(500).json({ error: "Failed to update user status" });
    }
});

// ── DELETE /api/admin/users/:userId ───────────────────────────────────────────
router.delete('/users/:userId', requireFounder, async (req, res) => {
    try {
        if (req.params.userId === req.userId) {
            return res.status(400).json({ error: "You cannot delete your own founder owner account" });
        }

        let targetEmail = '';

        if (global.isMongoConnected) {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            if (user.role === 'founder') {
                return res.status(403).json({ error: "Cannot delete founder account" });
            }
            targetEmail = user.email;
            await User.findByIdAndDelete(req.params.userId);
        } else {
            const users = await readFallbackFile(USERS_FALLBACK_FILE);
            const userIndex = users.findIndex(u => u._id === req.params.userId);
            if (userIndex === -1) {
                return res.status(404).json({ error: "User not found" });
            }
            if (users[userIndex].role === 'founder') {
                return res.status(403).json({ error: "Cannot delete founder account" });
            }
            targetEmail = users[userIndex].email;
            users.splice(userIndex, 1);
            await saveLocalUsers(users);
        }

        // Log administrative deletion event
        await logAudit({
            userId: req.userId,
            userEmail: req.user.email,
            action: 'ACCOUNT_DELETED',
            targetUserId: req.params.userId,
            targetUserEmail: targetEmail,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ success: true, message: "User account deleted successfully" });
    } catch (error) {
        console.error("Admin User Deletion Error:", error);
        res.status(500).json({ error: "Failed to delete user account" });
    }
});

export default router;
