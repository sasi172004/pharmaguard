import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('🔄 Running PharmaGuard database migrations...\n');

    const dbReady = await testConnection();
    if (!dbReady) {
        console.error('❌ Cannot connect to database. Check your .env configuration.');
        process.exit(1);
    }

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        console.log(`  📄 Running: ${file}`);
        try {
            await query(sql);
            console.log(`  ✅ ${file} — applied successfully`);
        } catch (error) {
            console.error(`  ❌ ${file} — FAILED: ${error.message}`);
            process.exit(1);
        }
    }

    console.log('\n✅ All migrations applied successfully!');
    process.exit(0);
}

migrate();
