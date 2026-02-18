import pg from 'pg';
import config from './index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: config.db.poolMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
    }
    : {
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
        min: config.db.poolMin,
        max: config.db.poolMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { error: err.message });
});

/**
 * Execute a query with parameters
 */
export async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Query executed', {
            text: text.substring(0, 100),
            duration: `${duration}ms`,
            rows: result.rowCount,
        });
        return result;
    } catch (error) {
        logger.error('Query failed', {
            text: text.substring(0, 100),
            error: error.message,
        });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    // Wrap release to log
    client.release = () => {
        client.release = originalRelease;
        return originalRelease();
    };

    return client;
}

/**
 * Execute within a transaction
 */
export async function transaction(callback) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Test database connectivity
 */
export async function testConnection() {
    try {
        const result = await query('SELECT NOW() as now');
        logger.info('Database connected', { time: result.rows[0].now });
        return true;
    } catch (error) {
        logger.error('Database connection failed', { error: error.message });
        return false;
    }
}

export default pool;
