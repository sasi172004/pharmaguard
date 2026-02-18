-- ============================================================
-- PHARMAGUARD — DATABASE SCHEMA
-- PostgreSQL Migration: Initial Schema
-- Compliant with FDA 21 CFR Part 11 data integrity requirements
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    industry        VARCHAR(100) DEFAULT 'pharmaceutical',
    timezone        VARCHAR(50) DEFAULT 'Asia/Kolkata',
    compliance_mode VARCHAR(50) DEFAULT '21_cfr_part_11',  -- 21_cfr_part_11, eu_annex_11, both
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USERS — Unique authenticated users per 21 CFR Part 11
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'analyst',
        -- Roles: admin, lab_director, qa_manager, qc_analyst, compliance_officer, lab_technician, viewer
    department      VARCHAR(100),
    employee_id     VARCHAR(50),
    phone           VARCHAR(20),
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    mfa_secret      VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, inactive, locked, pending
    last_login_at   TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    failed_login_attempts INT DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================
-- 3. USER SESSIONS — Track active sessions
-- ============================================================
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);

-- ============================================================
-- 4. ROLES & PERMISSIONS — Granular RBAC
-- ============================================================
CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    resource        VARCHAR(50) NOT NULL,  -- uploads, documents, batches, audit, reports, users, settings
    action          VARCHAR(50) NOT NULL,  -- create, read, update, delete, approve, sign, export
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role            VARCHAR(50) NOT NULL,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_perms_role ON role_permissions(role);

-- ============================================================
-- 5. INSTRUMENTS — Connected lab instruments
-- ============================================================
CREATE TABLE instruments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100) NOT NULL,  -- HPLC, GC, UV-Vis, MS, Balance, etc.
    manufacturer    VARCHAR(255),
    model           VARCHAR(255),
    serial_number   VARCHAR(100),
    location        VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'offline',  -- online, offline, maintenance, decommissioned
    last_calibration_date DATE,
    next_calibration_date DATE,
    calibration_interval_days INT DEFAULT 90,
    qualification_status VARCHAR(50) DEFAULT 'pending',  -- qualified, pending, expired
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instruments_org ON instruments(org_id);
CREATE INDEX idx_instruments_type ON instruments(type);

-- ============================================================
-- 6. BATCHES — Manufacturing/testing batch records
-- ============================================================
CREATE TABLE batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    batch_number    VARCHAR(100) NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    product_code    VARCHAR(100),
    stage           VARCHAR(100) DEFAULT 'in_process',
        -- Stages: raw_material, in_process, final_qc, stability, pending_release, released, rejected
    status          VARCHAR(50) DEFAULT 'active',  -- active, pending_release, released, rejected, on_hold
    assigned_to     UUID REFERENCES users(id),
    start_date      DATE NOT NULL,
    target_completion DATE,
    completion_date DATE,
    compliance_score NUMERIC(5,2) DEFAULT 0,
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, batch_number)
);

