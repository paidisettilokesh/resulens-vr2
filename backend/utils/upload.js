import multer from 'multer';
import path from 'path';
import { getSecureStorageDir } from './storage.js';

// Use system temp directory to avoid triggering restarts when files are uploaded
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, getSecureStorageDir());
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Sanitize original filename: strip path traversal, null bytes, and non-alphanumeric chars (except safe dots/dashes)
        const safeExt = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
        const baseField = (file.fieldname || 'resume').replace(/[^a-zA-Z0-9_-]/g, '');
        cb(null, `${baseField}-${uniqueSuffix}${safeExt}`);
    }
});

export const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/octet-stream' // Allowed during transport if extension is verified; validated via magic-bytes
    ];

    const safeFilename = path.basename(file.originalname || '');
    const fileExtension = path.extname(safeFilename).toLowerCase();
    const isExtensionAllowed = allowedExtensions.includes(fileExtension);
    const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);

    if (isExtensionAllowed && isMimeTypeAllowed) {
        cb(null, true);
    } else {
        const err = new Error('Invalid file type. Only PDF, DOCX, and TXT resumes are allowed.');
        err.code = 'UNSUPPORTED_FILE_TYPE';
        cb(err, false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.UPLOAD_LIMIT_MB || '5', 10) * 1024 * 1024 // 5MB limit default
    }
});
