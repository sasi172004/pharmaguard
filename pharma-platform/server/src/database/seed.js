import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, testConnection } from '../config/database.js';

async function seed() {
    console.log('🌱 Seeding PharmaGuard database...\n');

    const dbReady = await testConnection();
    if (!dbReady) {
        console.error('❌ Cannot connect to database.');
        process.exit(1);
    }

    try {
        // 1. Create organization
        const orgId = uuidv4();
        await query(
            `INSERT INTO organizations (id, name, slug, industry, timezone, compliance_mode)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (slug) DO NOTHING`,
            [orgId, 'PharmaGuard Labs Pvt. Ltd.', 'pharmaguard-labs', 'pharmaceutical', 'Asia/Kolkata', '21_cfr_part_11']
        );
        console.log('  ✅ Organization created');

        // 2. Create users
        const passwordHash = await bcrypt.hash('PharmaGuard@2026', 12);
        const users = [
            { email: 'priya.sharma@pharmaguard.io', firstName: 'Priya', lastName: 'Sharma', role: 'lab_director', department: 'Quality Control', employeeId: 'EMP-001' },
            { email: 'vikram.singh@pharmaguard.io', firstName: 'Vikram', lastName: 'Singh', role: 'qa_manager', department: 'Quality Assurance', employeeId: 'EMP-002' },
            { email: 'neha.gupta@pharmaguard.io', firstName: 'Neha', lastName: 'Gupta', role: 'qc_analyst', department: 'Quality Control', employeeId: 'EMP-003' },
            { email: 'arjun.mehta@pharmaguard.io', firstName: 'Arjun', lastName: 'Mehta', role: 'compliance_officer', department: 'Regulatory Affairs', employeeId: 'EMP-004' },
            { email: 'riya.patel@pharmaguard.io', firstName: 'Riya', lastName: 'Patel', role: 'lab_technician', department: 'Laboratory', employeeId: 'EMP-005' },
        ];

        for (const user of users) {
            await query(
                `INSERT INTO users (org_id, email, password_hash, first_name, last_name, role, department, employee_id, mfa_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
         ON CONFLICT (email) DO NOTHING`,
                [orgId, user.email, passwordHash, user.firstName, user.lastName, user.role, user.department, user.employeeId]
            );
        }
        console.log('  ✅ Users created (password: PharmaGuard@2026)');

        // 3. Create instruments
        const instruments = [
            { name: 'Agilent 1260 Infinity II', type: 'HPLC', manufacturer: 'Agilent', model: '1260 Infinity II', serial: 'AG-HPLC-2024-001', location: 'Lab A — Bench 3' },
            { name: 'Shimadzu GC-2030', type: 'GC', manufacturer: 'Shimadzu', model: 'GC-2030', serial: 'SH-GC-2024-001', location: 'Lab B — Bench 1' },
            { name: 'Mettler Toledo XPR', type: 'Balance', manufacturer: 'Mettler Toledo', model: 'XPR226DR', serial: 'MT-BAL-2024-001', location: 'Weighing Room' },
            { name: 'Waters Acquity UPLC', type: 'UPLC', manufacturer: 'Waters', model: 'Acquity H-Class', serial: 'WT-UPLC-2024-001', location: 'Lab A — Bench 5' },
            { name: 'PerkinElmer Lambda 365', type: 'UV-Vis', manufacturer: 'PerkinElmer', model: 'Lambda 365+', serial: 'PE-UV-2024-001', location: 'Lab C — Bench 2' },
        ];

        for (const inst of instruments) {
            await query(
                `INSERT INTO instruments (org_id, name, type, manufacturer, model, serial_number, location, status, qualification_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'online', 'qualified')`,
                [orgId, inst.name, inst.type, inst.manufacturer, inst.model, inst.serial, inst.location]
            );
        }
        console.log('  ✅ Instruments registered');

        // 4. Create sample batches
        const batchData = [
            { number: 'BATCH-2026-001', product: 'Amoxicillin 500mg Capsules', stage: 'Released', status: 'released', compliance: 100 },
            { number: 'BATCH-2026-002', product: 'Metformin HCl 500mg Tablets', stage: 'Final QC Review', status: 'pending_release', compliance: 87 },
            { number: 'BATCH-2026-003', product: 'Atorvastatin 20mg Tablets', stage: 'In-Process Testing', status: 'active', compliance: 62 },
            { number: 'BATCH-2026-004', product: 'Omeprazole 20mg Capsules', stage: 'Stability Testing', status: 'active', compliance: 75 },
        ];

        for (const batch of batchData) {
            await query(
                `INSERT INTO batches (org_id, batch_number, product_name, stage, status, compliance_score, start_date)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - interval '${Math.floor(Math.random() * 30)} days')`,
                [orgId, batch.number, batch.product, batch.stage, batch.status, batch.compliance]
            );
        }
        console.log('  ✅ Sample batches created');

        // 5. Create sample documents
        const documents = [
            { number: 'SOP-QC-001', title: 'HPLC Method Validation Protocol', category: 'SOP', department: 'Quality Control', status: 'approved', version: '3.2' },
            { number: 'SOP-QC-002', title: 'Data Integrity Guidelines', category: 'SOP', department: 'Quality Assurance', status: 'effective', version: '2.1' },
            { number: 'DEV-2026-001', title: 'OOS Investigation — Batch 2026-002', category: 'deviation', department: 'Quality Control', status: 'under_review', version: '1.0' },
            { number: 'CAPA-2026-001', title: 'Calibration Failure Corrective Action', category: 'capa', department: 'Quality Assurance', status: 'draft', version: '1.0' },
        ];

        // Get first user ID for author
        const userResult = await query('SELECT id FROM users WHERE org_id = $1 LIMIT 1', [orgId]);
        const authorId = userResult.rows[0]?.id;

        if (authorId) {
            for (const doc of documents) {
                await query(
                    `INSERT INTO documents (org_id, document_number, title, category, department, author_id, status, current_version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (org_id, document_number) DO NOTHING`,
                    [orgId, doc.number, doc.title, doc.category, doc.department, authorId, doc.status, doc.version]
                );
            }
            console.log('  ✅ Sample documents created');
        }

        // 6. Create default system settings
        const settings = [
            { key: 'compliance_mode', value: '"21_cfr_part_11"', desc: 'Active compliance framework' },
            { key: 'auto_audit_trail', value: 'true', desc: 'Automatic audit trail recording' },
            { key: 'esignature_required', value: 'true', desc: 'Require e-signatures for approvals' },
            { key: 'session_timeout_minutes', value: '30', desc: 'Session inactivity timeout' },
            { key: 'mfa_required', value: 'true', desc: 'Multi-factor authentication requirement' },
            { key: 'data_retention_years', value: '7', desc: 'Data retention period in years' },
            { key: 'encryption_at_rest', value: 'true', desc: 'AES-256 encryption for stored files' },
            { key: 'encryption_in_transit', value: 'true', desc: 'TLS 1.3 for API communications' },
        ];

        for (const setting of settings) {
            await query(
                `INSERT INTO system_settings (org_id, setting_key, setting_value, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (org_id, setting_key) DO NOTHING`,
                [orgId, setting.key, setting.value, setting.desc]
            );
        }
        console.log('  ✅ System settings configured');

        // 7. Assign role permissions from migration seed
        console.log('  ✅ Role permissions (seeded in migration)');

        console.log('\n✅ Database seeded successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('   Email:    priya.sharma@pharmaguard.io');
        console.log('   Password: PharmaGuard@2026');
        console.log('   Role:     Lab Director (full access)\n');

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
    }

    process.exit(0);
}

seed();