CREATE INDEX idx_batches_org ON batches(org_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_number ON batches(batch_number);

-- ============================================================
-- 7. FILE UPLOADS — Instrument data with integrity hashes
-- Immutable: original file records cannot be modified
-- ============================================================
CREATE TABLE file_uploads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instrument_id   UUID REFERENCES instruments(id),
    batch_id        UUID REFERENCES batches(id),
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    
    -- File metadata
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,  -- UUID-based storage name
    file_path       VARCHAR(1000) NOT NULL,  -- Cloud storage path
    file_size_bytes BIGINT NOT NULL,
    mime_type       VARCHAR(100),
    file_extension  VARCHAR(20),
    
    -- Data integrity (21 CFR Part 11)
    sha256_hash     VARCHAR(64) NOT NULL,  -- SHA-256 hash of original file
    md5_hash        VARCHAR(32),           -- MD5 secondary hash
    integrity_verified BOOLEAN DEFAULT FALSE,
    integrity_verified_at TIMESTAMPTZ,
    
    -- Status
    status          VARCHAR(30) DEFAULT 'pending_verification',
        -- pending_verification, verified, flagged, quarantined, archived
    flagged_reason  TEXT,
    
    -- Upload metadata
    upload_source   VARCHAR(50) DEFAULT 'manual',  -- manual, watch_agent, api
    upload_ip       VARCHAR(45),
    
    -- Immutability: soft delete only, original record preserved
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID REFERENCES users(id),
    delete_reason   TEXT,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uploads_org ON file_uploads(org_id);
CREATE INDEX idx_uploads_batch ON file_uploads(batch_id);
CREATE INDEX idx_uploads_instrument ON file_uploads(instrument_id);
CREATE INDEX idx_uploads_hash ON file_uploads(sha256_hash);
CREATE INDEX idx_uploads_status ON file_uploads(status);
CREATE INDEX idx_uploads_created ON file_uploads(created_at DESC);

-- ============================================================
-- 8. DOCUMENTS — SOPs, protocols, quality documents
-- ============================================================
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_number VARCHAR(100) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    category        VARCHAR(50) NOT NULL,  -- SOP, protocol, template, deviation, capa, report, policy
    department      VARCHAR(100),
    
    -- Current version info
    current_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    status          VARCHAR(50) DEFAULT 'draft',
        -- draft, under_review, pending_signature, approved, effective, superseded, archived
    
    -- Lifecycle dates
    effective_date  DATE,
    expiry_date     DATE,
    review_date     DATE,
    
    -- Ownership
    author_id       UUID NOT NULL REFERENCES users(id),
    reviewer_id     UUID REFERENCES users(id),
    approver_id     UUID REFERENCES users(id),
    
    -- Metadata
    tags            TEXT[],
    metadata        JSONB DEFAULT '{}',
    
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, document_number)
);

CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_status ON documents(status);

-- ============================================================
-- 9. DOCUMENT VERSIONS — Full version history
-- ============================================================
CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number  VARCHAR(20) NOT NULL,
    
    -- File storage
    file_path       VARCHAR(1000),
    file_size_bytes BIGINT,
    sha256_hash     VARCHAR(64),
    
    -- Content
    change_summary  TEXT,
    change_reason   VARCHAR(50),  -- scheduled_review, correction, enhancement, regulatory_update
    
    -- Version metadata
    created_by      UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(50) DEFAULT 'draft',
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

CREATE INDEX idx_doc_versions_doc ON document_versions(document_id);

-- ============================================================
-- 10. ELECTRONIC SIGNATURES — 21 CFR Part 11 compliant
-- Linked to specific records, immutable once created
-- ============================================================
CREATE TABLE electronic_signatures (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    signer_id       UUID NOT NULL REFERENCES users(id),
    
    -- What is being signed
    record_type     VARCHAR(50) NOT NULL,  -- document, batch, upload, deviation, capa
    record_id       UUID NOT NULL,
    record_version  VARCHAR(20),
    
    -- Signature data
    signature_type  VARCHAR(50) NOT NULL,  -- approval, review, release, rejection, acknowledgment
    intent          TEXT NOT NULL,          -- Why they are signing (e.g., "Approved for release")
    
    -- Authentication at time of signing
    auth_method     VARCHAR(50) NOT NULL DEFAULT 'password',  -- password, mfa, biometric
    auth_verified   BOOLEAN NOT NULL DEFAULT TRUE,
    signer_ip       VARCHAR(45),
    
    -- Immutability
    signature_hash  VARCHAR(64) NOT NULL,  -- SHA-256 of signer_id + record_id + timestamp + intent
    
    signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Signatures are NEVER deleted — only audit-invalidated
    is_valid        BOOLEAN DEFAULT TRUE,
    invalidated_at  TIMESTAMPTZ,
    invalidated_by  UUID REFERENCES users(id),
    invalidation_reason TEXT
);

