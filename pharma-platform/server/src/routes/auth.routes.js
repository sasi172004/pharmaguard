import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate, generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { auditLogin, createAuditEntry } from '../middleware/audit.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user with email/password
 * 21 CFR Part 11: Unique authenticated login with audit logging
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }

        // Find user
        const result = await query(
            `SELECT u.*, o.id as org_id, o.name as org_name
       FROM users u
       JOIN organizations o ON u.org_id = o.id
       WHERE u.email = $1`,
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            await auditLogin({
                userEmail: email,
                success: false,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                failureReason: 'User not found',
            });

            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }

        const user = result.rows[0];

        // Check if account is locked
        if (user.status === 'locked' && user.locked_until && new Date(user.locked_until) > new Date()) {
            await auditLogin({
                orgId: user.org_id,
                userId: user.id,
                userEmail: email,
                success: false,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                failureReason: 'Account locked',
            });

            return res.status(423).json({
                success: false,
                error: 'Account is locked. Please contact your administrator.',
            });
        }

        // Check account status
        if (user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated',
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            // Increment failed attempts
            const newAttempts = user.failed_login_attempts + 1;
            const shouldLock = newAttempts >= config.security.maxFailedLoginAttempts;

            await query(
                `UPDATE users SET 
          failed_login_attempts = $1,
          status = CASE WHEN $2 THEN 'locked' ELSE status END,
          locked_until = CASE WHEN $2 THEN NOW() + interval '${config.security.accountLockDurationMinutes} minutes' ELSE locked_until END
        WHERE id = $3`,
                [newAttempts, shouldLock, user.id]
            );

            await auditLogin({
                orgId: user.org_id,
                userId: user.id,
                userEmail: email,
                success: false,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                failureReason: shouldLock ? 'Account locked after max attempts' : 'Invalid password',
            });

            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                ...(shouldLock && { locked: true }),
            });
        }

        // Successful login
        const tokens = generateTokens(user);

        // Reset failed attempts and update last login
        await query(
            `UPDATE users SET 
        failed_login_attempts = 0,
        status = CASE WHEN status = 'locked' THEN 'active' ELSE status END,
        locked_until = NULL,
        last_login_at = NOW()
      WHERE id = $1`,
            [user.id]
        );

        // Audit successful login
        await auditLogin({
            orgId: user.org_id,
            userId: user.id,
            userEmail: email,
            success: true,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        logger.info('User logged in', { userId: user.id, email });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    department: user.department,
                    orgId: user.org_id,
                    orgName: user.org_name,
                },
                tokens,
            },
        });
    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, error: 'Refresh token required' });
        }

        const decoded = verifyRefreshToken(refreshToken);
        const result = await query('SELECT * FROM users WHERE id = $1 AND status = $2', [decoded.sub, 'active']);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'User not found or inactive' });
        }

        const tokens = generateTokens(result.rows[0]);
        res.json({ success: true, data: { tokens } });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
});

/**
 * POST /auth/logout
 * Invalidate current session
 */
router.post('/logout', authenticate, async (req, res) => {
    await createAuditEntry({
        orgId: req.user.orgId,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        userRole: req.user.role,
        ipAddress: req.ip,
        action: 'user_logout',
        category: 'access_control',
        severity: 'info',
        resourceType: 'user',
        resourceId: req.user.id,
        description: `User ${req.user.email} logged out`,
    });

    res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /auth/me
 * Get current authenticated user's profile
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.department,
              u.employee_id, u.phone, u.mfa_enabled, u.status, u.last_login_at,
              o.id as org_id, o.name as org_name
       FROM users u
       JOIN organizations o ON u.org_id = o.id
       WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                department: user.department,
                employeeId: user.employee_id,
                phone: user.phone,
                mfaEnabled: user.mfa_enabled,
                status: user.status,
                lastLoginAt: user.last_login_at,
                orgId: user.org_id,
                orgName: user.org_name,
            },
        });
    } catch (error) {
        logger.error('Get profile error', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /auth/change-password
 * Change password (requires current password verification)
 */
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Both current and new password required' });
        }

        if (newPassword.length < 12) {
            return res.status(400).json({ success: false, error: 'Password must be at least 12 characters' });
        }

        const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await query(
            'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
            [newHash, req.user.id]
        );

        await createAuditEntry({
            orgId: req.user.orgId,
            userId: req.user.id,
            userEmail: req.user.email,
            userName: req.user.name,
            userRole: req.user.role,
            ipAddress: req.ip,
            action: 'password_change',
            category: 'access_control',
            severity: 'warning',
            resourceType: 'user',
            resourceId: req.user.id,
            description: `Password changed for ${req.user.email}`,
        });

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Password change error', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
