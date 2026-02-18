import crypto from 'crypto';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Audit Trail Middleware
 * Automatically creates immutable, tamper-evident audit log entries.
 * 
 * 21 CFR Part 11 §11.10(e):
 * "Use of secure, computer-generated, time-stamped audit trails to
 *  independently record the date and time of operator entries and actions."
 * 
 * Each entry includes:
 * - WHO: user ID, email, name, role, IP address
 * - WHAT: action, category, severity
 * - ON WHAT: resource type, ID, name
 * - WHEN: server timestamp (not client-supplied)
 * - TAMPER EVIDENCE: SHA-256 hash chain linking entries
 */

/**
 * Create an audit trail entry
 * This is the core function — used by middleware and controllers
 */
export async function createAuditEntry({
    orgId,
    userId,
    userEmail,
    userName,
    userRole,
    ipAddress,
    userAgent,
    action,
    category,
    severity = 'info',
    resourceType,
    resourceId,
    resourceName,
    description,
    details = {},
    previousValue = null,
    newValue = null,
}) {
    try {
        // Get the previous entry's hash for chain integrity
        const prevResult = await query(
            `SELECT entry_hash, sequence_number FROM audit_trail 
       WHERE org_id = $1 ORDER BY sequence_number DESC LIMIT 1`,
            [orgId]
        );

        const previousHash = prevResult.rows.length > 0 ? prevResult.rows[0].entry_hash : null;
        const sequenceNumber = prevResult.rows.length > 0
            ? parseInt(prevResult.rows[0].sequence_number) + 1
            : 1;

        // Compute tamper-evident hash
        const hashInput = JSON.stringify({
            orgId,
            userId,
            action,
            resourceType,
            resourceId,
            description,
            details,
            previousHash,
            sequenceNumber,
            timestamp: new Date().toISOString(),
        });

        const entryHash = crypto
            .createHash('sha256')
            .update(hashInput)
            .digest('hex');

        // Insert immutable audit record
        const result = await query(
            `INSERT INTO audit_trail (
        org_id, user_id, user_email, user_name, user_role,
        ip_address, user_agent, action, category, severity,
        resource_type, resource_id, resource_name, description,
        details, previous_value, new_value,
        entry_hash, previous_hash, sequence_number
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20
      ) RETURNING id, created_at`,
            [
                orgId, userId, userEmail, userName, userRole,
                ipAddress, userAgent, action, category, severity,
                resourceType, resourceId, resourceName, description,
                JSON.stringify(details), previousValue ? JSON.stringify(previousValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                entryHash, previousHash, sequenceNumber,
            ]
        );

        return result.rows[0];
    } catch (error) {
        // Audit trail failures are critical — log but don't crash the request
        logger.error('CRITICAL: Audit trail entry creation failed', {
            action,
            resourceType,
            resourceId,
            error: error.message,
        });
        // In production, you might want to halt the operation if audit fails
        // For now, we log the failure
    }
}

/**
 * Express middleware that auto-logs API requests to the audit trail
 * Attach to specific routes where action tracking is needed
 * 
 * Usage: router.post('/upload', auditMiddleware('file_upload', 'data_capture'), handler)
 */
export function auditMiddleware(action, category, severity = 'info') {
    return (req, res, next) => {
        // Store audit context on request for the controller to finalize
        req.auditContext = {
            action,
            category,
            severity,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };

        // Intercept response to log after completion
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            // Only audit successful operations
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                const auditData = {
                    orgId: req.user.orgId,
                    userId: req.user.id,
                    userEmail: req.user.email,
                    userName: req.user.name,
                    userRole: req.user.role,
                    ipAddress: req.auditContext.ipAddress,
                    userAgent: req.auditContext.userAgent,
                    action: req.auditContext.action,
                    category: req.auditContext.category,
                    severity: req.auditContext.severity,
                    resourceType: req.auditContext.resourceType || null,
                    resourceId: req.auditContext.resourceId || null,
                    resourceName: req.auditContext.resourceName || null,
                    description: req.auditContext.description || `${action} performed`,
                    details: req.auditContext.details || {},
                    previousValue: req.auditContext.previousValue || null,
                    newValue: req.auditContext.newValue || null,
                };

                // Fire-and-forget (non-blocking)
                createAuditEntry(auditData).catch((err) => {
                    logger.error('Audit middleware logging failed', { error: err.message });
                });
            }

            return originalJson(body);
        };

        next();
    };
}

/**
 * Automatically audit all login events (success and failure)
 */
export async function auditLogin({
    orgId,
    userId,
    userEmail,
    success,
    ipAddress,
    userAgent,
    failureReason = null,
}) {
    await createAuditEntry({
        orgId: orgId || '00000000-0000-0000-0000-000000000000',
        userId: userId || null,
        userEmail,
        userName: userEmail,
        userRole: null,
        ipAddress,
        userAgent,
        action: success ? 'user_login' : 'user_login_failed',
        category: 'access_control',
        severity: success ? 'info' : 'warning',
        resourceType: 'user',
        resourceId: userId,
        resourceName: userEmail,
        description: success
            ? `User ${userEmail} logged in successfully`
            : `Login failed for ${userEmail}: ${failureReason}`,
        details: { success, failureReason },
    });
}

export default { createAuditEntry, auditMiddleware, auditLogin };