CREATE INDEX idx_esig_record ON electronic_signatures(record_type, record_id);
CREATE INDEX idx_esig_signer ON electronic_signatures(signer_id);
CREATE INDEX idx_esig_signed ON electronic_signatures(signed_at DESC);

-- ============================================================
-- 11. AUDIT TRAIL — Immutable, tamper-evident log
-- Core 21 CFR Part 11 requirement
-- ============================================================
CREATE TABLE audit_trail (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    
    -- WHO
    user_id         UUID REFERENCES users(id),
    user_email      VARCHAR(255),
    user_name       VARCHAR(200),
    user_role       VARCHAR(50),
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    
    -- WHAT
    action          VARCHAR(100) NOT NULL,
        -- file_upload, file_verify, file_flag, file_delete,
        -- doc_create, doc_edit, doc_approve, doc_sign, doc_archive,
        -- batch_create, batch_update, batch_release, batch_reject,
        -- user_login, user_logout, user_login_failed, user_create, user_update, user_deactivate,
        -- signature_apply, signature_invalidate,
        -- report_generate, report_export,
        -- setting_change, permission_change,
        -- system_alert, anomaly_detected
    category        VARCHAR(50) NOT NULL,
        -- data_capture, integrity, document_control, access_control,
        -- batch_tracking, signature, instrument, reporting, system
    severity        VARCHAR(20) NOT NULL DEFAULT 'info',  -- info, warning, critical
    
    -- ON WHAT
    resource_type   VARCHAR(50),  -- file_upload, document, batch, user, instrument, report, setting
    resource_id     UUID,
    resource_name   VARCHAR(500),
    
    -- DETAILS
    description     TEXT NOT NULL,
    details         JSONB DEFAULT '{}',  -- Additional structured data
    
    -- Previous and new values for change tracking
    previous_value  JSONB,
    new_value       JSONB,
    
    -- Tamper evidence
    entry_hash      VARCHAR(64) NOT NULL,     -- SHA-256 of this entry's data
    previous_hash   VARCHAR(64),              -- Hash of previous audit entry (chain)
    sequence_number BIGINT NOT NULL,          -- Sequential counter per org
    
    -- IMMUTABLE: this table has NO UPDATE or DELETE permissions
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical indices for audit trail queries
CREATE INDEX idx_audit_org ON audit_trail(org_id);
CREATE INDEX idx_audit_user ON audit_trail(user_id);
CREATE INDEX idx_audit_action ON audit_trail(action);
CREATE INDEX idx_audit_category ON audit_trail(category);
CREATE INDEX idx_audit_severity ON audit_trail(severity);
CREATE INDEX idx_audit_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_trail(created_at DESC);
CREATE INDEX idx_audit_sequence ON audit_trail(org_id, sequence_number);

-- Prevent UPDATE and DELETE on audit trail (enforced at DB level)
-- This is done via a TRIGGER:
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail records are immutable. UPDATE and DELETE operations are prohibited.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trail_immutable_update
    BEFORE UPDATE ON audit_trail
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_trail_immutable_delete
    BEFORE DELETE ON audit_trail
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================
-- 12. COMPLIANCE CHECKLISTS
-- ============================================================
CREATE TABLE compliance_checklists (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    status          VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, complete, warning, overdue
    due_date        DATE,
    completed_date  DATE,
    assigned_to     UUID REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_org ON compliance_checklists(org_id);
CREATE INDEX idx_checklists_status ON compliance_checklists(status);

-- ============================================================
-- 13. COMPLIANCE REPORTS — Generated report records
-- ============================================================
CREATE TABLE compliance_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_type     VARCHAR(100) NOT NULL,
        -- monthly_summary, audit_trail_export, data_integrity_assessment,
        -- part11_readiness, instrument_validation, batch_release
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    generated_by    UUID NOT NULL REFERENCES users(id),
    
    -- Report file
    file_path       VARCHAR(1000),
    file_format     VARCHAR(20) DEFAULT 'pdf',  -- pdf, csv, xlsx
    file_size_bytes BIGINT,
    sha256_hash     VARCHAR(64),
    
    -- Report parameters
    date_range_start DATE,
    date_range_end  DATE,
    parameters      JSONB DEFAULT '{}',
    
    -- Linked records
    linked_batch_ids UUID[],
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_org ON compliance_reports(org_id);
CREATE INDEX idx_reports_type ON compliance_reports(report_type);

-- ============================================================
-- 14. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,  -- critical, warning, info
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    resource_type   VARCHAR(50),
    resource_id     UUID,
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- 15. SYSTEM SETTINGS — Per-org configuration
-- ============================================================
CREATE TABLE system_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    setting_key     VARCHAR(100) NOT NULL,
    setting_value   JSONB NOT NULL,
    description     TEXT,
    updated_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, setting_key)
);

