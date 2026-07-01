export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const validateResumeFile = (file) => {
    if (!file) return { isValid: false, error: 'No file provided.' };

    if (file.size === 0) {
        return { isValid: false, error: 'File is empty (0 bytes).' };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { isValid: false, error: `File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.` };
    }

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(fileExtension);
    const isMimeTypeAllowed = ALLOWED_MIME_TYPES.includes(file.type);

    // Some browsers might not accurately report MIME type for DOCX, so we lean on extension if MIME is missing,
    // but we strictly enforce extension.
    if (!isExtensionAllowed) {
        return { isValid: false, error: 'Invalid file type. Only PDF and DOCX files are allowed.' };
    }

    if (file.type && !isMimeTypeAllowed && isExtensionAllowed && file.type !== '') {
         // Optionally strict MIME check, but some OS/Browsers fail this for DOCX.
         // We will rely on extension for the client side, backend enforces both.
    }

    return { isValid: true, error: null };
};
