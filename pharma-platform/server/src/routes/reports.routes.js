import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { createAuditEntry } from '../middleware/audit.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /reports
 * List generated compliance reports
 */
router.get(
    '/',
    authenticate,
    authorize('reports.read'),
    async (req, res) => {
        try {
            const { reportType, page = 1, limit = 25 } = req.query;
            const offset = (page - 1) * limit;
            const conditions = ['cr.org_id = $1'];
            const params = [req.user.orgId];
            let paramIndex = 2;

            if (reportType) { conditions.push(`cr.report_type = $${paramIndex++}`); params.push(reportType); }

            const result = await query(
                `SELECT cr.*, u.first_name || ' ' || u.last_name as generated_by_name
         FROM compliance_reports cr
         LEFT JOIN users u ON cr.generated_by = u.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY cr.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                [...params, limit, offset]
            );

            res.json({ success: true, data: result.rows });
        } catch (error) {
            logger.error('List reports error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch reports' });
        }
    }
);

/**
 * POST /reports/generate
 * Generate a compliance report
 */
router.post(
    '/generate',
    authenticate,
    authorize('reports.generate'),
    async (req, res) => {
        try {
            const { reportType, title, description, startDate, endDate, batchIds, parameters } = req.body;

            if (!reportType || !title) {
                return res.status(400).json({ success: false, error: 'Report type and title are required' });
            }

            // In production, this would trigger async report generation
            // For now, we create the report record
            const result = await query(
                `INSERT INTO compliance_reports (
          org_id, report_type, title, description, generated_by,
          date_range_start, date_range_end, linked_batch_ids, parameters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
                [
                    req.user.orgId, reportType, title, description, req.user.id,
                    startDate, endDate, batchIds || [], JSON.stringify(parameters || {}),
                ]
            );

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'report_generate',
                category: 'reporting',
                severity: 'info',
                resourceType: 'report',
                resourceId: result.rows[0].id,
                resourceName: title,
                description: `Compliance report generated: ${title} (${reportType})`,
                details: { reportType, startDate, endDate },
            });

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            logger.error('Generate report error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to generate report' });
        }
    }
);

/**
 * GET /reports/dashboard
 * Dashboard summary data (metrics, trends)
 */
router.get(
    '/dashboard/summary',
    authenticate,
    async (req, res) => {
        try {
            const orgId = req.user.orgId;

            const [
                uploadStats,
                documentStats,
                batchStats,
                auditStats,
                recentUploads,
            ] = await Promise.all([
                query(
                    `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'verified') as verified,
            COUNT(*) FILTER (WHERE status = 'flagged') as flagged,
            COUNT(*) FILTER (WHERE status = 'pending_verification') as pending
           FROM file_uploads WHERE org_id = $1 AND is_deleted = false`,
                    [orgId]
                ),
                query(
                    `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'approved' OR status = 'effective') as approved,
            COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
            COUNT(*) FILTER (WHERE status = 'draft') as draft
           FROM documents WHERE org_id = $1 AND is_deleted = false`,
                    [orgId]
                ),
                query(
                    `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'released') as released,
            COUNT(*) FILTER (WHERE status = 'pending_release') as pending_release
           FROM batches WHERE org_id = $1`,
                    [orgId]
                ),
                query(
                    `SELECT 
            COUNT(*) as total_30d,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical_30d
           FROM audit_trail 
           WHERE org_id = $1 AND created_at >= NOW() - interval '30 days'`,
                    [orgId]
                ),
                query(
                    `SELECT fu.original_filename, fu.status, fu.created_at,
                  u.first_name || ' ' || u.last_name as uploaded_by_name,
                  i.name as instrument_name
           FROM file_uploads fu
           LEFT JOIN users u ON fu.uploaded_by = u.id
           LEFT JOIN instruments i ON fu.instrument_id = i.id
           WHERE fu.org_id = $1 AND fu.is_deleted = false
           ORDER BY fu.created_at DESC LIMIT 10`,
                    [orgId]
                ),
            ]);

            res.json({
                success: true,
                data: {
                    uploads: uploadStats.rows[0],
                    documents: documentStats.rows[0],
                    batches: batchStats.rows[0],
                    audit: auditStats.rows[0],
                    recentUploads: recentUploads.rows,
                },
            });
        } catch (error) {
            logger.error('Dashboard summary error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
        }
    }
);

export default router;