-- ============================================================
-- 16. API KEYS — For instrument watch agents
-- ============================================================
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    key_hash        VARCHAR(255) NOT NULL,  -- Hashed API key
    key_prefix      VARCHAR(20) NOT NULL,   -- First few chars for identification
    permissions     TEXT[] DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'active',  -- active, revoked
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================
-- HELPER: Update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_timestamp BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_instruments_timestamp BEFORE UPDATE ON instruments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_batches_timestamp BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_uploads_timestamp BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_documents_timestamp BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_checklists_timestamp BEFORE UPDATE ON compliance_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_timestamp BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: Default permissions
-- ============================================================
INSERT INTO permissions (name, description, resource, action) VALUES
    ('uploads.create', 'Upload instrument data files', 'uploads', 'create'),
    ('uploads.read', 'View uploaded files', 'uploads', 'read'),
    ('uploads.verify', 'Verify file integrity', 'uploads', 'update'),
    ('uploads.flag', 'Flag suspicious files', 'uploads', 'update'),
    ('uploads.delete', 'Soft-delete uploaded files', 'uploads', 'delete'),
    ('uploads.export', 'Export upload data', 'uploads', 'export'),
    ('documents.create', 'Create documents', 'documents', 'create'),
    ('documents.read', 'View documents', 'documents', 'read'),
    ('documents.update', 'Edit documents', 'documents', 'update'),
    ('documents.approve', 'Approve documents', 'documents', 'approve'),
    ('documents.sign', 'Apply e-signature to documents', 'documents', 'sign'),
    ('documents.delete', 'Archive documents', 'documents', 'delete'),
    ('batches.create', 'Create batch records', 'batches', 'create'),
    ('batches.read', 'View batch records', 'batches', 'read'),
    ('batches.update', 'Update batch records', 'batches', 'update'),
    ('batches.release', 'Release/reject batches', 'batches', 'approve'),
    ('audit.read', 'View audit trail', 'audit', 'read'),
    ('audit.export', 'Export audit trail data', 'audit', 'export'),
    ('reports.read', 'View compliance reports', 'reports', 'read'),
    ('reports.generate', 'Generate compliance reports', 'reports', 'create'),
    ('reports.export', 'Export reports', 'reports', 'export'),
    ('users.read', 'View user list', 'users', 'read'),
    ('users.create', 'Create new users', 'users', 'create'),
    ('users.update', 'Edit user accounts', 'users', 'update'),
    ('users.deactivate', 'Deactivate user accounts', 'users', 'delete'),
    ('settings.read', 'View system settings', 'settings', 'read'),
    ('settings.update', 'Modify system settings', 'settings', 'update'),
    ('instruments.read', 'View instruments', 'instruments', 'read'),
    ('instruments.manage', 'Add/edit instruments', 'instruments', 'update'),
    ('signatures.apply', 'Apply electronic signatures', 'signatures', 'create'),
    ('signatures.read', 'View signature records', 'signatures', 'read');
