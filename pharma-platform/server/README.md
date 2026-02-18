# 🛡️ PharmaGuard API Server

> Pharmaceutical Data Integrity & Compliance Platform — Backend API  
> FDA 21 CFR Part 11 Compliant

---

## Architecture Overview

```
server/
├── src/
│   ├── index.js                   # Express server entry point
│   ├── config/
│   │   ├── index.js               # Environment configuration
│   │   └── database.js            # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js                # JWT + API Key authentication
│   │   ├── rbac.js                # Role-based access control
│   │   └── audit.js               # Immutable audit trail logging
│   ├── routes/
│   │   ├── auth.routes.js         # Login, logout, refresh, password
│   │   ├── uploads.routes.js      # File upload + integrity hashing
│   │   ├── audit.routes.js        # Audit trail queries + chain verify
│   │   ├── documents.routes.js    # Document CRUD + e-signature approval
│   │   ├── batches.routes.js      # Batch tracking + release workflow
│   │   ├── users.routes.js        # User management
│   │   ├── instruments.routes.js  # Instrument registration
│   │   └── reports.routes.js      # Compliance report generation
│   ├── database/
│   │   ├── migrations/            # PostgreSQL schema SQL
│   │   ├── migrate.js             # Migration runner
│   │   └── seed.js                # Demo data seeder
│   └── utils/
│       ├── logger.js              # Winston logging
│       ├── crypto.js              # SHA-256/MD5 hashing
│       └── esignature.js          # Electronic signature utilities
├── docs/
│   └── openapi.yaml               # Full OpenAPI 3.1 specification
├── Dockerfile                      # Multi-stage production build
├── docker-compose.yml              # Full-stack deployment
└── .env.example                    # Environment template
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or Docker)

### 1. Setup Environment
```bash
cd server
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### 2. Start Database (Docker)
```bash
docker compose up postgres -d
```

### 3. Run Migrations
```bash
npm run migrate
```

### 4. Seed Demo Data
```bash
npm run seed
```

### 5. Start Server
```bash
npm run dev
```

Server starts at: `http://localhost:3001`  
API base: `http://localhost:3001/api/v1`

### Full Stack (Docker)
```bash
docker compose up -d
```

---

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| priya.sharma@pharmaguard.io | PharmaGuard@2026 | Lab Director |
| vikram.singh@pharmaguard.io | PharmaGuard@2026 | QA Manager |
| neha.gupta@pharmaguard.io | PharmaGuard@2026 | QC Analyst |
| arjun.mehta@pharmaguard.io | PharmaGuard@2026 | Compliance Officer |
| riya.patel@pharmaguard.io | PharmaGuard@2026 | Lab Technician |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout (audit-logged) |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/change-password` | Change password |

### File Uploads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/uploads` | Upload instrument data (SHA-256 verified) |
| GET | `/uploads` | List uploads (filtered, paginated) |
| GET | `/uploads/:id` | Get upload details |
| PATCH | `/uploads/:id/flag` | Flag file for review |
| PATCH | `/uploads/:id/verify` | Re-verify file integrity |

### Audit Trail
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit` | Query audit trail (filtered) |
| GET | `/audit/:id` | Get single audit entry |
| GET | `/audit/resource/:type/:id` | Audit history for a resource |
| GET | `/audit/verify-chain` | Verify hash chain integrity |
| GET | `/audit/stats/summary` | Audit statistics |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List quality documents |
| POST | `/documents` | Create document |
| GET | `/documents/:id` | Get document + versions + signatures |
| PATCH | `/documents/:id/approve` | Approve with e-signature |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/batches` | List batch records |
| POST | `/batches` | Create batch |
| GET | `/batches/:id` | Get batch + linked files + signatures |
| PATCH | `/batches/:id/release` | Release/reject with e-signature |

### Users, Instruments, Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/users` | List/create users |
| PATCH | `/users/:id` | Update user |
| GET/POST | `/instruments` | List/register instruments |
| GET | `/reports` | List generated reports |
| POST | `/reports/generate` | Generate compliance report |
| GET | `/reports/dashboard/summary` | Dashboard metrics |

---

## 21 CFR Part 11 Compliance Features

### ✅ Electronic Records (§11.10)
- All records stored with integrity hashes (SHA-256 + MD5)
- Immutable storage — original records cannot be modified
- Full version history for all documents
- Soft-delete only — records are never truly destroyed

### ✅ Audit Trails (§11.10(e))
- Automatic, computer-generated, time-stamped audit logs
- Every action logged with WHO, WHAT, WHEN, WHERE
- Tamper-evident hash chain (each entry hashes the previous)
- DB-level triggers PREVENT UPDATE/DELETE on audit table
- Chain verification endpoint to detect tampering

### ✅ Electronic Signatures (§11.50-§11.200)
- signatures linked to specific record + version
- Includes signer identity, timestamp, and intent
- SHA-256 hash of signature metadata
- Signatures are immutable once applied
- Re-authentication required at signing

### ✅ Access Controls (§11.10(d))
- Unique authenticated login per user
- Role-based access control (7 pharma-specific roles)
- Granular permissions per resource + action
- Account lockout after failed attempts
- Session timeout for inactivity

### ✅ Security
- JWT + refresh token authentication
- bcrypt password hashing (12 rounds)
- Rate limiting on all endpoints
- Stricter rate limiting on auth endpoints
- Helmet security headers
- CORS restrictions
- AES-256 at-rest encryption (configurable)
- TLS 1.3 supported (reverse proxy)

---

## Database Schema

16 tables designed for regulatory compliance:

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant organization management |
| `users` | Authenticated users with roles |
| `user_sessions` | Active session tracking |
| `permissions` | Granular permission definitions |
| `role_permissions` | Role-to-permission mappings |
| `instruments` | Connected lab instruments |
| `batches` | Manufacturing batch records |
| `file_uploads` | Instrument data with integrity hashes |
| `documents` | Quality documents (SOPs, CAPAs) |
| `document_versions` | Full document version history |
| `electronic_signatures` | Immutable e-signature records |
| `audit_trail` | Immutable, hash-chained audit log |
| `compliance_checklists` | Regulatory readiness items |
| `compliance_reports` | Generated report records |
| `notifications` | User notifications |
| `system_settings` | Per-org configuration |
| `api_keys` | Watch agent API keys |

---

## Role Hierarchy

| Role | Level | Permissions |
|------|-------|-------------|
| Admin | 100 | Full system access |
| Lab Director | 90 | All operational access |
| QA Manager | 80 | Document approval, batch release, reports |
| Compliance Officer | 70 | Audit trail, reports, read-only operations |
| QC Analyst | 50 | Upload, document editing, batch data entry |
| Lab Technician | 30 | Upload, view documents |
| Viewer | 10 | Read-only dashboard access |

---

## Security Architecture

```
Client → [TLS 1.3] → [Rate Limiter] → [Helmet] → [CORS]
       → [JWT Auth / API Key] → [RBAC Check]
       → [Audit Middleware] → [Controller]
       → [PostgreSQL] ← [Immutable Audit Triggers]
```

---

## License

Proprietary — PharmaGuard Technologies
