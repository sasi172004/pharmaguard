import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { createAuditEntry } from '../middleware/audit.js';
import { applySignature } from '../utils/esignature.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /batches
 * List all batches with filtering
 */
router.get(
    '/',
    authenticate,
    authorize('batches.read'),
    async (req, res) => {
        try {
            const { page = 1, limit = 25, status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
            const offset = (page - 1) * limit;
            const conditions = ['b.org_id = $1'];
            const params = [req.user.orgId];
            let paramIndex = 2;

            if (status) { conditions.push(`b.status = $${paramIndex++}`); params.push(status); }
            if (search) {
                conditions.push(`(b.product_name ILIKE $${paramIndex} OR b.batch_number ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            const whereClause = conditions.join(' AND ');

            const [dataResult, countResult] = await Promise.all([
                query(
                    `SELECT b.*, 
            u.first_name || ' ' || u.last_name as assigned_to_name,
            (SELECT COUNT(*) FROM file_uploads f WHERE f.batch_id = b.id AND f.is_deleted = false) as files_count,
            (SELECT COUNT(*) FROM electronic_signatures es WHERE es.record_type = 'batch' AND es.record_id = b.id) as signatures_count
           FROM batches b
           LEFT JOIN users u ON b.assigned_to = u.id
           WHERE ${whereClause}
           ORDER BY b.${sortBy} ${sortOrder}
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                    [...params, limit, offset]
                ),
                query(`SELECT COUNT(*) FROM batches b WHERE ${whereClause}`, params),
            ]);

            res.json({
                success: true,
                data: dataResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].count),
                    totalPages: Math.ceil(countResult.rows[0].count / limit),
                },
            });
        } catch (error) {
            logger.error('List batches error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch batches' });
        }
    }
);

/**
 * POST /batches
 * Create a new batch record
 */
router.post(
    '/',
    authenticate,
    authorize('batches.create'),
    async (req, res) => {
        try {
            const { batchNumber, productName, productCode, stage, assignedTo, startDate, targetCompletion, notes } = req.body;

            if (!batchNumber || !productName || !startDate) {
                return res.status(400).json({ success: false, error: 'Batch number, product name, and start date are required' });
            }

            const result = await query(
                `INSERT INTO batches (org_id, batch_number, product_name, product_code, stage, assigned_to, start_date, target_completion, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
                [req.user.orgId, batchNumber, productName, productCode, stage || 'raw_material', assignedTo, startDate, targetCompletion, notes]
            );

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'batch_create',
                category: 'batch_tracking',
                severity: 'info',
                resourceType: 'batch',
                resourceId: result.rows[0].id,
                resourceName: `${batchNumber} — ${productName}`,
                description: `Batch created: ${batchNumber} for ${productName}`,
                details: { batchNumber, productName, stage },
            });

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ success: false, error: 'Batch number already exists' });
            }
            logger.error('Create batch error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to create batch' });
        }
    }
);

/**
 * GET /batches/:id
 * Get batch with linked files, signatures, and audit trail
 */
router.get(
    '/:id',
    authenticate,
    authorize('batches.read'),
    async (req, res) => {
        try {
            const [batchResult, filesResult, sigResult, auditResult] = await Promise.all([
                query(
                    `SELECT b.*, u.first_name || ' ' || u.last_name as assigned_to_name
           FROM batches b LEFT JOIN users u ON b.assigned_to = u.id
           WHERE b.id = $1 AND b.org_id = $2`,
                    [req.params.id, req.user.orgId]
                ),
                query(
                    `SELECT fu.id, fu.original_filename, fu.file_size_bytes, fu.sha256_hash,
                  fu.status, fu.created_at, fu.integrity_verified,
                  i.name as instrument_name
           FROM file_uploads fu
           LEFT JOIN instruments i ON fu.instrument_id = i.id
           WHERE fu.batch_id = $1 AND fu.is_deleted = false
           ORDER BY fu.created_at DESC`,
                    [req.params.id]
                ),
                query(
                    `SELECT es.*, u.first_name || ' ' || u.last_name as signer_name
           FROM electronic_signatures es
           JOIN users u ON es.signer_id = u.id
           WHERE es.record_type = 'batch' AND es.record_id = $1
           ORDER BY es.signed_at DESC`,
                    [req.params.id]
                ),
                query(
                    `SELECT id, action, user_name, description, severity, created_at
           FROM audit_trail
           WHERE resource_type = 'batch' AND resource_id = $1
           ORDER BY created_at DESC LIMIT 20`,
                    [req.params.id]
                ),
            ]);

            if (batchResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Batch not found' });
            }

            res.json({
                success: true,
                data: {
                    ...batchResult.rows[0],
                    files: filesResult.rows,
                    signatures: sigResult.rows,
                    auditHistory: auditResult.rows,
                },
            });
        } catch (error) {
            logger.error('Get batch error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch batch' });
        }
    }
);

/**
 * PATCH /batches/:id/release
 * Release or reject a batch with e-signature
 */
router.patch(
    '/:id/release',
    authenticate,
    authorize('batches.release'),
    async (req, res) => {
        try {
            const { decision, intent } = req.body; // decision: 'release' or 'reject'

            if (!decision || !intent || !['release', 'reject'].includes(decision)) {
                return res.status(400).json({ success: false, error: 'Decision (release/reject) and intent are required' });
            }

            const batchResult = await query(
                'SELECT * FROM batches WHERE id = $1 AND org_id = $2',
                [req.params.id, req.user.orgId]
            );

            if (batchResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Batch not found' });
            }

            const batch = batchResult.rows[0];
            const newStatus = decision === 'release' ? 'released' : 'rejected';
            const newStage = decision === 'release' ? 'Released' : 'Rejected';

            await query(
                `UPDATE batches SET status = $1, stage = $2, completion_date = NOW(),
         compliance_score = CASE WHEN $1 = 'released' THEN 100 ELSE compliance_score END
         WHERE id = $3`,
                [newStatus, newStage, req.params.id]
            );

            // Apply e-signature
            await applySignature({
                orgId: req.user.orgId,
                signerId: req.user.id,
                signerEmail: req.user.email,
                signerName: req.user.name,
                signerRole: req.user.role,
                recordType: 'batch',
                recordId: batch.id,
                recordVersion: null,
                signatureType: decision,
                intent,
                ipAddress: req.ip,
            });

            // Audit trail
            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: decision === 'release' ? 'batch_release' : 'batch_reject',
                category: 'batch_tracking',
                severity: decision === 'release' ? 'info' : 'warning',
                resourceType: 'batch',
                resourceId: batch.id,
                resourceName: `${batch.batch_number} — ${batch.product_name}`,
                description: `Batch ${decision}d: ${batch.batch_number} — "${intent}"`,
                details: { decision, intent },
                previousValue: { status: batch.status },
                newValue: { status: newStatus },
            });

            res.json({ success: true, message: `Batch ${decision}d with electronic signature` });
        } catch (error) {
            logger.error('Batch release error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to process batch' });
        }
    }
);

export default router;
