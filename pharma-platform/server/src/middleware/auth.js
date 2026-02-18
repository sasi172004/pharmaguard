import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token and attaches user info to req.user
 * Required for 21 CFR Part 11: unique authenticated user identification
 */
export function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret);

        // Attach user info to request
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            orgId: decoded.orgId,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please refresh or re-authenticate.',
                code: 'TOKEN_EXPIRED',
            });
        }

        logger.warn('Authentication failed', {
            error: error.message,
            ip: req.ip,
        });

        return res.status(401).json({
            success: false,
            error: 'Invalid authentication token',
            code: 'INVALID_TOKEN',
        });
    }
}

/**
 * Optional authentication — sets req.user if token exists, but doesn't block
 */
export function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = {
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
                orgId: decoded.orgId,
            };
        }
    } catch (e) {
        // Ignore — optional
    }
    next();
}

/**
 * API Key Authentication — for watch agents and external integrations
 */
export async function authenticateApiKey(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key required',
                code: 'API_KEY_REQUIRED',
            });
        }

        const keyPrefix = apiKey.substring(0, 8);
        const result = await query(
            `SELECT ak.*, o.id as org_id, o.name as org_name
       FROM api_keys ak
       JOIN organizations o ON ak.org_id = o.id
       WHERE ak.key_prefix = $1 AND ak.status = 'active'
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
            [keyPrefix]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired API key',
                code: 'INVALID_API_KEY',
            });
        }

        // In production, verify the full hashed key using bcrypt
        const keyRecord = result.rows[0];

        // Update last used timestamp
        await query(
            'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
            [keyRecord.id]
        );

        req.apiKey = {
            id: keyRecord.id,
            orgId: keyRecord.org_id,
            name: keyRecord.name,
            permissions: keyRecord.permissions,
        };

        next();
    } catch (error) {
        logger.error('API key authentication failed', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            code: 'AUTH_ERROR',
        });
    }
}

/**
 * Generate JWT tokens (access + refresh)
 */
export function generateTokens(user) {
    const accessToken = jwt.sign(
        {
            sub: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            orgId: user.org_id,
            type: 'access',
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
        {
            sub: user.id,
            type: 'refresh',
        },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
    return jwt.verify(token, config.jwt.refreshSecret);
}
