import fs from 'fs';
import path from 'path';

/**
 * Ensures and returns a secure, application-owned directory for data storage.
 * Replaces insecure usages of os.tmpdir() to prevent privilege escalation
 * and cross-tenant data leaks.
 */
export function getSecureStorageDir() {
    const storageDir = path.join(process.cwd(), 'data');
    
    // Ensure the directory exists with restricted permissions (0700: Owner Read/Write/Execute only)
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
    }
    
    return storageDir;
}
