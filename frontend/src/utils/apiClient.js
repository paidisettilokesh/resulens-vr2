import axios from 'axios';

/**
 * Validates and retrieves the base backend URL.
 * Fails clearly in production if misconfigured rather than silently failing to localhost.
 */
export const getBackendBaseUrl = () => {
    const rawUrl = import.meta.env.VITE_BACKEND_URL;
    const isProd = import.meta.env.PROD;

    if (!rawUrl || rawUrl.trim() === '') {
        if (isProd) {
            console.error('❌ CRITICAL: VITE_BACKEND_URL is not defined in production build!');
        }
        return isProd ? window.location.origin : 'http://localhost:5000';
    }

    const trimmed = rawUrl.trim().replace(/\/+$/, '');

    // Guard: Prevent production builds from hitting localhost
    if (isProd && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1'))) {
        console.warn('⚠️ WARNING: Production frontend is configured to call localhost:', trimmed);
    }

    return trimmed;
};

export const getApiBaseUrl = () => `${getBackendBaseUrl()}/api`;

/**
 * Creates the primary ResuLens Axios instance with sane defaults
 */
const rawClient = (axios && typeof axios.create === 'function')
    ? axios.create({
        baseURL: getApiBaseUrl(),
        timeout: 90000 // 90 seconds timeout (bounded below reverse proxy 100s drops)
    })
    : {
        interceptors: {
            request: { use: () => {} },
            response: { use: () => {} }
        },
        get: () => Promise.resolve({ data: {} }),
        post: () => Promise.resolve({ data: {} }),
        put: () => Promise.resolve({ data: {} }),
        delete: () => Promise.resolve({ data: {} })
    };

export const apiClient = rawClient;

// Attach correlation ID and authorization token dynamically before every request
if (apiClient?.interceptors?.request?.use) {
    apiClient.interceptors.request.use((config) => {
    // If request payload is FormData, remove Content-Type so browser can set multipart/form-data boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers) {
            delete config.headers['Content-Type'];
            delete config.headers['content-type'];
        }
    }

    // Generate or attach request correlation ID
    if (!config.headers['X-Request-Id']) {
        const reqId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 11);
        config.headers['X-Request-Id'] = reqId;
    }

    // Try reading active user from localStorage if not explicitly supplied
    try {
        const savedUserStr = localStorage.getItem('user');
        if (savedUserStr) {
            const parsed = JSON.parse(savedUserStr);
            if (parsed?.token && !config.headers['Authorization']) {
                config.headers['Authorization'] = `Bearer ${parsed.token}`;
            }
            if (parsed?.id && !config.headers['x-user-id']) {
                config.headers['x-user-id'] = parsed.id;
            }
        }
    } catch (e) {
        // Ignore localStorage parse errors in request interceptor
    }

    return config;
}, (error) => Promise.reject(error));
}

// Response interceptor with retry logic for transient idempotent requests (GET)
if (apiClient?.interceptors?.response?.use) {
    apiClient.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error.config;

            // Only retry idempotent GET requests automatically
            if (config && config.method?.toLowerCase() === 'get') {
                config.__retryCount = config.__retryCount || 0;
                const maxRetries = 2;

                const isTransientError = !error.response || // Network error / cold start
                    error.response.status === 502 ||
                    error.response.status === 503 ||
                    error.response.status === 504 ||
                    error.code === 'ECONNABORTED';

                if (isTransientError && config.__retryCount < maxRetries) {
                    config.__retryCount += 1;
                    const delayMs = config.__retryCount * 1500;
                    console.warn(`[apiClient] Retrying ${config.url} (Attempt ${config.__retryCount}/${maxRetries}) after ${delayMs}ms...`);
                    await new Promise((res) => setTimeout(res, delayMs));
                    return apiClient(config);
                }
            }

            return Promise.reject(error);
        }
    );
}

/**
 * Classifies any API error into an actionable, user-friendly diagnostic object
 */
