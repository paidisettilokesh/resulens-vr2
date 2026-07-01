import Analysis from '../models/Analysis.js';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSecureStorageDir } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const historyCache = new Map();

// Move fallback and uploads outside project to prevent watch-mode restarts
const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'history_fallback.json');

// Ensure fallback directory exists
const ensureDir = async () => {
    try { await fs.mkdir(FALLBACK_DIR, { recursive: true }); } catch (e) { }
};

export const saveHistory = async (data, userId = 'guest') => {
    try {
        historyCache.delete(userId); // Invalidate cache
        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (global.isMongoConnected && isValidObjectId) {
            const newEntry = new Analysis({
                userId,
                jobRole: data.role || data.jobRole,
                type: data.type || 'analysis',
                candidateName: data.candidateName || data.analysis?.candidateName,
                atsScore: data.atsScore || data.analysis?.atsScore,
                jobMatchScore: data.jobMatchScore || data.analysis?.jobMatchScore,
                summary: data.summary || data.analysis?.summary,
                details: data
            });
            await newEntry.save();
            return newEntry;
        } else {
            // FALLBACK TO JSON
            await ensureDir();
            let history = [];
            try {
                const fileData = await fs.readFile(FALLBACK_FILE, 'utf8');
                history = JSON.parse(fileData);
            } catch (e) { }

            const newEntry = {
                _id: Date.now().toString(),
                userId,
                timestamp: new Date().toISOString(),
                ...data
            };
            history.unshift(newEntry);
            await fs.writeFile(FALLBACK_FILE, JSON.stringify(history.slice(0, 50), null, 2));
            return newEntry;
        }
    } catch (error) {
        console.error("Failed to save history:", error);
    }
};

export const getHistory = async (userId = 'guest') => {
    try {
        if (historyCache.has(userId)) {
            return historyCache.get(userId);
        }

        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        let result = [];
        if (global.isMongoConnected && isValidObjectId) {
            result = await Analysis.find({ userId }).sort({ timestamp: -1 }).limit(50);
        } else {
            try {
                const fileData = await fs.readFile(FALLBACK_FILE, 'utf8');
                const history = JSON.parse(fileData);
                result = history.filter(h => h.userId === userId);
            } catch (e) { result = []; }
        }

        historyCache.set(userId, result);
        return result;
    } catch (e) {
        console.error("Failed to fetch history:", e);
        return [];
    }
};

export const clearHistory = async (userId = 'guest') => {
    try {
        historyCache.delete(userId); // Invalidate cache
        const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
        if (global.isMongoConnected && isValidObjectId) {
            await Analysis.deleteMany({ userId });
        } else {
            try {
                const fileData = await fs.readFile(FALLBACK_FILE, 'utf8');
                const history = JSON.parse(fileData);
                const filteredHistory = history.filter(h => h.userId !== userId);
                await fs.writeFile(FALLBACK_FILE, JSON.stringify(filteredHistory, null, 2));
            } catch (e) {
                await fs.writeFile(FALLBACK_FILE, '[]');
            }
        }
        return true;
    } catch (e) {
        console.error("Failed to clear history:", e);
        return false;
    }
};
