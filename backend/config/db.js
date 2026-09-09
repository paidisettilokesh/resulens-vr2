import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const RETRY_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

global.isMongoConnected = false;
global.mongoError = null;
global.mongoConnectionState = 'disconnected';

let listenersInitialized = false;
let retryTimeout = null;

const initListeners = () => {
    if (listenersInitialized) return;
    listenersInitialized = true;

    mongoose.connection.on('connected', () => {
        global.isMongoConnected = true;
        global.mongoConnectionState = 'connected';
        global.mongoError = null;
        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    });

    mongoose.connection.on('disconnected', () => {
        global.isMongoConnected = false;
        global.mongoConnectionState = 'disconnected';
        console.warn('⚠️ MongoDB disconnected.');
        scheduleReconnect();
    });

    mongoose.connection.on('reconnected', () => {
        global.isMongoConnected = true;
        global.mongoConnectionState = 'connected';
        global.mongoError = null;
        console.log('✅ MongoDB reconnected successfully.');
    });

    mongoose.connection.on('error', (err) => {
        global.isMongoConnected = false;
        global.mongoConnectionState = 'error';
        global.mongoError = err.message;
        console.error('❌ MongoDB Connection Error:', err.message);
    });
};

const scheduleReconnect = (attempt = 0) => {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (!process.env.MONGODB_URI) return;

    // Guard: Do not trigger reconnect if already connected or connecting
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

    const delay = Math.min(MAX_DELAY_MS, RETRY_DELAY_MS * Math.pow(1.5, attempt));
    retryTimeout = setTimeout(async () => {
        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
        try {
            console.log(`🔁 Reconnecting to MongoDB... (Attempt ${attempt + 1})`);
            global.mongoConnectionState = 'connecting';
            await mongoose.connect(process.env.MONGODB_URI, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
        } catch (e) {
            scheduleReconnect(attempt + 1);
        }
    }, delay);
};

export const isDbReady = () => {
    return mongoose.connection.readyState === 1 && !!global.isMongoConnected;
};

export const getDbState = () => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const readyState = states[mongoose.connection.readyState] || 'unknown';
    const isConfigured = !!process.env.MONGODB_URI;
    return {
        state: readyState,
        connected: readyState === 'connected' && !!global.isMongoConnected,
        configured: isConfigured,
        error: global.mongoError || null
    };
};

/**
 * Wait for DB connection if it is currently in 'connecting' state or awaiting initial handshake.
 * Prevents dropping requests that arrive during cloud cold-start handshake (Render + Atlas)
 * without waiting unnecessarily when the database is already disconnected or in error.
 */
export const waitForDb = (timeoutMs = 5000) => {
    if (isDbReady()) return Promise.resolve(true);

    const isConnecting = mongoose.connection.readyState === 2 || global.mongoConnectionState === 'connecting';
    if (!isConnecting) {
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const start = Date.now();
        const check = setInterval(() => {
            if (isDbReady()) {
                clearInterval(check);
                resolve(true);
            } else if (Date.now() - start > timeoutMs || (mongoose.connection.readyState !== 2 && !isDbReady())) {
                clearInterval(check);
                resolve(isDbReady());
            }
        }, 150);
    });
};

const connectDB = async (retryCount = 0) => {
    initListeners();

    if (!process.env.MONGODB_URI) {
        global.isMongoConnected = false;
        global.mongoConnectionState = 'disconnected';
        global.mongoError = 'MONGODB_URI environment variable is not configured';
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ CRITICAL: MONGODB_URI is required in production.');
        } else {
            console.warn('⚠️ MONGODB_URI is not set. Running in local development mode.');
        }
        return false;
    }

    try {
        global.mongoConnectionState = 'connecting';
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        global.isMongoConnected = true;
        global.mongoConnectionState = 'connected';
        global.mongoError = null;
        console.log(`✅ MongoDB Initialized: ${conn.connection.host}`);
        return true;
    } catch (error) {
        global.isMongoConnected = false;
        global.mongoConnectionState = 'error';
        global.mongoError = error.message;
        console.error(`❌ MongoDB Initial Connection Failed: ${error.message}`);
        scheduleReconnect(retryCount);
        return false;
    }
};

export default connectDB;
