import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /audit
 * Retrieve audit trail entries with comprehensive filtering
 * 21 CFR Part 11: Audit logs must be available for inspection
 */
router.get(
    '/',
    authenticate,
    authorize('audit.read'),
    async (req, res) => {
        try {
            const {
                page = 1, limit = 50,
                userId, action, category, severity,
                resourceType, resourceId,
                startDate, endDate,
                search,
                sortOrder = 'DESC',
            } = req.query;

            const offset = (page - 1) * limit;
            const conditions = ['at.org_id = $1'];
            const params = [req.user.orgId];
            let paramIndex = 2;

            if (userId) { conditions.push(`at.user_id = $${paramIndex++}`); params.push(userId); }
            if (action) { conditions.push(`at.action = $${paramIndex++}`); params.push(action); }
            if (category) { conditions.push(`at.category = $${paramIndex++}`); params.push(category); }
            if (severity) { conditions.push(`at.severity = $${paramIndex++}`); params.push(severity); }
            if (resourceType) { conditions.push(`at.resource_type = $${paramIndex++}`); params.push(resourceType); }
            if (resourceId) { conditions.push(`at.resource_id = $${paramIndex++}`); params.push(resourceId); }
            if (startDate) { conditions.push(`at.created_at >= $${paramIndex++}`); params.push(startDate); }
            if (endDate) { conditions.push(`at.created_at <= $${paramIndex++}`); params.push(endDate); }
            if (search) {
                conditions.push(`(at.description ILIKE $${paramIndex} OR at.user_name ILIKE $${paramIndex} OR at.resource_name ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            const whereClause = conditions.join(' AND ');
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const [dataResult, countResult, summaryResult] = await Promise.all([
                query(
                    `SELECT at.*
           FROM audit_trail at
           WHERE ${whereClause}
           ORDER BY at.created_at ${order}
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                    [...params, limit, offset]
                ),
                query(
                    `SELECT COUNT(*) FROM audit_trail at WHERE ${whereClause}`,
                    params
                ),
                query(
                    `SELECT severity, COUNT(*) as count
           FROM audit_trail at
           WHERE ${whereClause}
           GROUP BY severity`,
                    params
                ),
            ]);

            const summary = {};
            summaryResult.rows.forEach(row => { summary[row.severity] = parseInt(row.count); });

            res.json({
                success: true,
                data: dataResult.rows,
                summary: {
                    info: summary.info || 0,
                    warning: summary.warning || 0,
                    critical: summary.critical || 0,
                },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].count),
                    totalPages: Math.ceil(countResult.rows[0].count / limit),
                },
            });
        } catch (error) {
            logger.error('Audit trail query error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch audit trail' });
        }
    }
);

/**
 * GET /audit/:id
 * Get a single audit trail entry with chain verification
 */
router.get(
    '/:id',
    authenticate,
    authorize('audit.read'),
    async (req, res) => {
        try {
            const result = await query(
                `SELECT * FROM audit_trail WHERE id = $1 AND org_id = $2`,
                [req.params.id, req.user.orgId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Audit entry not found' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            logger.error('Audit entry fetch error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch audit entry' });
        }
    }
);

/**
 * GET /audit/resource/:type/:id
 * Get all audit entries for a specific resource (file, document, batch)
 */
router.get(
    '/resource/:type/:resourceId',
    authenticate,
    authorize('audit.read'),
    async (req, res) => {
        try {
            const result = await query(
                `SELECT * FROM audit_trail
         WHERE org_id = $1 AND resource_type = $2 AND resource_id = $3
         ORDER BY created_at DESC`,
                [req.user.orgId, req.params.type, req.params.resourceId]
            );

            res.json({ success: true, data: result.rows });
        } catch (error) {
            logger.error('Resource audit query error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch resource audit trail' });
        }
    }
);

/**
 * GET /audit/verify-chain
 * Verify the integrity of the audit trail hash chain
 * Detects any tampering with historical audit records
 */
router.get(
    '/verify-chain',
    authenticate,
    authorize('audit.read'),
    async (req, res) => {
        try {
            const result = await query(
                `SELECT id, sequence_number, entry_hash, previous_hash
         FROM audit_trail
         WHERE org_id = $1
         ORDER BY sequence_number ASC`,
                [req.user.orgId]
            );

            let isValid = true;
            let brokenAt = null;

            for (let i = 1; i < result.rows.length; i++) {
                const current = result.rows[i];
                const previous = result.rows[i - 1];

                if (current.previous_hash !== previous.entry_hash) {
                    isValid = false;
                    brokenAt = {
                        sequenceNumber: current.sequence_number,
                        entryId: current.id,
                        expectedPreviousHash: previous.entry_hash,
                        actualPreviousHash: current.previous_hash,
                    };
                    break;
                }
            }

            res.json({
                success: true,
                data: {
                    chainValid: isValid,
                    totalEntries: result.rows.length,
                    brokenAt,
                    verifiedAt: new Date().toISOString(),
                },
            });
        } catch (error) {
            logger.error('Chain verification error', { error: error.message });
            res.status(500).json({ success: false, error: 'Chain verification failed' });
        }
    }
);

/**
 * GET /audit/stats
 * Audit trail statistics for dashboard
 */
router.get(
    '/stats/summary',
    authenticate,
    authorize('audit.read'),
    async (req, res) => {
        try {
            const { days = 30 } = req.query;

            const [totalResult, categoryResult, dailyResult] = await Promise.all([
                query(
                    `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical,
            COUNT(*) FILTER (WHERE severity = 'warning') as warning,
            COUNT(*) FILTER (WHERE severity = 'info') as info
           FROM audit_trail
           WHERE org_id = $1 AND created_at >= NOW() - interval '${days} days'`,
                    [req.user.orgId]
                ),
                query(
                    `SELECT category, COUNT(*) as count
           FROM audit_trail
           WHERE org_id = $1 AND created_at >= NOW() - interval '${days} days'
           GROUP BY category ORDER BY count DESC`,
                    [req.user.orgId]
                ),
                query(
                    `SELECT DATE(created_at) as date, COUNT(*) as count
           FROM audit_trail
           WHERE org_id = $1 AND created_at >= NOW() - interval '${days} days'
           GROUP BY DATE(created_at) ORDER BY date`,
                    [req.user.orgId]
                ),
            ]);

            res.json({
                success: true,
                data: {
                    totals: totalResult.rows[0],
                    byCategory: categoryResult.rows,
                    daily: dailyResult.rows,
                },
            });
        } catch (error) {
            logger.error('Audit stats error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch audit stats' });
        }
    }
);

export default router;
