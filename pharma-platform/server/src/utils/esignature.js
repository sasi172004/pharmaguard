import crypto from 'crypto';
import { query } from '../config/database.js';
import { createAuditEntry } from '../middleware/audit.js';
import logger from './logger.js';

/**
 * Electronic Signature Utilities
 * 
 * 21 CFR Part 11 §11.50-11.200:
 * Electronic signatures must be:
 * - Unique to one individual
 * - Verified (re-authenticated at time of signing)
 * - Linked to the exact record version
 * - Include signer identity, date/time, and intent
 * - Immutable once applied
 */

/**
 * Create an electronic signature on a record
 */
export async function applySignature({
    orgId,
    signerId,
    signerEmail,
    signerName,
    signerRole,
    recordType,
    recordId,
    recordVersion,
    signatureType,
    intent,
    authMethod = 'password',
    ipAddress,
}) {
    // Generate signature hash (tamper-evident)
    const signatureData = JSON.stringify({
        signerId,
        recordType,
        recordId,
        recordVersion,
        signatureType,
        intent,
        timestamp: new Date().toISOString(),
    });

    const signatureHash = crypto
        .createHash('sha256')
        .update(signatureData)
        .digest('hex');

    const result = await query(
        `INSERT INTO electronic_signatures (
      org_id, signer_id, record_type, record_id, record_version,
      signature_type, intent, auth_method, auth_verified,
      signer_ip, signature_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
        [
            orgId, signerId, recordType, recordId, recordVersion,
            signatureType, intent, authMethod, true,
            ipAddress, signatureHash,
        ]
    );

    // Audit the signature event
    await createAuditEntry({
        orgId,
        userId: signerId,
        userEmail: signerEmail,
        userName: signerName,
        userRole: signerRole,
        ipAddress,
        action: 'signature_apply',
        category: 'signature',
        severity: 'info',
        resourceType: recordType,
        resourceId: recordId,
        description: `E-signature applied: ${signatureType} — "${intent}"`,
        details: {
            signatureType,
            intent,
            recordVersion,
            signatureHash,
        },
    });

    logger.info('Electronic signature applied', {
        signerId,
        recordType,
        recordId,
        signatureType,
    });

    return result.rows[0];
}

/**
 * Get signatures for a specific record
 */
export async function getSignatures(recordType, recordId) {
    const result = await query(
        `SELECT es.*, u.first_name, u.last_name, u.email, u.role
     FROM electronic_signatures es
     JOIN users u ON es.signer_id = u.id
     WHERE es.record_type = $1 AND es.record_id = $2
     ORDER BY es.signed_at DESC`,
        [recordType, recordId]
    );
    return result.rows;
}

/**
 * Verify a signature's integrity
 */
export async function verifySignature(signatureId) {
    const result = await query(
        'SELECT * FROM electronic_signatures WHERE id = $1',
        [signatureId]
    );

    if (result.rows.length === 0) {
        return { valid: false, reason: 'Signature not found' };
    }

    const sig = result.rows[0];

    // Re-compute the hash
    const signatureData = JSON.stringify({
        signerId: sig.signer_id,
        recordType: sig.record_type,
        recordId: sig.record_id,
        recordVersion: sig.record_version,
        signatureType: sig.signature_type,
        intent: sig.intent,
        timestamp: sig.signed_at.toISOString(),
    });

    const expectedHash = crypto
        .createHash('sha256')
        .update(signatureData)
        .digest('hex');

    return {
        valid: sig.is_valid && sig.signature_hash === expectedHash,
        signature: sig,
        hashMatch: sig.signature_hash === expectedHash,
        isActive: sig.is_valid,
    };
}

export default { applySignature, getSignatures, verifySignature };
