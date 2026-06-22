import express from 'express';
import Resume from '../models/Resume.js';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { getSecureStorageDir } from '../utils/storage.js';

const router = express.Router();

const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const RESUMES_FALLBACK_FILE = path.join(FALLBACK_DIR, 'resumes_fallback.json');

// Ensure fallback directory exists
const ensureDir = async () => {
    try { await fs.mkdir(FALLBACK_DIR, { recursive: true }); } catch (e) { }
};

// Save local fallback resume
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

// Get local fallback resume
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

        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (!global.isMongoConnected || !isValidObjectId) {
            console.warn("⚠️ BUILDER: Mongo offline. Saving to persistent JSON file.");
            await saveLocalResume(userId, resumeData);
            return res.json({ success: true, id: 'local_fallback_id' });
        }

        const resume = await Resume.findOneAndUpdate(
            { userId, type: 'builder' },
            {
                title,
                content: resumeData,
                userId
            },
            { new: true, upsert: true }
        );

        res.json({ success: true, id: resume._id });
    } catch (err) {
        console.error("Resume Save Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get User's Latest Resume
router.get('/latest', async (req, res) => {
    try {
        const userId = req.userId;

        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (!global.isMongoConnected || !isValidObjectId) {
            const localContent = await getLocalResume(userId);
            return res.json({ content: localContent });
        }

        const resume = await Resume.findOne({ userId, type: 'builder' }).sort({ updatedAt: -1 });

        res.json(resume || { content: null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
