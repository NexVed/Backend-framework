/**
 * Middleware Module
 * Pre-built middleware for common backend needs
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Re-export individual middlewares
export { withAuth, requireAuth, optionalAuth } from './auth';
export { withRateLimit, RateLimitConfig } from './rateLimit';
export { withValidation, validateBody, validateQuery, validateParams } from './validation';
export { errorHandler, notFoundHandler, AppError } from './errorHandler';
export { withLogging, requestLogger } from './logging';

/**
 * Compose multiple middlewares into one
 */
export function compose(...middlewares: RequestHandler[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const runner = (index: number): void => {
            if (index >= middlewares.length) {
                return next();
            }

            const middleware = middlewares[index];
            middleware(req, res, (err?: any) => {
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
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Cache control middleware
 */
export function withCacheControl(maxAge: number = 0, options: { private?: boolean; noStore?: boolean } = {}): RequestHandler {
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
 * CORS preflight handler
 */
export function handlePreflight(): RequestHandler {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        next();
    };
}

/**
 * Request timeout middleware
 */
export function withTimeout(ms: number): RequestHandler {
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
export function withRequestId(): RequestHandler {
    return (req, res, next) => {
        const requestId = req.headers['x-request-id'] as string || generateId();
        req.headers['x-request-id'] = requestId;
        res.setHeader('X-Request-ID', requestId);
        next();
    };
}

function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders(): RequestHandler {
    return (req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.removeHeader('X-Powered-By');
        next();
    };
}
