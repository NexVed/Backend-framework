/**
 * Logging Middleware
 * Request/Response logging
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface LogEntry {
    timestamp: string;
    requestId?: string;
    method: string;
    path: string;
    query?: Record<string, any>;
    statusCode?: number;
    duration?: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggingOptions {
    level?: LogLevel;
    format?: 'json' | 'pretty';
    skipPaths?: string[];
    includeBody?: boolean;
    includeQuery?: boolean;
}

const defaultOptions: LoggingOptions = {
    level: 'info',
    format: 'pretty',
    skipPaths: ['/health', '/favicon.ico'],
    includeBody: false,
    includeQuery: true,
};

/**
 * Request logging middleware
 */
export function withLogging(options: LoggingOptions = {}): RequestHandler {
    const opts = { ...defaultOptions, ...options };

    return (req: Request, res: Response, next: NextFunction) => {
        // Skip configured paths
        if (opts.skipPaths?.some(path => req.path.startsWith(path))) {
            return next();
        }

        const startTime = Date.now();
        const requestId = req.headers['x-request-id'] as string;

        // Log request
        if (shouldLog('debug', opts.level!)) {
            const logEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                requestId,
                method: req.method,
                path: req.path,
                ip: getClientIP(req),
                userAgent: req.headers['user-agent'],
            };

            if (opts.includeQuery && Object.keys(req.query).length > 0) {
                logEntry.query = req.query;
            }

            log('debug', '→ Request', logEntry, opts.format!);
        }

        // Capture response
        const originalSend = res.send;
        res.send = function (body: any) {
            res.locals.body = body;
            return originalSend.call(this, body);
        };

        // Log response on finish
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const logEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                userId: req.user?.id,
            };

            const level = getLogLevel(res.statusCode);
            const emoji = getStatusEmoji(res.statusCode);

            log(level, `${emoji} ${req.method} ${req.path}`, logEntry, opts.format!);
        });

        next();
    };
}

/**
 * Simple request logger (one-line format)
 */
export function requestLogger(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            const emoji = getStatusEmoji(res.statusCode);
            console.log(`${emoji} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        });

        next();
    };
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
    return (
        req.headers['x-forwarded-for']?.toString().split(',')[0] ||
        req.headers['x-real-ip']?.toString() ||
        req.socket.remoteAddress ||
        'unknown'
    );
}

/**
 * Determine log level based on status code
 */
function getLogLevel(statusCode: number): LogLevel {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
}

/**
 * Get emoji for status code
 */
function getStatusEmoji(statusCode: number): string {
    if (statusCode >= 500) return '❌';
    if (statusCode >= 400) return '⚠️';
    if (statusCode >= 300) return '↪️';
    return '✅';
}

/**
 * Check if should log based on level
 */
function shouldLog(messageLevel: LogLevel, currentLevel: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };
    return levels[messageLevel] >= levels[currentLevel];
}

/**
 * Log message
 */
function log(level: LogLevel, message: string, data: LogEntry, format: 'json' | 'pretty'): void {
    if (format === 'json') {
        console[level](JSON.stringify({ level, message, ...data }));
    } else {
        const statusStr = data.statusCode ? ` ${data.statusCode}` : '';
        const durationStr = data.duration ? ` ${data.duration}ms` : '';
        console[level](`[${data.timestamp}] ${message}${statusStr}${durationStr}`);
    }
}
