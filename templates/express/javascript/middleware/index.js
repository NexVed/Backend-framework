/**
 * Middleware Module
 */

/**
 * Compose multiple middlewares into one
 */
function compose(...middlewares) {
    return (req, res, next) => {
        const runner = (index) => {
            if (index >= middlewares.length) {
                return next();
            }

            const middleware = middlewares[index];
            middleware(req, res, (err) => {
                if (err) return next(err);
                runner(index + 1);
            });
        };

        runner(0);
    };
}

/**
 * Wrap async handlers to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Cache control middleware
 */
function withCacheControl(maxAge = 0, options = {}) {
    return (req, res, next) => {
        if (options.noStore) {
            res.setHeader('Cache-Control', 'no-store');
        } else {
            const visibility = options.private ? 'private' : 'public';
            res.setHeader('Cache-Control', `${visibility}, max-age=${maxAge}`);
        }
        next();
    };
}

/**
 * Request timeout middleware
 */
function withTimeout(ms) {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    error: 'Request Timeout',
                    message: `Request took longer than ${ms}ms`,
                });
            }
        }, ms);

        res.on('finish', () => clearTimeout(timeout));
        res.on('close', () => clearTimeout(timeout));

        next();
    };
}

/**
 * Request ID middleware
 */
function withRequestId() {
    return (req, res, next) => {
        const requestId = req.headers['x-request-id'] || generateId();
        req.headers['x-request-id'] = requestId;
        res.setHeader('X-Request-ID', requestId);
        next();
    };
}

function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Security headers middleware
 */
function withSecurityHeaders() {
    return (req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.removeHeader('X-Powered-By');
        next();
    };
}

/**
 * Logging middleware
 */
function withLogging(options = {}) {
    const skipPaths = options.skipPaths || ['/health', '/favicon.ico'];

    return (req, res, next) => {
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        const startTime = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const emoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
            console.log(`${emoji} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        });

        next();
    };
}

/**
 * 404 Not Found Handler
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        code: 'NOT_FOUND',
    });
}

/**
 * Global Error Handler
 */
function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'Internal server error';
    let details = err.details;

    if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        code = 'UNAUTHORIZED';
        message = 'Invalid or expired token';
    } else if (err.name === 'SyntaxError' && 'body' in err) {
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
    }

    if (statusCode >= 500) {
        console.error('❌ Server Error:', {
            method: req.method,
            path: req.path,
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        });
    }

    res.status(statusCode).json({
        success: false,
        error: getErrorName(statusCode),
        message,
        code,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

function getErrorName(statusCode) {
    const names = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
    };
    return names[statusCode] || 'Error';
}

/**
 * Custom Application Error
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message, details) {
        return new AppError(message, 400, 'BAD_REQUEST', details);
    }

    static unauthorized(message = 'Unauthorized') {
        return new AppError(message, 401, 'UNAUTHORIZED');
    }

    static forbidden(message = 'Forbidden') {
        return new AppError(message, 403, 'FORBIDDEN');
    }

    static notFound(resource = 'Resource') {
        return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
    }

    static conflict(message) {
        return new AppError(message, 409, 'CONFLICT');
    }

    static validation(details) {
        return new AppError('Validation failed', 422, 'VALIDATION_ERROR', details);
    }

    static internal(message = 'Internal server error') {
        return new AppError(message, 500, 'INTERNAL_ERROR');
    }
}

module.exports = {
    compose,
    asyncHandler,
    withCacheControl,
    withTimeout,
    withRequestId,
    withSecurityHeaders,
    withLogging,
    notFoundHandler,
    errorHandler,
    AppError,
};
