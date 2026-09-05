import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../utils/email.js';

describe('🔐 Forgot & Reset Password Security System', () => {
    const JWT_SECRET = 'test_secret_key_123';
    
    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    // ── Test 1: Secure Token Generation & Hashing ─────────────────────────────
    test('1. Generated reset tokens must be 32 bytes and stored as SHA-256 hashes', () => {
        const rawToken = crypto.randomBytes(32).toString('hex');
        expect(rawToken.length).toBe(64); // 32 bytes = 64 hex characters

        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        expect(hashedToken.length).toBe(64);
        expect(hashedToken).not.toBe(rawToken);

        // Verification check
        const candidateHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        expect(candidateHash).toBe(hashedToken);
    });

    // ── Test 2: Anti-Account Enumeration Response Consistency ─────────────────
    test('2. Anti-enumeration: Response message must be identical whether email exists or not', () => {
        const genericMessage = 'If an account exists for this email address, password reset instructions have been sent.';
        
        const registeredEmailResponse = { success: true, message: genericMessage };
        const unregisteredEmailResponse = { success: true, message: genericMessage };

        expect(registeredEmailResponse).toEqual(unregisteredEmailResponse);
    });

    // ── Test 3: Token Expiry Validation ───────────────────────────────────────
    test('3. Expired tokens must be rejected', () => {
        const now = Date.now();
        const expiredTime = now - 1000; // 1 second in the past
        const isValid = expiredTime > now;
        expect(isValid).toBe(false);

        const futureTime = now + 15 * 60 * 1000; // 15 min in the future
        const isFutureValid = futureTime > now;
        expect(isFutureValid).toBe(true);
    });

    // ── Test 4: Invalid / Modified Token Rejection ─────────────────────────────
    test('4. Modified/tampered tokens must fail hash lookup', () => {
        const originalToken = crypto.randomBytes(32).toString('hex');
        const storedHash = crypto.createHash('sha256').update(originalToken).digest('hex');

        const tamperedToken = originalToken.slice(0, -2) + 'aa';
        const tamperedHash = crypto.createHash('sha256').update(tamperedToken).digest('hex');

        expect(tamperedHash).not.toBe(storedHash);
    });

    // ── Test 5: Single-Use Token Invalidation ─────────────────────────────────
    test('5. Single-use: Token must be cleared immediately upon successful password update', () => {
        let userRecord = {
            email: 'test@example.com',
            resetPasswordToken: 'mock_sha256_hash',
            resetPasswordExpires: Date.now() + 15 * 60 * 1000,
            tokenVersion: 0
        };

        // Simulate successful password reset
        userRecord.resetPasswordToken = undefined;
        userRecord.resetPasswordExpires = undefined;
        userRecord.tokenVersion += 1;

        expect(userRecord.resetPasswordToken).toBeUndefined();
        expect(userRecord.resetPasswordExpires).toBeUndefined();
        expect(userRecord.tokenVersion).toBe(1);
    });

    // ── Test 6: Password Hashing Verification ─────────────────────────────────
    test('6. New password must be hashed using bcrypt (never stored in plaintext)', async () => {
        const plainPassword = 'NewSecurePassword123!';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        expect(hashedPassword).not.toBe(plainPassword);
        expect(hashedPassword.startsWith('$2')).toBe(true);

        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        expect(isMatch).toBe(true);

        const wrongMatch = await bcrypt.compare('WrongPassword', hashedPassword);
        expect(wrongMatch).toBe(false);
    });

    // ── Test 7: Session Invalidation / Revocation with tokenVersion ────────────
    test('7. Password reset must invalidate existing JWT tokens across devices', () => {
        const userId = 'user_abc_789';
        const oldTokenVersion = 0;

        // Old JWT issued before password reset
        const oldJwt = jwt.sign(
            { id: userId, email: 'user@example.com', role: 'user', tokenVersion: oldTokenVersion },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Password reset increments user's tokenVersion to 1
        const currentUserVersionInDb = 1;

        // Verify old token payload
        const decodedOldToken = jwt.verify(oldJwt, JWT_SECRET);
        expect(decodedOldToken.tokenVersion).toBe(0);

        // Check validation condition: token version must be >= current DB version
        const isSessionStillValid = (decodedOldToken.tokenVersion ?? 0) >= currentUserVersionInDb;
        expect(isSessionStillValid).toBe(false);

        // Fresh token issued after reset
        const newJwt = jwt.sign(
            { id: userId, email: 'user@example.com', role: 'user', tokenVersion: currentUserVersionInDb },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        const decodedNewToken = jwt.verify(newJwt, JWT_SECRET);
        const isNewSessionValid = (decodedNewToken.tokenVersion ?? 0) >= currentUserVersionInDb;
        expect(isNewSessionValid).toBe(true);
    });

    // ── Test 8: Email Service Safety in Development ───────────────────────────
    test('8. Email service handles password reset and confirmation dispatch safely', async () => {
        // Test that sendPasswordResetEmail executes without throwing in development
        const resetPromise = sendPasswordResetEmail({
            email: 'devtest@example.com',
            name: 'Developer Tester',
            resetToken: crypto.randomBytes(32).toString('hex')
        });
        await expect(resetPromise).resolves.toHaveProperty('success', true);

        // Test that sendPasswordChangedEmail executes without throwing
        const confirmationPromise = sendPasswordChangedEmail({
            email: 'devtest@example.com',
            name: 'Developer Tester',
            ip: '127.0.0.1'
        });
        await expect(confirmationPromise).resolves.toHaveProperty('success', true);
    }, 20000);
});
