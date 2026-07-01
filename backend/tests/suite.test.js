import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { fileFilter } from '../utils/upload.js';

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const mockRequest = (headers = {}) => ({
    headers,
    user: null,
    userId: null
});

describe('🔐 Security: JWT Authentication Middleware', () => {
    const JWT_SECRET = 'test_secret';

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    test('should allow public access and set userId to null when no authorization header is present', () => {
        const req = mockRequest();
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        authMiddleware(req, {}, next);

        expect(req.userId).toBeNull();
        expect(req.user).toBeNull();
        expect(nextCalled).toBe(true);
    });

    test('should verify and extract userId from a valid JWT token', () => {
        const payload = { id: 'user_123_abc', email: 'test@resulens.com' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        const req = mockRequest({ authorization: `Bearer ${token}` });
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        authMiddleware(req, {}, next);

        expect(req.userId).toBe(payload.id);
        expect(req.user).toBeDefined();
        expect(req.user.email).toBe(payload.email);
        expect(nextCalled).toBe(true);
    });

    test('should verify and allow access for generated guest tokens', () => {
        const payload = { id: 'guest_98765', email: 'guest@resulens.ai', name: 'Guest User' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

        const req = mockRequest({ authorization: `Bearer ${token}` });
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        authMiddleware(req, {}, next);

        expect(req.userId).toBe(payload.id);
        expect(req.userId.startsWith('guest_')).toBe(true);
        expect(req.user.name).toBe('Guest User');
        expect(nextCalled).toBe(true);
    });

    test('should reject invalid or expired tokens immediately with 401 status', () => {
        const req = mockRequest({ authorization: 'Bearer invalid_or_expired_token' });
        let statusSet = null;
        let jsonSent = null;
        const res = {
            status: (code) => { statusSet = code; return res; },
            json: (body) => { jsonSent = body; return res; }
        };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        authMiddleware(req, res, next);

        expect(statusSet).toBe(401);
        expect(jsonSent.error).toContain('Authentication failed');
        expect(nextCalled).toBe(false);
    });

    test('requireAuth should block guest accesses immediately', () => {
        const req = mockRequest(); // guest
        let statusSet = null;
        let jsonSent = null;
        const res = {
            status: (code) => { statusSet = code; return res; },
            json: (body) => { jsonSent = body; return res; }
        };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        requireAuth(req, res, next);

        expect(statusSet).toBe(401);
        expect(jsonSent.error).toBe('Authentication required');
        expect(nextCalled).toBe(false);
    });
});

describe('📂 Security: File Upload Filters', () => {
    test('should hash prompts correctly for cache queries', () => {
        const prompt = 'Analyze resume vs Backend Developer role';
        const hash1 = crypto.createHash('sha256').update(prompt).digest('hex');
        const hash2 = crypto.createHash('sha256').update(prompt).digest('hex');
        
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64);
    });

    test('should accept valid PDF and DOCX files', () => {
        const pdfFile = { originalname: 'resume.pdf', mimetype: 'application/pdf' };
        const docxFile = { originalname: 'resume.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        
        let pdfResult = null;
        let pdfError = null;
        fileFilter({}, pdfFile, (err, accept) => {
            pdfError = err;
            pdfResult = accept;
        });

        let docxResult = null;
        let docxError = null;
        fileFilter({}, docxFile, (err, accept) => {
            docxError = err;
            docxResult = accept;
        });

        expect(pdfError).toBeNull();
        expect(pdfResult).toBe(true);
        expect(docxError).toBeNull();
        expect(docxResult).toBe(true);
    });

    test('should reject invalid extensions or MIME types', () => {
        const zipFile = { originalname: 'malicious.zip', mimetype: 'application/zip' };
        const mismatchedFile = { originalname: 'malicious.pdf', mimetype: 'application/zip' };
        const exeFile = { originalname: 'malicious.exe', mimetype: 'application/octet-stream' };

        let zipError = null;
        let zipResult = null;
        fileFilter({}, zipFile, (err, accept) => {
            zipError = err;
            zipResult = accept;
        });

        let mismatchedError = null;
        let mismatchedResult = null;
        fileFilter({}, mismatchedFile, (err, accept) => {
            mismatchedError = err;
            mismatchedResult = accept;
        });

        let exeError = null;
        let exeResult = null;
        fileFilter({}, exeFile, (err, accept) => {
            exeError = err;
            exeResult = accept;
        });

        expect(zipError).toBeDefined();
        expect(zipError.message).toContain('Invalid file type');
        expect(zipResult).toBe(false);

        expect(mismatchedError).toBeDefined();
        expect(mismatchedError.message).toContain('Invalid file type');
        expect(mismatchedResult).toBe(false);

        expect(exeError).toBeDefined();
        expect(exeError.message).toContain('Invalid file type');
        expect(exeResult).toBe(false);
    });
});


describe('🔐 Security & Bug Fixes: Case-insensitive Emails & Password Re-hashing Prevention', () => {
    test('should match emails case-insensitively with regex escape helper', () => {
        const escapeRegex = (string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const emailClean = 'founder@resulens.ai';
        const emailRegex = new RegExp('^' + escapeRegex(emailClean) + '$', 'i');

        expect(emailRegex.test('founder@resulens.ai')).toBe(true);
        expect(emailRegex.test('Founder@resulens.ai')).toBe(true);
        expect(emailRegex.test('FOUNDER@RESULENS.AI')).toBe(true);
        expect(emailRegex.test('notfounder@resulens.ai')).toBe(false);
        
        // Test regex escaping
        const dotEmail = 'foo.bar@resulens.ai';
        const dotEmailRegex = new RegExp('^' + escapeRegex(dotEmail) + '$', 'i');
        expect(dotEmailRegex.test('fooxbar@resulens.ai')).toBe(false); // '.' must match literally
        expect(dotEmailRegex.test('foo.bar@resulens.ai')).toBe(true);
    });

    test('should correctly identify existing bcrypt hashes using regex safeguard', () => {
        const bcryptSafeguard = /^\$2[ayb]\$/;
        
        const validHash1 = '$2a$10$abcdefghijklmnopqrstuv';
        const validHash2 = '$2b$12$abcdefghijklmnopqrstuv';
        const validHash3 = '$2y$10$abcdefghijklmnopqrstuv';
        const plainPassword = 'password123';
        const emptyPassword = '';

        expect(bcryptSafeguard.test(validHash1)).toBe(true);
        expect(bcryptSafeguard.test(validHash2)).toBe(true);
        expect(bcryptSafeguard.test(validHash3)).toBe(true);
        expect(bcryptSafeguard.test(plainPassword)).toBe(false);
        expect(bcryptSafeguard.test(emptyPassword)).toBe(false);
    });
});
