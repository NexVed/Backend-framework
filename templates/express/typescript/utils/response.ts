/**
 * Response Helpers
 * Standardized API response utilities
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    code?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/**
 * Send success response
 */
export function success<T>(res: Response, data: T, statusCode: number = 200): Response {
    return res.status(statusCode).json({
        success: true,
        data,
    });
}

/**
 * Send success response with message
 */
export function successWithMessage<T>(
    res: Response,
    data: T,
    message: string,
    statusCode: number = 200
): Response {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
    });
}

/**
 * Send created response (201)
 */
export function created<T>(res: Response, data: T): Response {
    return success(res, data, 201);
}

/**
 * Send no content response (204)
 */
export function noContent(res: Response): Response {
    return res.status(204).send();
}

/**
 * Send paginated response
 */
export function paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta
): Response {
    return res.status(200).json({
        success: true,
        data,
        meta: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: pagination.totalPages,
        },
    });
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
    total: number,
    page: number,
    limit: number
): PaginationMeta {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Send error response
 */
export function error(
    res: Response,
    message: string,
    statusCode: number = 400,
    code?: string,
    details?: any
): Response {
    return res.status(statusCode).json({
        success: false,
        error: getErrorName(statusCode),
        message,
        code,
        ...(details && { details }),
    });
}

/**
 * Send bad request error (400)
 */
export function badRequest(res: Response, message: string, details?: any): Response {
    return error(res, message, 400, 'BAD_REQUEST', details);
}

/**
 * Send unauthorized error (401)
 */
export function unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return error(res, message, 401, 'UNAUTHORIZED');
}

/**
 * Send forbidden error (403)
 */
export function forbidden(res: Response, message: string = 'Forbidden'): Response {
    return error(res, message, 403, 'FORBIDDEN');
}

/**
 * Send not found error (404)
 */
export function notFound(res: Response, resource: string = 'Resource'): Response {
    return error(res, `${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Send conflict error (409)
 */
export function conflict(res: Response, message: string): Response {
    return error(res, message, 409, 'CONFLICT');
}

/**
 * Send validation error (422)
 */
export function validationError(res: Response, details: any): Response {
    return error(res, 'Validation failed', 422, 'VALIDATION_ERROR', details);
}

/**
 * Send internal server error (500)
 */
export function serverError(res: Response, message: string = 'Internal server error'): Response {
    return error(res, message, 500, 'INTERNAL_ERROR');
}

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
