import express from 'express';
import Resume from '../models/Resume.js';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { getSecureStorageDir } from '../utils/storage.js';
import { waitForDb, isDbReady } from '../config/db.js';

const router = express.Router();

const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const RESUMES_FALLBACK_FILE = path.join(FALLBACK_DIR, 'resumes_fallback.json');

// Ensure fallback directory exists (dev only)
const ensureDir = async () => {
    try { await fs.mkdir(FALLBACK_DIR, { recursive: true }); } catch (e) { }
};

// Save local fallback resume (dev only)
const saveLocalResume = async (userId, resumeData) => {
    try {
        await ensureDir();
        let data = {};
        try {
            const fileData = await fs.readFile(RESUMES_FALLBACK_FILE, 'utf8');
            data = JSON.parse(fileData);
        } catch (e) {}
        data[userId] = resumeData;
        await fs.writeFile(RESUMES_FALLBACK_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("⚠️ BUILDER: Failed to save local resume fallback:", err.message);
    }
};

// Get local fallback resume (dev only)
const getLocalResume = async (userId) => {
    try {
        const fileData = await fs.readFile(RESUMES_FALLBACK_FILE, 'utf8');
        const data = JSON.parse(fileData);
        return data[userId] || null;
    } catch (err) {
        return null;
    }
};

// Save or Update Resume (Enterprise MongoDB Implementation)
router.post('/save', async (req, res) => {
    try {
        const userId = req.userId;
        const { resumeData } = req.body;
        const title = resumeData?.personal?.fullName || 'My Resume';

        if (!isDbReady() && process.env.MONGODB_URI) {
            await waitForDb(2500);
        }

        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (global.isMongoConnected && isValidObjectId) {
            const resume = await Resume.findOneAndUpdate(
                { userId, type: 'builder' },
                {
                    title,
                    content: resumeData,
                    userId
                },
                { new: true, upsert: true }
            );
            return res.json({ success: true, id: resume._id });
        }

        if (process.env.NODE_ENV === 'production' || process.env.MONGODB_URI) {
            res.set('Retry-After', '3');
            return res.status(503).json({
                error: 'Database is currently unavailable. Please retry saving in a few moments.',
                code: 'DATABASE_UNAVAILABLE',
                retryAfter: 3
            });
        }

        // Dev fallback
        await saveLocalResume(userId, resumeData);
        res.json({ success: true, id: 'local_fallback_id' });
    } catch (err) {
        console.error("Resume Save Error:", err.message);
        res.status(500).json({ error: 'Failed to save resume' });
    }
});

// Get User's Latest Resume
router.get('/latest', async (req, res) => {
    try {
        const userId = req.userId;

        if (!isDbReady() && process.env.MONGODB_URI) {
            await waitForDb(2500);
        }

        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (global.isMongoConnected && isValidObjectId) {
            const resume = await Resume.findOne({ userId, type: 'builder' }).sort({ updatedAt: -1 });
            return res.json(resume || { content: null });
        }

        if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI && !global.isMongoConnected) {
            res.set('Retry-After', '3');
            return res.status(503).json({
                error: 'Database is currently connecting. Please retry in a few moments.',
                code: 'DATABASE_UNAVAILABLE',
                retryAfter: 3
            });
        }

        // Guest / Local Dev fallback
        const localContent = await getLocalResume(userId);
        res.json({ content: localContent });
    } catch (err) {
        console.error("Failed to load latest resume:", err.message);
        res.status(500).json({ error: 'Failed to load resume session' });
    }
});

export default router;
