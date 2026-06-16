import fs from "fs";
import mammoth from "mammoth";
import pdf from "pdf-parse";

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
 * Extracts raw text from file and normalizes it
 */
export async function extractText(file) {
    const rawText = await getRawText(file);
    return normalizeText(rawText);
}

async function getRawText(file) {
    const buffer = fs.readFileSync(file.path);
    console.log(`Extracting text from: ${file.originalname} (${file.mimetype}, ${buffer.length} bytes)`);

    if (file.mimetype === "application/pdf") {
        try {
            // Check PDF Magic Number
            const signature = buffer.slice(0, 4).toString();
            if (signature !== "%PDF") {
                console.warn("File has .pdf extension but missing %PDF signature. Attempting raw text recovery.");
                return buffer.toString('utf8', 0, 5000);
            }

            const data = await pdf(buffer);
            if (!data.text || data.text.trim().length === 0) {
                console.warn("PDF parsed but no text found. Might be a scanned image. Using metadata fallback.");
                return "Scanned PDF Detected. Content extraction limited. " + (data.info ? JSON.stringify(data.info) : "");
            }
            return data.text;
        } catch (err) {
            console.error("PDF Parsing failed. Falling back to string extraction.", err.message);
            // Fallback: If it's a 'broken' PDF, sometimes we can still grab strings
            return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').substring(0, 5000);
        }
    }

    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        try {
            const data = await mammoth.extractRawText({ buffer });
            return data.value;
        } catch (err) {
            console.error("Word parsing failed:", err.message);
            return buffer.toString('utf8').substring(0, 3000);
        }
    }

    // Default fallback for unknown or text files
    return buffer.toString('utf8').substring(0, 3000);
}

// Run a one-time warm-up call to initialize the pdf-parse fake worker and bypass the first-call race condition bug
(async () => {
    try {
        await pdf(Buffer.from('%PDF-1.4'));
    } catch (e) {
        // Expected fallback initialization failure, safe to ignore
    }
})();

