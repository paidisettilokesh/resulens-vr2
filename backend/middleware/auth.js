import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Validates JWT token strictly. Does NOT fall back to raw x-user-id.
 */
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token && token !== 'null' && token !== 'undefined') {
                if (!process.env.JWT_SECRET) {
                    return res.status(500).json({ error: 'Server authentication misconfigured: JWT_SECRET missing' });
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
                req.userId = decoded.id;
                return next();
            }
        }

        // Set to guest/null if no token provided (allows public routes to proceed, but requireAuth will block them)
        req.userId = null;
        req.user = null;
        next();
    } catch (err) {
        console.warn('⚠️ AUTH MIDDLEWARE: Token verification failed:', err.message);
        return res.status(401).json({ error: `Authentication failed: ${err.message}` });
    }
};

/**
 * Middleware to enforce strict authentication
 */
export const requireAuth = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        next();
    });
};
