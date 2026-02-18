import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditMiddleware, createAuditEntry } from '../middleware/audit.js';
import { hashFile, hashFileMd5 } from '../utils/crypto.js';
import { query } from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.resolve(config.storage.localPath);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const storedName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, storedName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.cdf', '.csv', '.txt', '.raw', '.xlsx', '.xls', '.pdf', '.xml', '.json'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not allowed. Accepted: ${allowedExtensions.join(', ')}`));
        }
    },
});

/**
 * POST /uploads
 * Upload an instrument data file with automatic integrity hashing
 */
router.post(
    '/',
    authenticate,
    authorize('uploads.create'),
    upload.single('file'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file provided' });
            }

            const { instrumentId, batchId, notes } = req.body;
            const filePath = req.file.path;

            // Compute integrity hashes (21 CFR Part 11 requirement)
            const [sha256Hash, md5Hash] = await Promise.all([
                hashFile(filePath),
                hashFileMd5(filePath),
            ]);

            // Check for duplicate files
            const duplicate = await query(
                'SELECT id, original_filename FROM file_uploads WHERE sha256_hash = $1 AND org_id = $2 AND is_deleted = false',
                [sha256Hash, req.user.orgId]
            );

            if (duplicate.rows.length > 0) {
                // Remove uploaded duplicate
                fs.unlinkSync(filePath);
                return res.status(409).json({
                    success: false,
                    error: 'Duplicate file detected',
                    existingFile: duplicate.rows[0].original_filename,
                    existingId: duplicate.rows[0].id,
                });
            }

            // Store file record
            const result = await query(
                `INSERT INTO file_uploads (
          org_id, instrument_id, batch_id, uploaded_by,
          original_filename, stored_filename, file_path,
          file_size_bytes, mime_type, file_extension,
          sha256_hash, md5_hash,
          integrity_verified, integrity_verified_at,
          status, upload_source, upload_ip
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10,
          $11, $12,
          true, NOW(),
          'verified', $13, $14
        ) RETURNING *`,
                [
                    req.user.orgId, instrumentId || null, batchId || null, req.user.id,
                    req.file.originalname, req.file.filename, req.file.path,
                    req.file.size, req.file.mimetype, path.extname(req.file.originalname),
                    sha256Hash, md5Hash,
                    'manual', req.ip,
                ]
            );

            const uploadRecord = result.rows[0];

            // Audit trail entry
            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                action: 'file_upload',
                category: 'data_capture',
                severity: 'info',
                resourceType: 'file_upload',
                resourceId: uploadRecord.id,
                resourceName: req.file.originalname,
                description: `File uploaded: ${req.file.originalname} (${req.file.size} bytes)`,
                details: {
                    sha256: sha256Hash,
                    md5: md5Hash,
                    fileSize: req.file.size,
                    instrumentId,
                    batchId,
                },
            });

            logger.info('File uploaded', {
                fileId: uploadRecord.id,
                filename: req.file.originalname,
                hash: sha256Hash,
            });

            res.status(201).json({
                success: true,
                data: {
                    id: uploadRecord.id,
                    filename: uploadRecord.original_filename,
                    size: uploadRecord.file_size_bytes,
                    sha256: uploadRecord.sha256_hash,
                    md5: uploadRecord.md5_hash,
                    status: uploadRecord.status,
                    integrityVerified: uploadRecord.integrity_verified,
                    createdAt: uploadRecord.created_at,
                },
            });
        } catch (error) {
            logger.error('Upload error', { error: error.message });
            res.status(500).json({ success: false, error: 'Upload failed' });
        }
    }
);

/**
 * GET /uploads
 * List all file uploads with filtering and pagination
 */
