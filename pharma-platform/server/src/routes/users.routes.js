import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { authorize, requireRole } from '../middleware/rbac.js';
import { createAuditEntry } from '../middleware/audit.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /users
 * List all users in the organization
 */
router.get(
    '/',
    authenticate,
    authorize('users.read'),
    async (req, res) => {
        try {
            const { role, status, search } = req.query;
            const conditions = ['org_id = $1'];
            const params = [req.user.orgId];
            let paramIndex = 2;

            if (role) { conditions.push(`role = $${paramIndex++}`); params.push(role); }
            if (status) { conditions.push(`status = $${paramIndex++}`); params.push(status); }
            if (search) {
                conditions.push(`(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            const result = await query(
                `SELECT id, email, first_name, last_name, role, department, employee_id,
                phone, mfa_enabled, status, last_login_at, created_at
         FROM users WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
                params
            );

            res.json({ success: true, data: result.rows });
        } catch (error) {
            logger.error('List users error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch users' });
        }
    }
);

/**
 * POST /users
 * Create a new user (admin/lab_director only)
 */
router.post(
    '/',
    authenticate,
    authorize('users.create'),
    async (req, res) => {
        try {
            const { email, password, firstName, lastName, role, department, employeeId, phone } = req.body;

            if (!email || !password || !firstName || !lastName || !role) {
                return res.status(400).json({ success: false, error: 'Required fields: email, password, firstName, lastName, role' });
            }

            const passwordHash = await bcrypt.hash(password, 12);

            const result = await query(
                `INSERT INTO users (org_id, email, password_hash, first_name, last_name, role, department, employee_id, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, email, first_name, last_name, role, department, status, created_at`,
                [req.user.orgId, email.toLowerCase(), passwordHash, firstName, lastName, role, department, employeeId, phone]
            );

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'user_create',
                category: 'access_control',
                severity: 'warning',
                resourceType: 'user',
                resourceId: result.rows[0].id,
                resourceName: `${firstName} ${lastName}`,
                description: `New user created: ${email} (${role})`,
                details: { email, role, department },
            });

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ success: false, error: 'Email already exists' });
            }
            logger.error('Create user error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to create user' });
        }
    }
);

/**
 * PATCH /users/:id
 * Update user details
 */
router.patch(
    '/:id',
    authenticate,
    authorize('users.update'),
    async (req, res) => {
        try {
            const { firstName, lastName, role, department, phone, status } = req.body;

            // Get current user state for audit
            const currentResult = await query(
                'SELECT * FROM users WHERE id = $1 AND org_id = $2',
                [req.params.id, req.user.orgId]
            );

            if (currentResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const currentUser = currentResult.rows[0];
            const updates = {};
            const setClauses = [];
            const params = [];
            let paramIndex = 1;

            if (firstName) { setClauses.push(`first_name = $${paramIndex++}`); params.push(firstName); updates.firstName = firstName; }
            if (lastName) { setClauses.push(`last_name = $${paramIndex++}`); params.push(lastName); updates.lastName = lastName; }
            if (role) { setClauses.push(`role = $${paramIndex++}`); params.push(role); updates.role = role; }
            if (department) { setClauses.push(`department = $${paramIndex++}`); params.push(department); updates.department = department; }
            if (phone) { setClauses.push(`phone = $${paramIndex++}`); params.push(phone); updates.phone = phone; }
            if (status) { setClauses.push(`status = $${paramIndex++}`); params.push(status); updates.status = status; }

            if (setClauses.length === 0) {
                return res.status(400).json({ success: false, error: 'No fields to update' });
            }

            params.push(req.params.id, req.user.orgId);
            const result = await query(
                `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND org_id = $${paramIndex}
         RETURNING id, email, first_name, last_name, role, department, status`,
                params
            );

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'user_update',
                category: 'access_control',
                severity: 'warning',
                resourceType: 'user',
                resourceId: req.params.id,
                resourceName: `${currentUser.first_name} ${currentUser.last_name}`,
                description: `User updated: ${currentUser.email}`,
                details: updates,
                previousValue: { role: currentUser.role, status: currentUser.status },
                newValue: updates,
            });

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            logger.error('Update user error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to update user' });
        }
    }
);

export default router;
