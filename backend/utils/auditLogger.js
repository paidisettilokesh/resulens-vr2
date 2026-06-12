import AuditLog from '../models/AuditLog.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import mongoose from 'mongoose';

const FALLBACK_DIR = path.join(os.tmpdir(), 'talentsync-v2-data');
const AUDIT_FALLBACK_FILE = path.join(FALLBACK_DIR, 'audit_fallback.json');

/**
 * Log a security or administrative action to the audit logs.
 */
export const logAudit = async ({
    userId = null,
    userEmail = '',
    action,
    targetUserId = null,
    targetUserEmail = '',
    ipAddress = '',
    userAgent = '',
    details = null
}) => {
    try {
        const ip = ipAddress || '';
        const ua = userAgent || '';

        if (global.isMongoConnected) {
            const entry = new AuditLog({
                userId: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
                userEmail,
                action,
                targetUserId: targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) ? targetUserId : null,
                targetUserEmail,
                ipAddress: ip,
                userAgent: ua,
                details
            });
            await entry.save();
        } else {
            await fs.mkdir(FALLBACK_DIR, { recursive: true });
            let logs = [];
            try {
                const data = await fs.readFile(AUDIT_FALLBACK_FILE, 'utf8');
                logs = JSON.parse(data);
            } catch (e) {}

            const entry = {
                _id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                userId: userId || null,
                userEmail,
                action,
                targetUserId: targetUserId || null,
                targetUserEmail,
                ipAddress: ip,
                userAgent: ua,
                details,
                timestamp: new Date().toISOString()
            };
            logs.unshift(entry);
            // Cap at 200 logs
            await fs.writeFile(AUDIT_FALLBACK_FILE, JSON.stringify(logs.slice(0, 200), null, 2));
        }
    } catch (err) {
        console.error("⚠️ AUDIT LOGGER ERROR:", err.message);
    }
};
