import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { createAuditEntry } from '../middleware/audit.js';
import { applySignature, getSignatures } from '../utils/esignature.js';
import { query, transaction } from '../config/database.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /documents
 * List documents with filtering
 */
router.get(
    '/',
    authenticate,
    authorize('documents.read'),
    async (req, res) => {
        try {
            const {
                page = 1, limit = 25, category, status, department, search,
                sortBy = 'updated_at', sortOrder = 'DESC',
            } = req.query;

            const offset = (page - 1) * limit;
            const conditions = ['d.org_id = $1', 'd.is_deleted = false'];
            const params = [req.user.orgId];
            let paramIndex = 2;

            if (category) { conditions.push(`d.category = $${paramIndex++}`); params.push(category); }
            if (status) { conditions.push(`d.status = $${paramIndex++}`); params.push(status); }
            if (department) { conditions.push(`d.department = $${paramIndex++}`); params.push(department); }
            if (search) {
                conditions.push(`(d.title ILIKE $${paramIndex} OR d.document_number ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            const whereClause = conditions.join(' AND ');

            const [dataResult, countResult] = await Promise.all([
                query(
                    `SELECT d.*, 
            a.first_name || ' ' || a.last_name as author_name,
            r.first_name || ' ' || r.last_name as reviewer_name,
            ap.first_name || ' ' || ap.last_name as approver_name,
            (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) as version_count
           FROM documents d 
           LEFT JOIN users a ON d.author_id = a.id
           LEFT JOIN users r ON d.reviewer_id = r.id
           LEFT JOIN users ap ON d.approver_id = ap.id
           WHERE ${whereClause}
           ORDER BY d.${sortBy} ${sortOrder}
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                    [...params, limit, offset]
                ),
                query(
                    `SELECT COUNT(*) FROM documents d WHERE ${whereClause}`,
                    params
                ),
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
            logger.error('List documents error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch documents' });
        }
    }
);

/**
 * POST /documents
 * Create a new document
 */
router.post(
    '/',
    authenticate,
    authorize('documents.create'),
    async (req, res) => {
        try {
            const { documentNumber, title, category, department, tags } = req.body;

            if (!documentNumber || !title || !category) {
                return res.status(400).json({
                    success: false,
                    error: 'Document number, title, and category are required',
                });
            }

            const result = await transaction(async (client) => {
                // Create document
                const docResult = await client.query(
                    `INSERT INTO documents (org_id, document_number, title, category, department, author_id, tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
                    [req.user.orgId, documentNumber, title, category, department, req.user.id, tags || []]
                );

                const doc = docResult.rows[0];

                // Create initial version
                await client.query(
                    `INSERT INTO document_versions (document_id, version_number, created_by, change_summary, status)
           VALUES ($1, '1.0', $2, 'Initial draft', 'draft')`,
                    [doc.id, req.user.id]
                );

                return doc;
            });

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'doc_create',
                category: 'document_control',
                severity: 'info',
                resourceType: 'document',
                resourceId: result.id,
                resourceName: title,
                description: `Document created: ${documentNumber} — ${title}`,
                details: { documentNumber, category, department },
            });

            res.status(201).json({ success: true, data: result });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ success: false, error: 'Document number already exists' });
            }
            logger.error('Create document error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to create document' });
        }
    }
);

/**
 * GET /documents/:id
 * Get document with version history
 */
router.get(
    '/:id',
    authenticate,
    authorize('documents.read'),
    async (req, res) => {
        try {
            const [docResult, versionsResult, signaturesResult] = await Promise.all([
                query(
                    `SELECT d.*, 
            a.first_name || ' ' || a.last_name as author_name,
            r.first_name || ' ' || r.last_name as reviewer_name,
            ap.first_name || ' ' || ap.last_name as approver_name
           FROM documents d 
           LEFT JOIN users a ON d.author_id = a.id
           LEFT JOIN users r ON d.reviewer_id = r.id
           LEFT JOIN users ap ON d.approver_id = ap.id
           WHERE d.id = $1 AND d.org_id = $2`,
                    [req.params.id, req.user.orgId]
                ),
                query(
                    `SELECT dv.*, u.first_name || ' ' || u.last_name as created_by_name
           FROM document_versions dv
           LEFT JOIN users u ON dv.created_by = u.id
           WHERE dv.document_id = $1
           ORDER BY dv.created_at DESC`,
                    [req.params.id]
                ),
                getSignatures('document', req.params.id),
            ]);

            if (docResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Document not found' });
            }

            res.json({
                success: true,
                data: {
                    ...docResult.rows[0],
                    versions: versionsResult.rows,
                    signatures: signaturesResult,
                },
            });
        } catch (error) {
            logger.error('Get document error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch document' });
        }
    }
);

/**
 * PATCH /documents/:id/approve
 * Approve a document with e-signature
 */
router.patch(
    '/:id/approve',
    authenticate,
    authorize('documents.approve'),
    async (req, res) => {
        try {
            const { intent, effectiveDate } = req.body;

            if (!intent) {
                return res.status(400).json({ success: false, error: 'Approval intent/reason is required' });
            }

            const docResult = await query(
                'SELECT * FROM documents WHERE id = $1 AND org_id = $2',
                [req.params.id, req.user.orgId]
            );

            if (docResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Document not found' });
            }

            const doc = docResult.rows[0];
            const previousStatus = doc.status;

            // Update document status
            await query(
                `UPDATE documents SET status = 'approved', approver_id = $1, 
         effective_date = $2, updated_at = NOW()
         WHERE id = $3`,
                [req.user.id, effectiveDate || new Date(), req.params.id]
            );

            // Apply electronic signature
            await applySignature({
                orgId: req.user.orgId,
                signerId: req.user.id,
                signerEmail: req.user.email,
                signerName: req.user.name,
                signerRole: req.user.role,
                recordType: 'document',
                recordId: doc.id,
                recordVersion: doc.current_version,
                signatureType: 'approval',
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
                action: 'doc_approve',
                category: 'document_control',
                severity: 'info',
                resourceType: 'document',
                resourceId: doc.id,
                resourceName: doc.title,
                description: `Document approved: ${doc.document_number} v${doc.current_version}`,
                details: { intent, effectiveDate },
                previousValue: { status: previousStatus },
                newValue: { status: 'approved' },
            });

            res.json({
                success: true,
                message: 'Document approved with electronic signature',
            });
        } catch (error) {
            logger.error('Approve document error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to approve document' });
        }
    }
);

export default router;
