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
        .replace(/[^\x20-\x7E\n\t]/g, ' ')       // Keep printable ASCII, tabs, and newlines only
        .replace(/[ \t]+/g, ' ')                // Collapse multiple spaces/tabs on a single line
        .trim();
}

/**
 * Extracts raw text from file and normalizes it using worker_threads
 */
export async function extractText(file) {
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
            reject(new Error('File parsing timed out after 180 seconds'));
        }, 180000);

        worker.on('message', (message) => {
            // Ignore internal Node.js watch mode messages
            if (message && message['watch:import']) return;
            
            clearTimeout(timeout);
            if (message && message.success !== undefined) {
                if (message.success) {
                    resolve(message.text);
                } else {
                    reject(new Error(message.error || 'Worker parsing failed'));
                }
                worker.terminate();
            }
        });

        worker.on('error', (err) => {
            clearTimeout(timeout);
            console.error('Worker thread error:', err);
            reject(new Error('Parser worker thread crashed.'));
        });

        worker.on('exit', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });

        // Send job to worker
        worker.postMessage({
            filePath: file.path,
            mimetype: file.mimetype
        });
    });
}
