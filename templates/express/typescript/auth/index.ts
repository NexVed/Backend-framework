/**
 * Authentication Module
 * JWT tokens, password hashing, and session management
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { loadConfig } from '../core/config';

export interface TokenPayload {
    id: string;
    email?: string;
    role?: string;
    [key: string]: any;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

let authConfig: { secret: string; expiresIn: string; algorithm: string } | null = null;

async function getAuthConfig() {
    if (authConfig) return authConfig;

    const config = await loadConfig();
    if (!config.auth?.jwt) {
        throw new Error('JWT configuration not found. Configure auth.jwt in backend.config.ts');
    }

    authConfig = {
        secret: config.auth.jwt.secret,
        expiresIn: config.auth.jwt.expiresIn || '7d',
        algorithm: config.auth.jwt.algorithm || 'HS256',
    };

    return authConfig;
}

/**
 * Generate JWT access token
 */
export async function generateToken(payload: TokenPayload, options?: SignOptions): Promise<string> {
    const config = await getAuthConfig();

    return jwt.sign(payload, config.secret, {
        expiresIn: config.expiresIn,
        algorithm: config.algorithm as any,
        ...options,
    });
}

/**
 * Generate access and refresh token pair
 */
export async function generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const config = await getAuthConfig();

    const accessToken = jwt.sign(payload, config.secret, {
        expiresIn: '15m',
        algorithm: config.algorithm as any,
    });

    const refreshToken = jwt.sign(
        { id: payload.id, type: 'refresh' },
        config.secret,
        {
            expiresIn: '30d',
            algorithm: config.algorithm as any,
        }
    );

    return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
    };
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken<T extends TokenPayload = TokenPayload>(token: string): Promise<T> {
    const config = await getAuthConfig();
    return jwt.verify(token, config.secret) as T;
}

/**
 * Decode token without verification (useful for expired tokens)
 */
export function decodeToken<T extends TokenPayload = TokenPayload>(token: string): T | null {
    const decoded = jwt.decode(token);
    return decoded as T | null;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string, rounds: number = 10): Promise<string> {
    return bcrypt.hash(password, rounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a random token (for password reset, email verification, etc.)
 */
export function generateRandomToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
    }
    return result;
}

/**
 * Generate a secure OTP (One-Time Password)
 */
export function generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        otp += digits[array[i] % 10];
    }
    return otp;
}

/**
 * Extract user ID from token
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
    try {
        const decoded = await verifyToken(token);
        return decoded.id || null;
    } catch {
        return null;
    }
}

// Re-export for convenience
export { jwt, bcrypt };
