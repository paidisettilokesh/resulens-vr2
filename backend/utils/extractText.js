import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_PATH = path.join(__dirname, '../workers/parserWorker.js');

/**
 * Normalizes text to ensure identical formatting, encoding, and whitespace
 */
export function normalizeText(text) {
    if (!text) return "";
    return text
        .replace(/[\r\n]+/g, '\n')              // Standardize newlines
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')  // Strip control chars only; preserve unicode (names, bullets, em-dashes, etc.)
        .replace(/[ \t]+/g, ' ')                // Collapse multiple spaces/tabs on a single line
        .trim();
}

/**
 * Validates actual file magic bytes to prevent MIME-type or extension spoofing.
 * Accepts either a file path (string) or a Buffer.
 */
export function validateFileSignature(input, originalname = '') {
    let headerBuffer;
    const name = originalname || (typeof input === 'string' ? input : '');
    const ext = path.extname(name).toLowerCase();

    const allowedExts = ['.pdf', '.docx', '.txt'];
    if (ext && !allowedExts.includes(ext)) {
        const err = new Error(`Unsupported file type: ${ext}. Only PDF, DOCX, and TXT files are supported.`);
        err.code = 'UNSUPPORTED_FILE_TYPE';
        throw err;
    }

    if (Buffer.isBuffer(input)) {
        if (input.length === 0) {
            const err = new Error('File is empty (0 bytes). Please upload a valid document.');
            err.code = 'DOCUMENT_EMPTY';
            throw err;
        }
        headerBuffer = input.slice(0, 16);
    } else if (typeof input === 'string') {
        if (!fs.existsSync(input)) {
            const err = new Error(`File not found: ${input}`);
            err.code = 'DOCUMENT_CORRUPTED';
            throw err;
        }
        const stats = fs.statSync(input);
        if (stats.size === 0) {
            const err = new Error('File is empty (0 bytes). Please upload a valid document.');
            err.code = 'DOCUMENT_EMPTY';
            throw err;
        }
        const fd = fs.openSync(input, 'r');
        headerBuffer = Buffer.alloc(16);
        fs.readSync(fd, headerBuffer, 0, 16, 0);
        fs.closeSync(fd);
    } else {
        const err = new Error('Invalid input provided for signature validation.');
        err.code = 'DOCUMENT_CORRUPTED';
        throw err;
    }

    if (ext === '.pdf') {
        const isPdfMagic = headerBuffer.slice(0, 5).toString('ascii') === '%PDF-';
        if (!isPdfMagic) {
            const err = new Error('Invalid file format: File has a .pdf extension but does not contain a valid PDF signature.');
            err.code = 'DOCUMENT_CORRUPTED';
            throw err;
        }
    } else if (ext === '.docx') {
        // DOCX is a ZIP archive, must start with PK\x03\x04 (or PK\x05\x06 for empty zip)
        const isZipMagic = headerBuffer[0] === 0x50 && headerBuffer[1] === 0x4B &&
            (headerBuffer[2] === 0x03 || headerBuffer[2] === 0x05);
        if (!isZipMagic) {
            const err = new Error('Invalid file format: File has a .docx extension but is not a valid Word document package.');
            err.code = 'DOCUMENT_CORRUPTED';
            throw err;
        }
    } else if (ext === '.txt') {
        // Check for binary/null bytes in the header
        for (let i = 0; i < headerBuffer.length; i++) {
            if (headerBuffer[i] === 0x00) {
                const err = new Error('Invalid file format: Text file contains binary or null characters.');
                err.code = 'DOCUMENT_CORRUPTED';
                throw err;
            }
        }
    }

    return { valid: true, type: ext ? ext.slice(1) : 'unknown' };
}

/**
 * Extracts raw text from file and normalizes it using worker_threads
 */
export async function extractText(file) {
    validateFileSignature(file.path, file.originalname);
    const rawText = await getRawText(file);
    return normalizeText(rawText);
}

function getRawText(file) {
    return new Promise((resolve, reject) => {
        const stats = fs.statSync(file.path);
        console.log(`Extracting text from: ${file.originalname} (${file.mimetype}, ${stats.size} bytes)`);

        const worker = new Worker(WORKER_PATH);

        // Timeout protection (180 seconds)
        const timeout = setTimeout(() => {
            worker.terminate();
            const timeoutErr = new Error('File parsing timed out after 180 seconds');
            timeoutErr.code = 'PARSER_TIMEOUT';
            reject(timeoutErr);
        }, 180000);

        worker.on('message', (message) => {
            // Ignore internal Node.js watch mode messages
            if (message && message['watch:import']) return;
            
            clearTimeout(timeout);
            if (message && message.success !== undefined) {
                if (message.success) {
                    resolve(message.text);
                } else {
                    const parseErr = new Error(message.error || 'Worker parsing failed');
                    if (message.code) parseErr.code = message.code;
                    reject(parseErr);
                }
                worker.terminate();
            }
        });

        worker.on('error', (err) => {
            clearTimeout(timeout);
            console.error('Worker thread error:', err);
            const crashErr = new Error('Parser worker thread crashed.');
            crashErr.code = 'PARSER_CRASHED';
            reject(crashErr);
        });

        worker.on('exit', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                const exitErr = new Error(`Worker stopped with exit code ${code}`);
                exitErr.code = 'PARSER_EXIT_ERROR';
                reject(exitErr);
            }
        });

        // Send job to worker
        worker.postMessage({
            filePath: file.path,
            mimetype: file.mimetype
        });
    });
}