export const classifyApiError = (err) => {
    const getBaseClassification = () => {
        // 1. Client offline
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return {
                type: 'OFFLINE',
                title: 'No Internet Connection',
                message: 'Your device appears to be offline. Please check your network connection and try again.',
                canRetry: true,
                statusCode: null,
                technicalDetail: err?.message
            };
        }

    const status = err.response?.status;
    const serverData = err.response?.data;
    const serverMsg = typeof serverData === 'string' ? serverData : (serverData?.error || '');
    const serverCode = serverData?.code;

    // 2. Gateway Errors / Cold Starts (502 / 504 - Render waking up or proxy gateway drop)
    if (status === 502 || status === 504) {
        return {
            type: 'COLD_START',
            title: 'Backend Starting Up',
            message: 'The ResuLens backend service is waking up from idle state. This usually takes 30-50 seconds on cold start. Please retry now.',
            canRetry: true,
            statusCode: status,
            technicalDetail: `HTTP ${status} Bad Gateway / Gateway Timeout`
        };
    }

    // 3. Request Timeout / Aborted
    if (status === 408 || err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
        return {
            type: 'TIMEOUT',
            title: 'Request Timed Out',
            message: 'The analysis service took longer than expected to respond. This can happen during peak traffic. Please try again.',
            canRetry: true,
            statusCode: status || 408,
            technicalDetail: err.message
        };
    }

    // 4. Rate Limit Exceeded
    if (status === 429) {
        return {
            type: 'RATE_LIMITED',
            title: 'Rate Limit Reached',
            message: serverMsg || 'You have made too many requests in a short period. Please wait a few moments before trying again.',
            canRetry: true,
            retryAfter: parseInt(err.response?.headers?.['retry-after'] || '60', 10),
            statusCode: 429,
            technicalDetail: 'HTTP 429 Too Many Requests'
        };
    }

    // 4. Session Expired / Unauthorized
    if (status === 401) {
        return {
            type: 'AUTH_EXPIRED',
            title: 'Session Expired',
            message: serverMsg || 'Your session has expired or is invalid. Please sign in again to continue.',
            canRetry: false,
            statusCode: 401,
            technicalDetail: serverCode || 'AUTH_REQUIRED'
        };
    }

    // 5. Forbidden / Permission Denied
    if (status === 403) {
        return {
            type: 'AUTH_FORBIDDEN',
            title: 'Access Restricted',
            message: serverMsg || 'You do not have permission to access this resource or your account has been suspended.',
            canRetry: false,
            statusCode: 403,
            technicalDetail: 'HTTP 403 Forbidden'
        };
    }

    // 6. Payload / File too large
    if (status === 413) {
        return {
            type: 'FILE_INVALID',
            title: 'Resume Exceeds Size Limit',
            message: 'Your resume file exceeds the 5MB maximum limit. Please compress your PDF or upload a DOCX file.',
            canRetry: false,
            statusCode: 413,
            technicalDetail: 'HTTP 413 Payload Too Large'
        };
    }

    // 7. Scanned PDF or Bad Request with specific guidance
    if (status === 400) {
        const isScanned = serverMsg.toLowerCase().includes('scanned') ||
                          serverMsg.toLowerCase().includes('image') ||
                          serverMsg.toLowerCase().includes('readable text') ||
                          serverMsg.toLowerCase().includes('selectable text');

        return {
            type: isScanned ? 'SCANNED_FILE' : 'BAD_REQUEST',
            title: isScanned ? 'Image-Based PDF Detected' : 'Unable to Process Resume',
            message: serverMsg || 'The uploaded file could not be parsed. Please ensure it is a valid PDF or DOCX resume.',
            canRetry: !isScanned,
            statusCode: 400,
            technicalDetail: serverMsg
        };
    }

    // 8. Service Temporarily Unavailable / Database Initializing (503)
    if (status === 503) {
        return {
            type: 'BACKEND_UNAVAILABLE',
            title: 'Service Initializing',
            message: serverMsg || 'The ResuLens database is currently initializing or reconnecting. Please wait a moment and retry.',
            canRetry: true,
            retryAfter: parseInt(err.response?.headers?.['retry-after'] || '3', 10),
            statusCode: 503,
            technicalDetail: serverCode || 'DATABASE_UNAVAILABLE'
        };
    }

    // 9. Genuine Network Error (err.response is undefined: Render sleeping, CORS failure, connection reset)
    if (!err.response) {
        return {
            type: 'NETWORK_ERROR',
            title: 'Connection Interrupted',
            message: 'Unable to communicate with the ResuLens backend. The server may be waking up from sleep or your connection dropped. Please retry.',
            canRetry: true,
            statusCode: null,
            technicalDetail: err.message || 'Network Error / Connection Reset'
        };
    }

        // 11. Generic Server Error (>= 500)
        return {
            type: 'SERVER_ERROR',
            title: 'Analysis Error',
            message: (serverMsg && serverMsg.length < 200 && !serverMsg.includes('at '))
                ? serverMsg
                : 'An unexpected error occurred while analyzing your resume. Please try again.',
            canRetry: true,
            statusCode: status || 500,
            technicalDetail: serverMsg || 'HTTP 500 Server Error'
        };
    };

    const base = getBaseClassification();
    return {
        ...base,
        retryable: base.canRetry !== false,
        isOffline: base.type === 'OFFLINE',
        isTimeout: base.type === 'TIMEOUT',
        isRateLimited: base.type === 'RATE_LIMITED',
        isAuth: base.type === 'AUTH_EXPIRED' || base.type === 'AUTH_FORBIDDEN',
        isTokenExpired: base.type === 'AUTH_EXPIRED' && (err?.response?.data?.code === 'TOKEN_EXPIRED' || base.technicalDetail === 'TOKEN_EXPIRED'),
        isDbInitializing: base.type === 'BACKEND_UNAVAILABLE',
        isColdStart: base.type === 'COLD_START',
        isNetworkError: base.type === 'NETWORK_ERROR'
    };
};

export default apiClient;
