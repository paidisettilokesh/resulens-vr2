import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { historyCache, getHistory } from '../utils/historyManager.js';
import authRouter from '../routes/auth.js';
import analyzeRouter from '../routes/analyze.js';
import adminRouter from '../routes/admin.js';
import { requireDb } from '../middleware/dbReadiness.js';

describe('Security and Reliability Regression Suite', () => {
    let app;
    let server;
    let baseUrl;
    const TEST_JWT_SECRET = 'test_jwt_security_regression_secret_key';
    const originalEnv = { ...process.env };
    let validAuthToken;

    beforeAll((done) => {
        delete process.env.MONGODB_URI;
        process.env.JWT_SECRET = TEST_JWT_SECRET;
        process.env.NODE_ENV = 'test';

        // Valid JWT for authenticated endpoints
        validAuthToken = jwt.sign(
            { id: 'regression_test_user', email: 'test@example.com', role: 'user' },
            TEST_JWT_SECRET,
            { expiresIn: '1h' }
        );

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            req.id = 'regression-req-id-123';
            next();
        });

        app.use('/api/auth', requireDb, authRouter);
        app.use('/api/analyze', analyzeRouter);
        app.use('/api/admin', adminRouter);

        // Global error handler mirroring server.js
        app.use((err, req, res, next) => {
            const isClientError = (err.status >= 400 && err.status < 500) ||
                                  err.name === 'MulterError' ||
                                  err.code === 'UNSUPPORTED_FILE_TYPE' ||
                                  (err.message && /Only PDF|unsupported file|Invalid file/i.test(err.message));

            let errorMessage = err.message;
            if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
                errorMessage = 'File size exceeds the 5MB limit.';
            } else if (err.code === 'UNSUPPORTED_FILE_TYPE') {
                errorMessage = err.message || 'Only PDF, DOCX, and TXT files are allowed.';
            }

            const statusCode = err.status || (isClientError ? 400 : 500);
            res.status(statusCode).json({
                error: errorMessage,
                code: err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
                requestId: req.id
            });
        });

        server = http.createServer(app);
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            done();
        });
    });

    afterAll((done) => {
        process.env = { ...originalEnv };
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('P0: Google OAuth Signature Verification', () => {
        test('rejects forged JWT signed with arbitrary secret key with 401', async () => {
            const forgedPayload = {
                iss: 'https://accounts.google.com',
                sub: 'attacker_controlled_sub',
                email: 'victim_admin@company.com',
                name: 'Victim Admin',
                exp: Math.floor(Date.now() / 1000) + 3600
            };
            const forgedToken = jwt.sign(forgedPayload, 'attacker_secret', { algorithm: 'HS256' });

            const res = await fetch(`${baseUrl}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: forgedToken })
            });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.code).toBe('AUTHENTICATION_FAILED');
            expect(data.error).toContain('Google authentication failed');
        });
    });

    describe('History Cache Bounded Memory & Eviction', () => {
        test('evicts oldest entries when capacity exceeds 100 to prevent memory leaks', async () => {
            historyCache.clear();

            // Populate 105 distinct entries into cache
            for (let i = 1; i <= 105; i++) {
                await getHistory(`user_test_cache_${i}`);
            }

            expect(historyCache.size).toBeLessThanOrEqual(100);
            // Oldest entry (user_test_cache_1) should have been evicted
            expect(historyCache.has('user_test_cache_1')).toBe(false);
            // Most recent entries should be present
            expect(historyCache.has('user_test_cache_105')).toBe(true);
        });
    });

    describe('Unsupported File Types & Global Error Handling', () => {
        test('returns 400 Bad Request instead of 500 Internal Error for invalid file extensions', async () => {
            const formData = new FormData();
            const fakeFile = new Blob(['malicious executable'], { type: 'application/x-msdownload' });
            formData.append('resume', fakeFile, 'malicious.exe');

            const res = await fetch(`${baseUrl}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${validAuthToken}`
                },
                body: formData
            });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.code).toBe('UNSUPPORTED_FILE_TYPE');
            expect(data.error).toMatch(/Only PDF, DOCX, and TXT/i);
        });
    });
});
