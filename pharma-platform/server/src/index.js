import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { testConnection } from './config/database.js';
import logger from './utils/logger.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import auditRoutes from './routes/audit.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import batchesRoutes from './routes/batches.routes.js';
import usersRoutes from './routes/users.routes.js';
import instrumentsRoutes from './routes/instruments.routes.js';
import reportsRoutes from './routes/reports.routes.js';

const app = express();

// Trust proxy (Render/Vercel/Heroku)
// This is required for rate limiting to work correctly behind a load balancer
app.set('trust proxy', 1);

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet — secure HTTP headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMaxRequests,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased from 10 to 100 to prevent accidental lockouts behind proxies or multiple internal calls
    message: {
        success: false,
        error: 'Too many login attempts. Account may be locked.',
        code: 'AUTH_RATE_LIMIT',
    },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// REQUEST LOGGING
// ============================================================
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        };

        if (res.statusCode >= 400) {
            logger.warn('Request error', logData);
        } else {
            logger.debug('Request completed', logData);
        }
    });
    next();
});

// ============================================================
// API ROUTES
// ============================================================
const prefix = config.apiPrefix;

app.use(`${prefix}/auth`, authLimiter, authRoutes);
app.use(`${prefix}/uploads`, uploadsRoutes);
app.use(`${prefix}/audit`, auditRoutes);
app.use(`${prefix}/documents`, documentsRoutes);
app.use(`${prefix}/batches`, batchesRoutes);
app.use(`${prefix}/users`, usersRoutes);
app.use(`${prefix}/instruments`, instrumentsRoutes);
app.use(`${prefix}/reports`, reportsRoutes);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'healthy' : 'degraded',
        service: 'pharmaguard-api',
        version: '1.0.0',
        uptime: process.uptime(),
        database: dbConnected ? 'connected' : 'disconnected',
        environment: config.env,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================
// API DOCS ENDPOINT
// ============================================================
app.get(`${prefix}`, (req, res) => {
    res.json({
        service: 'PharmaGuard API',
        version: '1.0.0',
        description: 'Pharmaceutical Data Integrity & Compliance Platform',
        compliance: '21 CFR Part 11',
        endpoints: {
            auth: `${prefix}/auth (POST /login, POST /refresh, POST /logout, GET /me)`,
            uploads: `${prefix}/uploads (GET, POST, GET /:id, PATCH /:id/flag, PATCH /:id/verify)`,
            audit: `${prefix}/audit (GET, GET /:id, GET /resource/:type/:id, GET /verify-chain, GET /stats/summary)`,
            documents: `${prefix}/documents (GET, POST, GET /:id, PATCH /:id/approve)`,
            batches: `${prefix}/batches (GET, POST, GET /:id, PATCH /:id/release)`,
            users: `${prefix}/users (GET, POST, PATCH /:id)`,
            instruments: `${prefix}/instruments (GET, POST, PATCH /:id)`,
            reports: `${prefix}/reports (GET, POST /generate, GET /dashboard/summary)`,
        },
        documentation: 'See /docs/openapi.yaml for full API specification',
    });
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.path}`,
        code: 'NOT_FOUND',
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 50MB.',
            code: 'FILE_TOO_LARGE',
        });
    }

    res.status(err.status || 500).json({
        success: false,
        error: config.env === 'production' ? 'Internal server error' : err.message,
        code: 'INTERNAL_ERROR',
    });
});

// ============================================================
// START SERVER
// ============================================================
async function start() {
    // Test database connection
    const dbReady = await testConnection();
    if (!dbReady) {
        logger.warn('Database not available — server starting without DB connection');
        logger.warn('Run migrations: npm run migrate');
    }

    app.listen(config.port, () => {
        logger.info(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🛡️  PharmaGuard API Server                             ║
║   Data Integrity & Compliance Platform                   ║
║                                                          ║
║   Environment:  ${config.env.padEnd(39)}║
║   Port:         ${String(config.port).padEnd(39)}║
║   API Prefix:   ${config.apiPrefix.padEnd(39)}║
║   Database:     ${(dbReady ? 'Connected ✓' : 'Not Connected ✗').padEnd(39)}║
║   Compliance:   21 CFR Part 11                           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
    });
}

start();

export default app;
