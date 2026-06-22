export const timeoutMiddleware = (seconds) => (req, res, next) => {
    res.setTimeout(seconds * 1000, () => {
        const error = new Error('Request Timeout');
        error.status = 408;
        next(error);
    });
    next();
};
