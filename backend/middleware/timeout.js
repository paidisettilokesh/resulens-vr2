export const timeoutMiddleware = (seconds) => (req, res, next) => {
    let timedOut = false;
    const timeoutMs = seconds * 1000;

    // A timed-out request may still finish its AI work in the background. Guard
    // against calling the error handler a second time after a response has been
    // sent, which otherwise produces "headers already sent" errors.
    const onTimeout = () => {
        if (timedOut || res.headersSent || res.writableEnded) return;
        timedOut = true;
        const error = new Error('Request Timeout');
        error.status = 408;
        next(error);
    };

    res.setTimeout(timeoutMs, onTimeout);
    req.setTimeout(timeoutMs, onTimeout);
    const clearTimeouts = () => {
        res.setTimeout(0);
        req.setTimeout(0);
    };
    res.once('finish', clearTimeouts);
    res.once('close', clearTimeouts);

    next();
};
