import winston from 'winston';
import config from '../config/index.js';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'pharmaguard-api' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 1
                        ? ` ${JSON.stringify(meta, null, 0)}`
                        : '';
                    return `${timestamp} [${level}]: ${message}${metaStr}`;
                })
            ),
        }),
        // File transport — persistent logs for compliance
        new winston.transports.File({
            filename: config.logging.file,
            maxsize: 10 * 1024 * 1024, // 10MB per file
            maxFiles: 30,              // Keep 30 days of logs
            tailable: true,
        }),
        // Error-only file
        new winston.transports.File({
            filename: config.logging.file.replace('.log', '.error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 90,
        }),
    ],
});

export default logger;
