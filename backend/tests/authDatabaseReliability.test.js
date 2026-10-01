import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import authRouter from '../routes/auth.js';
import { requireDb } from '../middleware/dbReadiness.js';
import { getDbState, isDbReady } from '../config/db.js';

describe('🔒 Authentication & Database Reliability Test Suite', () => {
    let app;
    let server;
    let baseUrl;
    const TEST_JWT_SECRET = 'test_jwt_secret_auth_reliability_987';
    const originalEnv = { ...process.env };

    beforeAll((done) => {
        delete process.env.MONGODB_URI;
        process.env.JWT_SECRET = TEST_JWT_SECRET;
        process.env.NODE_ENV = 'test';

        app = express();
        app.use(express.json());

        // Attach mock request id for correlation
        app.use((req, res, next) => {
            req.id = 'test-corr-id-12345';
            next();
        });

        // Use the actual requireDb middleware on /api/auth
        app.use('/api/auth', requireDb, authRouter);

        // Readiness endpoint
        app.get('/health/ready', (req, res) => {
            const db = getDbState();
            if (process.env.MONGODB_URI && !db.connected) {
                return res.status(503).json({ status: 'degraded', ready: false });
            }
            return res.json({ status: 'operational', ready: true });
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

    describe('1. Auth Configuration Endpoint (/api/auth/config)', () => {
        test('GET /api/auth/config returns google auth capability when configured', async () => {
            process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

            const res = await fetch(`${baseUrl}/api/auth/config`);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.googleAuthEnabled).toBe(true);
            expect(data.googleClientId).toBe('test-client-id.apps.googleusercontent.com');
        });

        test('GET /api/auth/config returns false when no client id is set', async () => {
            delete process.env.GOOGLE_CLIENT_ID;
            delete process.env.VITE_GOOGLE_CLIENT_ID;

            const res = await fetch(`${baseUrl}/api/auth/config`);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.googleAuthEnabled).toBe(false);
            expect(data.googleClientId).toBe('');
        });
    });

    describe('2. User Registration Validation & Error Classification', () => {
        const uniqueEmail = `testuser_${Date.now()}@example.com`;

        test('should register a new user successfully with valid details', async () => {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Candidate',
                    email: uniqueEmail,
                    password: 'SecurePassword123!'
                })
            });

            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data).toHaveProperty('token');
            expect(data).toHaveProperty('id');
            expect(data.email).toBe(uniqueEmail.toLowerCase());
            expect(data.name).toBe('Test Candidate');
        });

        test('should reject duplicate registration with 409 EMAIL_ALREADY_EXISTS', async () => {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Duplicate Candidate',
                    email: uniqueEmail,
                    password: 'SecurePassword123!'
                })
            });

            expect(res.status).toBe(409);
            const data = await res.json();
            expect(data.code).toBe('EMAIL_ALREADY_EXISTS');
            expect(data.error).toMatch(/already exists/i);
        });

        test('should reject invalid email with 400 INVALID_REQUEST', async () => {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Candidate',
                    email: 'invalid-email-no-domain',
                    password: 'SecurePassword123!'
                })
            });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.code).toBe('INVALID_REQUEST');
        });

        test('should reject password under 8 characters with 400 INVALID_REQUEST', async () => {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Candidate',
                    email: `user_${Date.now()}@example.com`,
                    password: 'short'
                })
            });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.code).toBe('INVALID_REQUEST');
            expect(data.error).toMatch(/8 characters/i);
        });

        test('should reject missing full name with 400 INVALID_REQUEST', async () => {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: ' ',
                    email: `user_${Date.now()}@example.com`,
                    password: 'SecurePassword123!'
                })
            });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.code).toBe('INVALID_REQUEST');
        });
    });

    describe('3. User Authentication / Login Flow', () => {
        const loginEmail = `login_${Date.now()}@example.com`;
        const loginPassword = 'PasswordForLogin99!';

        beforeAll(async () => {
            await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Login Tester',
                    email: loginEmail,
                    password: loginPassword
                })
            });
        });

        test('should log in successfully with correct credentials', async () => {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: loginEmail,
                    password: loginPassword
                })
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveProperty('token');
            expect(data.email).toBe(loginEmail.toLowerCase());
        });

        test('should reject incorrect password with 401 AUTHENTICATION_FAILED', async () => {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: loginEmail,
                    password: 'WrongPassword123!'
                })
            });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.code).toBe('AUTHENTICATION_FAILED');
            expect(data.error).toMatch(/invalid email or password/i);
        });

        test('should reject non-existent user with 401 AUTHENTICATION_FAILED', async () => {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'nonexistent_account_404@example.com',
                    password: 'SomePassword123!'
                })
            });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.code).toBe('AUTHENTICATION_FAILED');
        });
    });

    describe('4. Database Readiness & Production Error Classification', () => {
        const savedEnv = process.env.NODE_ENV;
        const savedUri = process.env.MONGODB_URI;

        afterAll(() => {
            delete process.env.MONGODB_URI;
            process.env.NODE_ENV = 'test';
        });

        test('should return 503 DATABASE_CONFIG_ERROR when MONGODB_URI is missing in production', async () => {
            process.env.NODE_ENV = 'production';
            delete process.env.MONGODB_URI;

            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Prod User',
                    email: 'produser@example.com',
                    password: 'ProdPassword123!'
                })
            });

            expect(res.status).toBe(503);
            const data = await res.json();
            expect(data.code).toBe('DATABASE_CONFIG_ERROR');
            expect(res.headers.get('retry-after')).toBe('30');
            expect(data.error).toMatch(/unconfigured/i);
        });

        test('should return 503 DATABASE_UNAVAILABLE when MONGODB_URI is set but database is disconnected', async () => {
            process.env.NODE_ENV = 'production';
            process.env.MONGODB_URI = 'mongodb://127.0.0.1:27099/fake_unreachable_db';
            global.mongoConnectionState = 'disconnected';
            global.mongoError = 'Connection refused';

            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Prod User',
                    email: 'produser2@example.com',
                    password: 'ProdPassword123!'
                })
            });

            expect(res.status).toBe(503);
            const data = await res.json();
            expect(data.code).toBe('DATABASE_UNAVAILABLE');
            expect(res.headers.get('retry-after')).toBe('3');
            expect(data.error).toMatch(/temporarily unavailable/i);
        });

        test('health check /health/ready reflects database readiness', async () => {
            process.env.MONGODB_URI = 'mongodb://127.0.0.1:27099/fake_db';
            const res = await fetch(`${baseUrl}/health/ready`);
            expect(res.status).toBe(503);
            const data = await res.json();
            expect(data.ready).toBe(false);
        });
    });

    describe('5. Google OAuth Input & Fallback Handling', () => {
        test('should return 400 INVALID_REQUEST when credential token is missing', async () => {
            const res = await fetch(`${baseUrl}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.code).toBe('INVALID_REQUEST');
            expect(data.error).toMatch(/credential token is required/i);
        });

        test('should return 401 AUTHENTICATION_FAILED for malformed Google credential token', async () => {
            const malformedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid_signature';
            const res = await fetch(`${baseUrl}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: malformedJwt })
            });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.code).toBe('AUTHENTICATION_FAILED');
        }, 10000);

        test('should reject forged/unverified Google token signature with 401', async () => {
            // Generate a forged token signed with mock key that Google servers will not verify
            const googlePayload = {
                iss: 'https://accounts.google.com',
                sub: 'google_sub_id_12345678',
                email: 'google_verified_user@gmail.com',
                name: 'Google Verified User',
                picture: 'https://lh3.googleusercontent.com/a/photo.jpg',
                exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour future
            };

            const mockGoogleToken = jwt.sign(googlePayload, 'mock_key', { algorithm: 'HS256' });

            const res = await fetch(`${baseUrl}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: mockGoogleToken })
            });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.code).toBe('AUTHENTICATION_FAILED');
        });
    });

    describe('6. Session Restoration (/api/auth/me)', () => {
        test('should restore authenticated session from valid registered user token', async () => {
            const meUserEmail = `me_test_${Date.now()}@example.com`;
            const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Session Candidate',
                    email: meUserEmail,
                    password: 'PasswordSession123!'
                })
            });

            const signupData = await signupRes.json();
            expect(signupRes.status).toBe(201);
            const validToken = signupData.token;

            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { Authorization: `Bearer ${validToken}` }
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.email).toBe(meUserEmail.toLowerCase());
            expect(data.name).toBe('Session Candidate');
        });

        test('should reject /me with 401 when token is missing', async () => {
            const res = await fetch(`${baseUrl}/api/auth/me`);
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.code).toBe('AUTH_REQUIRED');
        });
    });
});
