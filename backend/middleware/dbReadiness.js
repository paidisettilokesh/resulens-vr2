import { isDbReady, waitForDb } from '../config/db.js';

/**
 * Middleware ensuring database readiness for protected and persistent routes.
 * Eliminates startup race conditions by awaiting in-flight connections up to a short window,
 * and returns a controlled 503 Service Unavailable instead of silent, corrupted fallback data.
 */
export const requireDb = async (req, res, next) => {
    if (isDbReady()) {
        return next();
    }

    // If MongoDB URI is configured and connection is in-flight, give it up to 3 seconds to complete
    if (process.env.MONGODB_URI) {
        const connected = await waitForDb(3000);
        if (connected) {
            return next();
        }
    }

    // In production, or whenever MONGODB_URI is provided, MongoDB is authoritative.
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd || process.env.MONGODB_URI) {
        if (typeof res.set === 'function') {
            res.set('Retry-After', '3');
        } else if (typeof res.setHeader === 'function') {
            res.setHeader('Retry-After', '3');
        }
        return res.status(503).json({
            error: 'Database is currently initializing or temporarily unavailable. Please retry in a few seconds.',
            code: 'DATABASE_UNAVAILABLE',
            retryAfter: 3
        });
    }

    // In local dev without MONGODB_URI, allow route to handle local dev fallback
    next();
};

export const ensureDatabaseReady = requireDb;
export default requireDb;
