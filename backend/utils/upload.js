import multer from 'multer';
import os from 'os';
import path from 'path';

// Use system temp directory to avoid triggering restarts when files are uploaded
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx'];
    const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isExtensionAllowed = allowedExtensions.includes(fileExtension);
    const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);

    if (isExtensionAllowed && isMimeTypeAllowed) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
