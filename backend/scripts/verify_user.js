import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getSecureStorageDir } from '../utils/storage.js';

const FALLBACK_DIR = path.join(getSecureStorageDir(), 'talentsync-v2-data');
const USERS_FALLBACK_FILE = path.join(FALLBACK_DIR, 'users_fallback.json');

async function check() {
    try {
        const fileData = fs.readFileSync(USERS_FALLBACK_FILE, 'utf8');
        const users = JSON.parse(fileData);
        const user = users.find(u => u.email === 'paidisettilokesh@gmail.com');
        if (user) {
            console.log('Found user:', user.email);
            console.log('Password hash in DB:', user.password);
            const match = await bcrypt.compare('Lokesh@2006', user.password);
            console.log('Does "Lokesh@2006" match in script?', match);
        } else {
            console.log('User not found!');
        }
    } catch (e) {
        console.error(e);
    }
}

check();
