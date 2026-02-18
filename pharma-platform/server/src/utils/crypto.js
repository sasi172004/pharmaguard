import crypto from 'crypto';
import fs from 'fs';

/**
 * Compute SHA-256 hash of a file
 * Used for data integrity verification per 21 CFR Part 11
 */
export function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

/**
 * Compute MD5 hash of a file (secondary checksum)
 */
export function hashFileMd5(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

/**
 * Hash a string (for audit trail chaining)
 */
export function hashString(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a cryptographic nonce
 */
export function generateNonce(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Verify a file's integrity by comparing hash
 */
export async function verifyFileIntegrity(filePath, expectedHash) {
    const actualHash = await hashFile(filePath);
    return {
        isValid: actualHash === expectedHash,
        actualHash,
        expectedHash,
    };
}
