/**
 * Authentication Module
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { loadConfig } = require('../core/config');

let authConfig = null;

async function getAuthConfig() {
    if (authConfig) return authConfig;

    const config = await loadConfig();
    if (!config.auth?.jwt) {
        throw new Error('JWT configuration not found. Configure auth.jwt in backend.config.js');
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
async function generateToken(payload, options = {}) {
    const config = await getAuthConfig();

    return jwt.sign(payload, config.secret, {
        expiresIn: config.expiresIn,
        algorithm: config.algorithm,
        ...options,
    });
}

/**
 * Generate access and refresh token pair
 */
async function generateTokenPair(payload) {
    const config = await getAuthConfig();

    const accessToken = jwt.sign(payload, config.secret, {
        expiresIn: '15m',
        algorithm: config.algorithm,
    });

    const refreshToken = jwt.sign(
        { id: payload.id, type: 'refresh' },
        config.secret,
        {
            expiresIn: '30d',
            algorithm: config.algorithm,
        }
    );

    return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
    };
}

/**
 * Verify and decode JWT token
 */
async function verifyToken(token) {
    const config = await getAuthConfig();
    return jwt.verify(token, config.secret);
}

/**
 * Decode token without verification
 */
function decodeToken(token) {
    return jwt.decode(token);
}

/**
 * Check if token is expired
 */
function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password, rounds = 10) {
    return bcrypt.hash(password, rounds);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a random token
 */
function generateRandomToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    require('crypto').getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
    }
    return result;
}

/**
 * Generate OTP
 */
function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    const array = new Uint8Array(length);
    require('crypto').getRandomValues(array);
    for (let i = 0; i < length; i++) {
        otp += digits[array[i] % 10];
    }
    return otp;
}

/**
 * Extract user ID from token
 */
async function getUserIdFromToken(token) {
    try {
        const decoded = await verifyToken(token);
        return decoded.id || null;
    } catch {
        return null;
    }
}

/**
 * Authentication middleware
 */
function withAuth() {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'No authentication token provided',
                });
            }

            const decoded = await verifyToken(token);

            req.user = decoded;
            req.token = token;

            next();
        } catch (error) {
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

function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    if (req.query.token && typeof req.query.token === 'string') {
        return req.query.token;
    }

    if (req.cookies?.token) {
        return req.cookies.token;
    }

    return null;
}

const requireAuth = withAuth;

function optionalAuth() {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);

            if (token) {
                const decoded = await verifyToken(token);
                req.user = decoded;
                req.token = token;
            }

            next();
        } catch (error) {
            next();
        }
    };
}

function requireRole(...roles) {
    return (req, res, next) => {
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

module.exports = {
    generateToken,
    generateTokenPair,
    verifyToken,
    decodeToken,
    isTokenExpired,
    hashPassword,
    comparePassword,
    generateRandomToken,
    generateOTP,
    getUserIdFromToken,
    withAuth,
    requireAuth,
    optionalAuth,
    requireRole,
    jwt,
    bcrypt,
};
