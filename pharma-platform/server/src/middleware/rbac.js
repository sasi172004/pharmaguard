import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Role hierarchy — higher roles inherit lower role permissions
 */
const ROLE_HIERARCHY = {
    admin: 100,
    lab_director: 90,
    qa_manager: 80,
    compliance_officer: 70,
    qc_analyst: 50,
    lab_technician: 30,
    viewer: 10,
};

/**
 * Static role-permission mapping (fallback if DB permissions not loaded)
 */
const ROLE_PERMISSIONS = {
    admin: ['*'],  // All permissions
    lab_director: [
        'uploads.*', 'documents.*', 'batches.*', 'audit.*',
        'reports.*', 'users.*', 'settings.*', 'instruments.*', 'signatures.*',
    ],
    qa_manager: [
        'uploads.create', 'uploads.read', 'uploads.verify', 'uploads.flag', 'uploads.export',
        'documents.*',
        'batches.create', 'batches.read', 'batches.update', 'batches.release',
        'audit.read', 'audit.export',
        'reports.*',
        'users.read',
        'instruments.read',
        'signatures.*',
    ],
    compliance_officer: [
        'uploads.read', 'uploads.export',
        'documents.read', 'documents.approve',
        'batches.read',
        'audit.*',
        'reports.*',
        'users.read',
        'instruments.read',
        'signatures.read',
    ],
    qc_analyst: [
        'uploads.create', 'uploads.read',
        'documents.create', 'documents.read', 'documents.update',
        'batches.create', 'batches.read', 'batches.update',
        'audit.read',
        'reports.read',
        'instruments.read',
        'signatures.apply',
    ],
    lab_technician: [
        'uploads.create', 'uploads.read',
        'documents.read',
        'batches.read',
        'instruments.read',
    ],
    viewer: [
        'uploads.read',
        'documents.read',
        'batches.read',
        'audit.read',
        'reports.read',
        'instruments.read',
    ],
};

/**
 * Check if a role has a specific permission
 */
function roleHasPermission(role, requiredPermission) {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;

    // Admin has all permissions
    if (perms.includes('*')) return true;

    // Check exact match
    if (perms.includes(requiredPermission)) return true;

    // Check wildcard match (e.g., 'documents.*' matches 'documents.create')
    const [resource] = requiredPermission.split('.');
    if (perms.includes(`${resource}.*`)) return true;

    return false;
}

/**
 * RBAC Middleware Factory
 * Usage: authorize('documents.approve') or authorize('uploads.create', 'uploads.read')
 * 
 * 21 CFR Part 11 requires role-based access control ensuring only
 * authorized users perform specific actions.
 */
export function authorize(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
        }

        const userRole = req.user.role;

        // Check if user has ANY of the required permissions
        const hasPermission = requiredPermissions.some(
            (perm) => roleHasPermission(userRole, perm)
        );

        if (!hasPermission) {
            logger.warn('Access denied', {
                userId: req.user.id,
                role: userRole,
                required: requiredPermissions,
                path: req.path,
                method: req.method,
            });

            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                required: requiredPermissions,
                userRole: userRole,
            });
        }

        next();
    };
}

/**
 * Check minimum role level
 * Usage: requireRole('qa_manager') — allows qa_manager and above
 */
export function requireRole(minimumRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
        }

        const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minimumRole] || 100;

        if (userLevel < requiredLevel) {
            return res.status(403).json({
                success: false,
                error: `Minimum role required: ${minimumRole}`,
                code: 'INSUFFICIENT_ROLE',
            });
        }

        next();
    };
}

/**
 * Ensure user belongs to the same organization as the resource
 */
export function sameOrganization(req, res, next) {
    // Org ID from URL params or query
    const resourceOrgId = req.params.orgId || req.query.orgId;

    if (resourceOrgId && resourceOrgId !== req.user.orgId) {
        return res.status(403).json({
            success: false,
            error: 'Cross-organization access denied',
            code: 'ORG_MISMATCH',
        });
    }

    next();
}

export { ROLE_HIERARCHY, ROLE_PERMISSIONS };