router.get(
    '/',
    authenticate,
    authorize('uploads.read'),
    async (req, res) => {
        try {
            const {
                page = 1, limit = 25, status, instrumentId,
                batchId, search, sortBy = 'created_at', sortOrder = 'DESC',
            } = req.query;

            const offset = (page - 1) * limit;
            const conditions = ['fu.org_id = $1', 'fu.is_deleted = false'];
            const params = [req.user.orgId];
            let paramIndex = 2;

            if (status) {
                conditions.push(`fu.status = $${paramIndex++}`);
                params.push(status);
            }
            if (instrumentId) {
                conditions.push(`fu.instrument_id = $${paramIndex++}`);
                params.push(instrumentId);
            }
            if (batchId) {
                conditions.push(`fu.batch_id = $${paramIndex++}`);
                params.push(batchId);
            }
            if (search) {
                conditions.push(`fu.original_filename ILIKE $${paramIndex++}`);
                params.push(`%${search}%`);
            }

            const whereClause = conditions.join(' AND ');
            const allowedSort = ['created_at', 'original_filename', 'file_size_bytes', 'status'];
            const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const [dataResult, countResult] = await Promise.all([
                query(
                    `SELECT fu.*, u.first_name || ' ' || u.last_name as uploaded_by_name,
                  i.name as instrument_name, b.batch_number
           FROM file_uploads fu
           LEFT JOIN users u ON fu.uploaded_by = u.id
           LEFT JOIN instruments i ON fu.instrument_id = i.id
           LEFT JOIN batches b ON fu.batch_id = b.id
           WHERE ${whereClause}
           ORDER BY fu.${sort} ${order}
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                    [...params, limit, offset]
                ),
                query(
                    `SELECT COUNT(*) FROM file_uploads fu WHERE ${whereClause}`,
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
            logger.error('List uploads error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch uploads' });
        }
    }
);

/**
 * GET /uploads/:id
 * Get a single upload record with full details
 */
router.get(
    '/:id',
    authenticate,
    authorize('uploads.read'),
    async (req, res) => {
        try {
            const result = await query(
                `SELECT fu.*, u.first_name || ' ' || u.last_name as uploaded_by_name,
                i.name as instrument_name, i.type as instrument_type,
                b.batch_number, b.product_name
         FROM file_uploads fu
         LEFT JOIN users u ON fu.uploaded_by = u.id
         LEFT JOIN instruments i ON fu.instrument_id = i.id
         LEFT JOIN batches b ON fu.batch_id = b.id
         WHERE fu.id = $1 AND fu.org_id = $2`,
                [req.params.id, req.user.orgId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Upload not found' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            logger.error('Get upload error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to fetch upload' });
        }
    }
);

/**
 * PATCH /uploads/:id/flag
 * Flag a file for review (anomaly detected)
 */
router.patch(
    '/:id/flag',
    authenticate,
    authorize('uploads.flag'),
    async (req, res) => {
        try {
            const { reason } = req.body;
            if (!reason) {
                return res.status(400).json({ success: false, error: 'Flagging reason required' });
            }

            const result = await query(
                `UPDATE file_uploads SET status = 'flagged', flagged_reason = $1, updated_at = NOW()
         WHERE id = $2 AND org_id = $3
         RETURNING *`,
                [reason, req.params.id, req.user.orgId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Upload not found' });
            }

            await createAuditEntry({
                orgId: req.user.orgId,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                userRole: req.user.role,
                ipAddress: req.ip,
                action: 'file_flag',
                category: 'integrity',
                severity: 'warning',
                resourceType: 'file_upload',
                resourceId: req.params.id,
                resourceName: result.rows[0].original_filename,
                description: `File flagged: ${reason}`,
                details: { reason },
            });

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            logger.error('Flag upload error', { error: error.message });
            res.status(500).json({ success: false, error: 'Failed to flag upload' });
        }
    }
);

/**
 * PATCH /uploads/:id/verify
 * Re-verify file integrity
 */
router.patch(
    '/:id/verify',
    authenticate,
    authorize('uploads.verify'),
    async (req, res) => {
        try {
            const record = await query(
                'SELECT * FROM file_uploads WHERE id = $1 AND org_id = $2',
                [req.params.id, req.user.orgId]
            );

            if (record.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Upload not found' });
            }

            const file = record.rows[0];

            // Re-hash and verify
            if (fs.existsSync(file.file_path)) {
                const currentHash = await hashFile(file.file_path);
                const isValid = currentHash === file.sha256_hash;

                await query(
                    `UPDATE file_uploads SET integrity_verified = $1, integrity_verified_at = NOW(),
           status = CASE WHEN $1 THEN 'verified' ELSE 'flagged' END,
           flagged_reason = CASE WHEN NOT $1 THEN 'Integrity check failed — hash mismatch' ELSE flagged_reason END
           WHERE id = $2`,
                    [isValid, file.id]
                );

                await createAuditEntry({
                    orgId: req.user.orgId,
                    userId: req.user.id,
                    userEmail: req.user.email,
                    userName: req.user.name,
                    userRole: req.user.role,
                    ipAddress: req.ip,
                    action: 'file_verify',
                    category: 'integrity',
                    severity: isValid ? 'info' : 'critical',
                    resourceType: 'file_upload',
                    resourceId: file.id,
                    resourceName: file.original_filename,
                    description: isValid
                        ? `Integrity verified: SHA-256 matches`
                        : `INTEGRITY FAILURE: SHA-256 mismatch detected`,
                    details: {
                        expectedHash: file.sha256_hash,
                        actualHash: currentHash,
                        isValid,
                    },
                });

                res.json({
                    success: true,
                    data: {
                        isValid,
                        expectedHash: file.sha256_hash,
                        actualHash: currentHash,
                    },
                });
            } else {
                res.status(404).json({ success: false, error: 'File not found on storage' });
            }
        } catch (error) {
            logger.error('Verify upload error', { error: error.message });
            res.status(500).json({ success: false, error: 'Verification failed' });
        }
    }
);

export default router;
