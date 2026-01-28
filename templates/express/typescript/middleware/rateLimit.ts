/**
 * Rate Limiting Middleware
 * Protect against abuse and DDoS
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface RateLimitConfig {
    windowMs: number;       // Time window in milliseconds
    max: number;            // Maximum requests per window
    message?: string;       // Custom error message
    keyGenerator?: (req: Request) => string;  // Custom key generator
    skip?: (req: Request) => boolean;         // Skip rate limiting for certain requests
    headers?: boolean;      // Include rate limit info in headers
}

interface RateLimitStore {
    hits: number;
    resetTime: number;
}

// In-memory store (replace with Redis for distributed systems)
const store = new Map<string, RateLimitStore>();

/**
 * Rate limiting middleware
 */
export function withRateLimit(config: Partial<RateLimitConfig> = {}): RequestHandler {
    const options: RateLimitConfig = {
        windowMs: config.windowMs || 60 * 1000, // 1 minute default
        max: config.max || 100,                  // 100 requests per window
        message: config.message || 'Too many requests, please try again later.',
        keyGenerator: config.keyGenerator || defaultKeyGenerator,
        skip: config.skip || (() => false),
        headers: config.headers ?? true,
    };

    // Cleanup old entries periodically
    setInterval(() => cleanupStore(options.windowMs), options.windowMs);

    return (req: Request, res: Response, next: NextFunction) => {
        // Skip if configured
        if (options.skip!(req)) {
            return next();
        }

        const key = options.keyGenerator!(req);
        const now = Date.now();

        let record = store.get(key);

        // Initialize or reset if window expired
        if (!record || now >= record.resetTime) {
            record = {
                hits: 0,
                resetTime: now + options.windowMs,
            };
        }

        record.hits++;
        store.set(key, record);

        // Set headers
        if (options.headers) {
            const remaining = Math.max(0, options.max - record.hits);
            const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

            res.setHeader('X-RateLimit-Limit', options.max);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', resetSeconds);
        }

        // Check if limit exceeded
        if (record.hits > options.max) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);

            return res.status(429).json({
                success: false,
                error: 'Too Many Requests',
                message: options.message,
                retryAfter,
            });
        }

        next();
    };
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: Request): string {
    return (
        req.headers['x-forwarded-for']?.toString().split(',')[0] ||
        req.headers['x-real-ip']?.toString() ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

/**
 * Cleanup expired entries
 */
function cleanupStore(windowMs: number): void {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
        if (now >= record.resetTime + windowMs) {
            store.delete(key);
        }
    }
}

/**
 * Create a stricter rate limit for sensitive endpoints
 */
export function strictRateLimit(): RequestHandler {
    return withRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,                    // 5 attempts
        message: 'Too many attempts, please try again after 15 minutes.',
    });
}

/**
 * Rate limit by user ID for authenticated endpoints
 */
export function userRateLimit(max: number = 1000): RequestHandler {
    return withRateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max,
        keyGenerator: (req) => req.user?.id || defaultKeyGenerator(req),
    });
}
