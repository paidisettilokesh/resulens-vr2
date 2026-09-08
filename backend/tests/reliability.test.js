import { ensureDatabaseReady } from '../middleware/dbReadiness.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { isDbReady, getDbState } from '../config/db.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('🛡️ Production Reliability & Resilience Tests', () => {
    const JWT_SECRET = 'reliability_test_secret_xyz';

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    describe('DB Readiness Middleware', () => {
        const originalEnv = process.env.NODE_ENV;

        afterEach(() => {
            process.env.NODE_ENV = originalEnv;
        });

        test('should return 503 with Retry-After header in production when DB is disconnected', async () => {
            process.env.NODE_ENV = 'production';
            // Ensure mongoose connection state is 0 (disconnected)
            const mockReq = { path: '/api/history', method: 'GET' };
            let statusCode = null;
            let responseHeaders = {};
            let responseBody = null;

            const mockRes = {
                status(code) {
                    statusCode = code;
                    return this;
                },
                set(headers, val) {
                    if (typeof headers === 'object') {
                        responseHeaders = { ...responseHeaders, ...headers };
                    } else {
                        responseHeaders[headers] = val;
                    }
                    return this;
                },
                json(body) {
                    responseBody = body;
                    return this;
                }
            };

            let nextCalled = false;
            const next = () => { nextCalled = true; };

            await ensureDatabaseReady(mockReq, mockRes, next);

            expect(statusCode).toBe(503);
            expect(responseHeaders['Retry-After']).toBe('3');
            expect(responseBody.code).toBe('DATABASE_UNAVAILABLE');
            expect(responseBody.retryAfter).toBe(3);
            expect(nextCalled).toBe(false);
        });

        test('should allow request through with next() in development mode without MONGODB_URI', async () => {
            process.env.NODE_ENV = 'development';
            const savedUri = process.env.MONGODB_URI;
            delete process.env.MONGODB_URI;
            try {
                const mockReq = { path: '/api/history', method: 'GET' };
                const mockRes = {};
                let nextCalled = false;
                const next = () => { nextCalled = true; };

                await ensureDatabaseReady(mockReq, mockRes, next);

                expect(nextCalled).toBe(true);
            } finally {
                if (savedUri) process.env.MONGODB_URI = savedUri;
            }
        });
    });

    describe('Auth Token Expiry Classification', () => {
        test('should return TOKEN_EXPIRED code when JWT is expired', () => {
            const expiredToken = jwt.sign(
                { id: 'user_expired_1', email: 'expired@test.com' },
                JWT_SECRET,
                { expiresIn: '-10s' } // Expired 10 seconds ago
            );

            const mockReq = {
                headers: { authorization: `Bearer ${expiredToken}` },
                user: null,
                userId: null
            };
            let statusCode = null;
            let responseBody = null;
            const mockRes = {
                status(code) {
                    statusCode = code;
                    return this;
                },
                json(body) {
                    responseBody = body;
                    return this;
                }
            };

            let nextCalled = false;
            const next = () => { nextCalled = true; };

            authMiddleware(mockReq, mockRes, next);

            expect(statusCode).toBe(401);
            expect(responseBody.code).toBe('TOKEN_EXPIRED');
            expect(responseBody.error).toMatch(/expired/i);
            expect(nextCalled).toBe(false);
        });
    });

    describe('Database Lifecycle State Reporters', () => {
        test('getDbState() returns a recognized connection state string', () => {
            const state = getDbState();
            expect(['disconnected', 'connected', 'connecting', 'disconnecting', 'uninitialized']).toContain(state.state);
        });

        test('isDbReady() returns boolean matching mongoose readyState', () => {
            const ready = isDbReady();
            expect(ready).toBe(mongoose.connection.readyState === 1);
        });
    });
});
