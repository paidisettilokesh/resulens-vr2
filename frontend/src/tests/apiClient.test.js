import { describe, it, expect } from 'vitest';
import { classifyApiError } from '../utils/apiClient';

describe('🌐 API Client Error Classification & Resilience', () => {
    it('correctly classifies offline state when browser is offline', () => {
        const originalOnLine = navigator.onLine;
        try {
            Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
            const error = new Error('Network Error');
            const classified = classifyApiError(error);

            expect(classified.isOffline).toBe(true);
            expect(classified.retryable).toBe(true);
            expect(classified.type).toBe('OFFLINE');
        } finally {
            Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
        }
    });

    it('identifies cold-start gateway errors (502 / 504)', () => {
        const error502 = { response: { status: 502, data: {} }, message: 'Bad Gateway' };
        const classified502 = classifyApiError(error502);

        expect(classified502.isColdStart).toBe(true);
        expect(classified502.retryable).toBe(true);
        expect(classified502.type).toBe('COLD_START');

        const error504 = { response: { status: 504, data: {} }, message: 'Gateway Timeout' };
        const classified504 = classifyApiError(error504);

        expect(classified504.isColdStart).toBe(true);
        expect(classified504.retryable).toBe(true);
        expect(classified504.type).toBe('COLD_START');
    });

    it('identifies database initializing state (503)', () => {
        const error503 = {
            response: {
                status: 503,
                data: { code: 'DATABASE_UNAVAILABLE', retryAfter: 3 }
            }
        };
        const classified = classifyApiError(error503);

        expect(classified.isDbInitializing).toBe(true);
        expect(classified.retryable).toBe(true);
        expect(classified.type).toBe('BACKEND_UNAVAILABLE');
    });

    it('identifies rate limit exceeded (429)', () => {
        const error429 = { response: { status: 429, data: {} }, message: 'Too Many Requests' };
        const classified = classifyApiError(error429);

        expect(classified.isRateLimited).toBe(true);
        expect(classified.retryable).toBe(true);
        expect(classified.type).toBe('RATE_LIMITED');
    });

    it('identifies client timeout (ECONNABORTED)', () => {
        const timeoutError = { code: 'ECONNABORTED', message: 'timeout of 90000ms exceeded' };
        const classified = classifyApiError(timeoutError);

        expect(classified.isTimeout).toBe(true);
        expect(classified.retryable).toBe(true);
        expect(classified.type).toBe('TIMEOUT');
    });

    it('identifies authentication expiration (401 with TOKEN_EXPIRED)', () => {
        const expiredAuthError = {
            response: {
                status: 401,
                data: { code: 'TOKEN_EXPIRED', error: 'Authentication token has expired' }
            }
        };
        const classified = classifyApiError(expiredAuthError);

        expect(classified.isAuth).toBe(true);
        expect(classified.isTokenExpired).toBe(true);
        expect(classified.retryable).toBe(false);
        expect(classified.type).toBe('AUTH_EXPIRED');
    });

    it('identifies generic network errors as retryable', () => {
        const netError = new Error('Network Error');
        const classified = classifyApiError(netError);

        expect(classified.isNetworkError).toBe(true);
        expect(classified.retryable).toBe(true);
        expect(classified.type).toBe('NETWORK_ERROR');
    });
});
