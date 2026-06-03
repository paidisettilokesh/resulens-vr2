import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const RETENTION_DAYS = 30;

// Dynamic model imports so Mongoose compiles the schemas
import '../models/User.js';
import '../models/Resume.js';
import '../models/Analysis.js';
import '../models/AICache.js';

const runBackup = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ BACKUP ERROR: MONGODB_URI is not defined in environment variables.');
        process.exit(1);
    }

    try {
        console.log('🔄 Connecting to MongoDB for backup...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully.');

        // Create backups directory if not exists
        await fs.mkdir(BACKUP_DIR, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const currentBackupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
        await fs.mkdir(currentBackupPath, { recursive: true });

        const collections = mongoose.connection.collections;
        console.log(`📦 Found ${Object.keys(collections).length} collections to back up.`);

        for (const name of Object.keys(collections)) {
            const collection = collections[name];
            const documents = await collection.find({}).toArray();
            const filePath = path.join(currentBackupPath, `${name}.json`);
            
            await fs.writeFile(filePath, JSON.stringify(documents, null, 2));
            console.log(`   └─ Backed up collection: ${name} (${documents.length} docs)`);
        }

        console.log(`🎉 Backup completed successfully! Saved to: ${currentBackupPath}`);

        // Enforce Retention Policy
        await pruneOldBackups();

    } catch (err) {
        console.error('❌ Backup Process Failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
    }
};

const pruneOldBackups = async () => {
    try {
        console.log('🧹 Running backup retention cleanup...');
        const files = await fs.readdir(BACKUP_DIR);
        const now = Date.now();
        const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(BACKUP_DIR, file);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory() && file.startsWith('backup-')) {
                const age = now - stat.birthtimeMs;
                if (age > maxAge) {
                    console.log(`   └─ Deleting expired backup directory: ${file} (created ${stat.birthtime.toLocaleDateString()})`);
                    await fs.rm(filePath, { recursive: true, force: true });
                }
            }
        }
        console.log('✅ Retention check completed.');
    } catch (err) {
        console.error('⚠️ Retention policy cleanup failed:', err.message);
    }
};

runBackup();
