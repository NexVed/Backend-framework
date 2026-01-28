/**
 * Validation Middleware
 * Request validation using Zod
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

export interface ValidationOptions {
    abortEarly?: boolean;
    stripUnknown?: boolean;
}

/**
 * Generic validation middleware factory
 */
export function withValidation<T>(
    schema: ZodSchema<T>,
    source: 'body' | 'query' | 'params' = 'body',
    options: ValidationOptions = {}
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[source];
            const result = schema.safeParse(data);

            if (!result.success) {
                const errors = formatZodErrors(result.error);

                return res.status(400).json({
                    success: false,
                    error: 'Validation Error',
                    message: 'Invalid request data',
                    details: errors,
                });
            }

            // Replace with validated/transformed data
            req[source] = result.data as any;
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Validate request body
 */
export function validateBody<T>(schema: ZodSchema<T>, options?: ValidationOptions): RequestHandler {
    return withValidation(schema, 'body', options);
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>, options?: ValidationOptions): RequestHandler {
    return withValidation(schema, 'query', options);
}

/**
 * Validate route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>, options?: ValidationOptions): RequestHandler {
    return withValidation(schema, 'params', options);
}

/**
 * Validate multiple sources at once
 */
export function validateRequest<
    TBody = any,
    TQuery = any,
    TParams = any
>(schemas: {
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
    params?: ZodSchema<TParams>;
}): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: Array<{ source: string; issues: Array<{ path: string; message: string }> }> = [];

        for (const [source, schema] of Object.entries(schemas)) {
            if (!schema) continue;

            const data = req[source as keyof typeof req];
            const result = (schema as ZodSchema).safeParse(data);

            if (!result.success) {
                errors.push({
                    source,
                    issues: formatZodErrors(result.error),
                });
            } else {
                (req as any)[source] = result.data;
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid request data',
                details: errors,
            });
        }

        next();
    };
}

/**
 * Format Zod errors into readable format
 */
function formatZodErrors(error: ZodError): Array<{ path: string; message: string }> {
    return error.issues.map((issue: ZodIssue) => ({
        path: issue.path.join('.') || 'root',
        message: issue.message,
    }));
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
    // Pagination
    pagination: () => {
        const { z } = require('zod');
        return z.object({
            page: z.coerce.number().int().positive().default(1),
            limit: z.coerce.number().int().positive().max(100).default(20),
        });
    },

    // ID parameter
    idParam: () => {
        const { z } = require('zod');
        return z.object({
            id: z.string().min(1),
        });
    },

    // UUID parameter
    uuidParam: () => {
        const { z } = require('zod');
        return z.object({
            id: z.string().uuid(),
        });
    },
};
