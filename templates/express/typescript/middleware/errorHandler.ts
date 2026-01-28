/**
 * Error Handler Middleware
 * Centralized error handling
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

/**
 * Custom Application Error
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: any;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: any
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }

    // Common error factories
    static badRequest(message: string, details?: any): AppError {
        return new AppError(message, 400, 'BAD_REQUEST', details);
    }

    static unauthorized(message: string = 'Unauthorized'): AppError {
        return new AppError(message, 401, 'UNAUTHORIZED');
    }

    static forbidden(message: string = 'Forbidden'): AppError {
        return new AppError(message, 403, 'FORBIDDEN');
    }

    static notFound(resource: string = 'Resource'): AppError {
        return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
    }

    static conflict(message: string): AppError {
        return new AppError(message, 409, 'CONFLICT');
    }

    static validation(details: any): AppError {
        return new AppError('Validation failed', 422, 'VALIDATION_ERROR', details);
    }

    static tooManyRequests(message: string = 'Too many requests'): AppError {
        return new AppError(message, 429, 'TOO_MANY_REQUESTS');
    }

    static internal(message: string = 'Internal server error'): AppError {
        return new AppError(message, 500, 'INTERNAL_ERROR');
    }
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
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
export const errorHandler: ErrorRequestHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Determine error details
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        code = 'UNAUTHORIZED';
        message = 'Invalid or expired token';
    } else if (err.name === 'SyntaxError' && 'body' in err) {
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
    }

    // Log error (in production, send to logging service)
    const logData = {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        method: req.method,
        path: req.path,
        statusCode,
        code,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };

    if (statusCode >= 500) {
        console.error('❌ Server Error:', logData);
    } else if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Client Error:', logData);
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        error: getErrorName(statusCode),
        message,
        code,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

/**
 * Get human-readable error name from status code
 */
function getErrorName(statusCode: number): string {
    const names: Record<number, string> = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
    };
    return names[statusCode] || 'Error';
}

/**
 * Async handler wrapper to catch errors
 */
export function catchAsync(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): (req: Request, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
