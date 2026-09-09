/**
 * Robust Request Timeout Middleware
 * Prevents hanging connections and eliminates "ERR_HTTP_HEADERS_SENT" race conditions
 * by guarding response methods if the timeout handler has already terminated the response.
 */
export const timeoutMiddleware = (seconds = 90) => (req, res, next) => {
    let timedOut = false;
    let timer = null;
    const timeoutMs = seconds * 1000;

    req.isTimedOut = () => timedOut;
    req.isClientClosed = false;

    // Track client aborts (e.g. user closed tab or mobile carrier dropped socket)
    // Listen on response 'close', because request 'close' fires as soon as multer finishes reading the body!
    res.on('close', () => {
        if (!res.writableEnded) {
            req.isClientClosed = true;
        }
    });

    const cleanup = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    res.once('finish', cleanup);
    res.once('close', cleanup);

    // Patch res.json and res.send to prevent double responses if timed out
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = (data) => {
        if (timedOut || res.headersSent || res.writableEnded) {
            return res;
        }
        cleanup();
        return originalJson(data);
    };

    res.send = (data) => {
        if (timedOut || res.headersSent || res.writableEnded) {
            return res;
        }
        cleanup();
        return originalSend(data);
    };

    timer = setTimeout(() => {
        if (timedOut || res.headersSent || res.writableEnded) return;
        timedOut = true;
        cleanup();

        try {
            res.status(408).json({
                error: 'Request timed out — the analysis service is taking longer than expected. Please try again.',
                code: 'REQUEST_TIMEOUT'
            });
        } catch (e) {
            // Already sent or connection reset
        }
    }, timeoutMs);

    next();
};
