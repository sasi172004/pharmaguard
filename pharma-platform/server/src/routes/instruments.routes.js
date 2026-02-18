import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { createAuditEntry } from '../middleware/audit.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /instruments
 * List all connected instruments
 */
router.get(
    '/',
    authenticate,
    authorize('instruments.read'),
    async (req, res) => {
        try {
            const { type, status } = req.query;
            const conditions = ['org_id = $1'];
            const params = [req.user.orgId];
            let paramIndex = 2;

            if (type) { conditions.push(`type = $${paramIndex++}`); params.push(type); }
            if (status) { conditions.push(`status = $${paramIndex++}`); params.push(status); }

            const result = await query(
                `SELECT i.*, 
          (SELECT COUNT(*) FROM file_uploads f WHERE f.instrument_id = i.id AND f.is_deleted = false) as upload_count,
          (SELECT MAX(f.created_at) FROM file_uploads f WHERE f.instrument_id = i.id) as last_upload_at
         FROM instruments i
         WHERE ${conditions.join(' AND ')}
         ORDER BY i.name`,
                params
            );

            res.json({ success: true, data: result.rows });
        } catch (error) {
            logger.error('List instruments error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch instruments' });
        }
    }
);

/**
 * POST /instruments
 * Register a new instrument
 */
router.post(
    '/',
    authenticate,
    authorize('instruments.manage'),
    async (req, res) => {
        try {
            const { name, type, manufacturer, model, serialNumber, location, calibrationIntervalDays } = req.body;

            if (!name || !type) {
                return res.status(400).json({ success: false, error: 'Instrument name and type are required' });
            }

            const result = await query(
                `INSERT INTO instruments (org_id, name, type, manufacturer, model, serial_number, location, calibration_interval_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
                [req.user.orgId, name, type, manufacturer, model, serialNumber, location, calibrationIntervalDays || 90]
            );

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'instrument_register',
                category: 'instrument',
                severity: 'info',
                resourceType: 'instrument',
                resourceId: result.rows[0].id,
                resourceName: name,
                description: `Instrument registered: ${name} (${type})`,
                details: { name, type, manufacturer, model, serialNumber },
            });

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            logger.error('Register instrument error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to register instrument' });
        }
    }
);

/**
 * PATCH /instruments/:id
 * Update instrument details (calibration, status, etc.)
 */
router.patch(
    '/:id',
    authenticate,
    authorize('instruments.manage'),
    async (req, res) => {
        try {
            const { status, location, lastCalibrationDate, nextCalibrationDate, qualificationStatus } = req.body;

            const currentResult = await query(
                'SELECT * FROM instruments WHERE id = $1 AND org_id = $2',
                [req.params.id, req.user.orgId]
            );

            if (currentResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Instrument not found' });
            }

            const current = currentResult.rows[0];
            const setClauses = [];
            const params = [];
            let paramIndex = 1;

            if (status) { setClauses.push(`status = $${paramIndex++}`); params.push(status); }
            if (location) { setClauses.push(`location = $${paramIndex++}`); params.push(location); }
            if (lastCalibrationDate) { setClauses.push(`last_calibration_date = $${paramIndex++}`); params.push(lastCalibrationDate); }
            if (nextCalibrationDate) { setClauses.push(`next_calibration_date = $${paramIndex++}`); params.push(nextCalibrationDate); }
            if (qualificationStatus) { setClauses.push(`qualification_status = $${paramIndex++}`); params.push(qualificationStatus); }

            if (setClauses.length === 0) {
                return res.status(400).json({ success: false, error: 'No fields to update' });
            }

            params.push(req.params.id, req.user.orgId);
            const result = await query(
                `UPDATE instruments SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND org_id = $${paramIndex}
         RETURNING *`,
                params
            );

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'instrument_update',
                category: 'instrument',
                severity: status === 'maintenance' ? 'warning' : 'info',
                resourceType: 'instrument',
                resourceId: req.params.id,
                resourceName: current.name,
                description: `Instrument updated: ${current.name}`,
                previousValue: { status: current.status, qualificationStatus: current.qualification_status },
                newValue: req.body,
            });

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            logger.error('Update instrument error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to update instrument' });
        }
    }
);

export default router;
