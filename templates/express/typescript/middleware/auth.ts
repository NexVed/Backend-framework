/**
 * Authentication Middleware
 * JWT and session-based authentication
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { loadConfig } from '../core/config';

export interface AuthUser {
    id: string;
    email?: string;
    role?: string;
    [key: string]: any;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
            token?: string;
        }
    }
}

let jwtSecret: string | null = null;

async function getJwtSecret(): Promise<string> {
    if (jwtSecret) return jwtSecret;

    const config = await loadConfig();
    if (!config.auth?.jwt?.secret) {
        throw new Error('JWT secret not configured. Set auth.jwt.secret in backend.config.ts');
    }

    jwtSecret = config.auth.jwt.secret;
    return jwtSecret;
}

/**
 * Authentication middleware - requires valid JWT
 */
export function withAuth(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = extractToken(req);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'No authentication token provided',
                });
            }

            const secret = await getJwtSecret();
            const decoded = jwt.verify(token, secret) as AuthUser;

            req.user = decoded;
            req.token = token;

            next();
        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Token has expired',
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Invalid token',
                });
            }

            next(error);
        }
    };
}

/**
 * Alias for withAuth()
 */
export const requireAuth = withAuth;

/**
 * Optional authentication - continues even without token
 */
export function optionalAuth(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = extractToken(req);

            if (token) {
                const secret = await getJwtSecret();
                const decoded = jwt.verify(token, secret) as AuthUser;
                req.user = decoded;
                req.token = token;
            }

            next();
        } catch (error) {
            // Continue without user on error
            next();
        }
    };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles: string[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        if (!req.user.role || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: `Requires one of these roles: ${roles.join(', ')}`,
            });
        }

        next();
    };
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // Check query parameter
    if (req.query.token && typeof req.query.token === 'string') {
        return req.query.token;
    }

    // Check cookie
    if (req.cookies?.token) {
        return req.cookies.token;
    }

    return null;
}
