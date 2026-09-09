import { isDbReady, waitForDb } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware ensuring database readiness for protected and persistent routes.
 * Eliminates startup race conditions by awaiting in-flight connections up to 7 seconds,
 * logs structured diagnostics with request IDs, and returns distinct, classified 503 errors.
 */
export const requireDb = async (req, res, next) => {
    if (isDbReady()) {
        return next();
    }

    const reqId = req.id || req.headers?.['x-request-id'] || 'no-id';

    // If MongoDB URI is configured and connection is in-flight, give it up to 7s for cloud cold-start
    if (process.env.MONGODB_URI) {
        const connected = await waitForDb(7000);
        if (connected) {
            return next();
        }
    }

    const isProd = process.env.NODE_ENV === 'production';

    // 1. Missing MongoDB URI in production
    if (isProd && !process.env.MONGODB_URI) {
        logger.error(`[DATABASE_CONFIG_ERROR] [${reqId}] MONGODB_URI is not set in production. Method: ${req.method} Path: ${req.originalUrl}`);
        if (typeof res.set === 'function') res.set('Retry-After', '30');
        else if (typeof res.setHeader === 'function') res.setHeader('Retry-After', '30');

        return res.status(503).json({
            error: 'Database service is unconfigured. Please configure database credentials in server environment.',
            code: 'DATABASE_CONFIG_ERROR',
            retryAfter: 30,
            requestId: reqId
        });
    }

    // 2. MongoDB configured but timed out or unavailable
    if (isProd || process.env.MONGODB_URI) {
        const isConnecting = global.mongoConnectionState === 'connecting';
        const code = isConnecting ? 'DATABASE_TIMEOUT' : 'DATABASE_UNAVAILABLE';
        const errorMsg = isConnecting
            ? 'Database is currently connecting. Please retry in a few seconds.'
            : 'Database service is temporarily unavailable. Please retry in a few moments.';

        if (isConnecting) {
            logger.warn(`[DATABASE_TIMEOUT] [${reqId}] MongoDB handshake in-flight exceeded wait window. Path: ${req.originalUrl}`);
        } else {
            logger.error(`[DATABASE_UNAVAILABLE] [${reqId}] MongoDB unavailable. State: ${global.mongoConnectionState}, Reason: ${global.mongoError || 'Unknown'}. Path: ${req.originalUrl}`);
        }

        const retrySec = parseInt(process.env.DB_RETRY_AFTER || '3', 10);
        if (typeof res.set === 'function') res.set('Retry-After', String(retrySec));
        else if (typeof res.setHeader === 'function') res.setHeader('Retry-After', String(retrySec));

        return res.status(503).json({
            error: errorMsg,
            code,
            retryAfter: retrySec,
            requestId: reqId
        });
    }

    // In local dev without MONGODB_URI, allow route to handle local dev fallback
    next();
};

export const ensureDatabaseReady = requireDb;
export default requireDb;
