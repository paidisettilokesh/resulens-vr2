import dotenv from 'dotenv';
dotenv.config();
import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdf from 'pdf-parse';

// Configure worker for Node.js ESM environment
pdfjsLib.GlobalWorkerOptions.workerSrc = import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');

/**
 * Extracts text from PDF using modern Mozilla PDF.js engine.
 * Properly handles FlateDecode compressed streams, modern font tables, and object streams.
 */
async function extractWithPdfjs(buffer) {
    const uint8Array = new Uint8Array(buffer);
    let loadingTask = null;
    let doc = null;

    try {
        loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0 // Suppress internal PDF warnings
        });

        doc = await loadingTask.promise;
    } catch (err) {
        if (err.name === 'PasswordException' || /password/i.test(err.message)) {
            const passwordErr = new Error('This PDF is password-protected or encrypted. Please remove password protection and re-upload.');
            passwordErr.code = 'DOCUMENT_PASSWORD_PROTECTED';
            throw passwordErr;
        }
        if (err.name === 'InvalidPDFException' || /invalid pdf/i.test(err.message)) {
            const corruptErr = new Error('The uploaded file is not a valid PDF or is corrupted.');
            corruptErr.code = 'DOCUMENT_CORRUPTED';
            throw corruptErr;
        }
        throw err;
    }

    let fullText = '';

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .filter(item => typeof item.str === 'string')
            .map(item => item.str)
            .join(' ');

        if (pageText.trim()) {
            fullText += pageText + '\n';
        }
    }

    if (typeof doc.destroy === 'function') {
        await doc.destroy();
    } else if (typeof doc.cleanup === 'function') {
        await doc.cleanup();
    }
    return fullText;
}

/**
 * Fallback extraction using legacy pdf-parse for older PDF formats.
 */
async function extractWithPdfParse(buffer) {
    const data = await pdf(buffer);
    return data.text || '';
}

/**
 * Gemini Multimodal Vision extraction for scanned/image-only PDFs.
 * Works without native C++ compilation or canvas dependencies across all OS environments.
 */
async function extractWithGeminiVision(buffer) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { text: '', available: false, reason: 'no-gemini-key' };

    // Max 10MB for inline base64
    if (buffer.length > 10 * 1024 * 1024) {
        return { text: '', available: false, reason: 'file-too-large-for-vision' };
    }

    const models = [
        process.env.GEMINI_MODEL,
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest'
    ].filter(Boolean);

    const b64 = buffer.toString('base64');

    for (const model of models) {
        try {
            console.log(`[Parser] Attempting Gemini Multimodal Vision extraction using ${model}...`);
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                {
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'application/pdf',
                                    data: b64
                                }
                            },
                            {
                                text: 'Transcribe all text and readable content from this resume document accurately into plain text. Preserve all sections, bullet points, skills, work experience, education, and contact details.'
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 35000
                }
            );

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 30) {
                return { text: text.trim(), available: true };
            }
        } catch (err) {
            console.warn(`[Parser] Gemini Vision (${model}) failed:`, err.response?.data?.error?.message || err.message);
        }
    }

    return { text: '', available: false, reason: 'gemini-vision-failed' };
}

/**
 * OCR extraction for scanned/image-based PDFs.
 *
 * Requires:
 *  - tesseract.js   (pure WASM — always available)
 *  - canvas         (native addon — must be compiled)
 *
 * If 'canvas' is not compiled (e.g. Windows dev without VS Build Tools),
 * this returns { available: false, reason: 'canvas-not-installed' }.
 * Render.com (Ubuntu) compiles canvas at deploy time automatically.
 *
 * OCR language can be configured via OCR_LANGUAGE env var (default: 'eng').
 */
async function extractWithOCR(buffer) {
    // 1. Try to load canvas (optional, native, needs compilation)
    let createCanvas;
    try {
        const canvasMod = await import('canvas');
        createCanvas = canvasMod.createCanvas ?? canvasMod.default?.createCanvas;
        if (!createCanvas) throw new Error('createCanvas not found in canvas module');
    } catch {
        return { text: '', available: false, reason: 'canvas-not-installed' };
    }

    // 2. Load tesseract.js (pure WASM, always available)
    let Tesseract;
    try {
        Tesseract = await import('tesseract.js');
    } catch {
        return { text: '', available: false, reason: 'tesseract-not-installed' };
    }

    try {
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array, verbosity: 0 });
        const doc = await loadingTask.promise;

        let fullText = '';
        const ocrLang = process.env.OCR_LANGUAGE || 'eng';
        const maxPages = Math.min(doc.numPages, 10); // Cap at 10 pages for performance

        for (let i = 1; i <= maxPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better OCR accuracy

            const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
            const context = canvas.getContext('2d');

            await page.render({ canvasContext: context, viewport }).promise;

            const imageBuffer = canvas.toBuffer('image/png');
            const { data: { text } } = await (Tesseract.default ?? Tesseract).recognize(
                imageBuffer, ocrLang,
                { logger: () => {} } // Suppress progress logs in worker context
            );

            if (text?.trim()) fullText += text + '\n';
        }

        if (typeof doc.destroy === 'function') {
            await doc.destroy();
        } else if (typeof doc.cleanup === 'function') {
            await doc.cleanup();
        }
        return { text: fullText, available: true };
    } catch (err) {
        console.error('[OCR] Extraction error:', err.message);
        return { text: '', available: false, reason: err.message };
    }
}

/**
 * Extracts text from DOCX files, including table cells and headers/footers.
 *
 * mammoth.extractRawText() only reads paragraphs — it silently skips all
 * table content (which is very common in two-column resume layouts).
 *
 * Strategy:
 *  1. mammoth.convertToHtml() — captures tables, lists, headers, hyperlinks
 *  2. Strip HTML tags, preserving table cell boundaries as plain text
 *  3. Compare word count with raw text extraction; use whichever is richer
 */
async function extractDocxText(buffer) {
    // Strategy 1: Raw paragraph text (fast, handles most simple DOCX layouts)
    let rawText = '';
    try {
        const data = await mammoth.extractRawText({ buffer });
        rawText = data.value || '';
    } catch { /* fall through to HTML strategy */ }

    // Strategy 2: HTML conversion — captures table cells, headers, hyperlinks
    let htmlText = '';
    try {
        const result = await mammoth.convertToHtml({ buffer });
        const html = result.value || '';

        // Flatten HTML to plain text, preserving table cell and section boundaries
        htmlText = html
            .replace(/<\/td>/gi, ' | ')          // Table cell boundaries
            .replace(/<\/th>/gi, ' | ')          // Table header cell boundaries
            .replace(/<\/tr>/gi, '\n')            // Table row → newline
            .replace(/<\/p>/gi, '\n')             // Paragraph → newline
            .replace(/<\/h[1-6]>/gi, '\n')        // Heading → newline
            .replace(/<br\s*\/?>/gi, '\n')        // Explicit line break → newline
            .replace(/<li>/gi, '• ')              // List item bullets
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]+>/g, '')              // Strip remaining HTML tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/[ \t]{2,}/g, ' ')           // Collapse multiple spaces
            .replace(/\n{3,}/g, '\n\n')           // Collapse excessive blank lines
            .trim();
    } catch { /* fall through to rawText only */ }

    // Use whichever strategy extracted more content
    return countRealWords(htmlText) > countRealWords(rawText) ? htmlText : rawText;
}

/**
 * Counts genuine words (supports all Unicode languages).
 * Filters out single characters and strings that are mostly non-letter characters
 * (e.g. page numbers, code sequences, decorative separators).
 */
function countRealWords(str) {
    if (!str) return 0;
    return str.split(/\s+/).filter(w => {
        if (w.length < 2) return false;
        const letters = (w.match(/\p{L}/gu) || []).length;
        return (letters / w.length) >= 0.5;
    }).length;
}

// ── Main Worker Message Handler ───────────────────────────────────────────────
parentPort.on('message', async (message) => {
    try {
        const { filePath, mimetype } = message;

        if (!fs.existsSync(filePath)) {
            const err = new Error(`File not found: ${filePath}`);
            err.code = 'INVALID_FILE';
            throw err;
        }

        const ext = path.extname(filePath).toLowerCase();
        const isPdf  = mimetype === 'application/pdf' || ext === '.pdf';
        const isDocx = mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx';
        const isTxt  = mimetype === 'text/plain' || ext === '.txt';

        const buffer = fs.readFileSync(filePath);
        if (!buffer || buffer.length === 0) {
            const emptyErr = new Error('The uploaded file is empty (0 bytes). Please upload a valid resume.');
            emptyErr.code = 'DOCUMENT_EMPTY';
            throw emptyErr;
        }

        let text = '';
        let ocrUsed = false;

        if (isPdf) {
            // ── Stage 1: Modern Mozilla PDF.js (handles compressed streams & modern PDFs) ──
            try {
                text = await extractWithPdfjs(buffer);
            } catch (err) {
                // If the error was already classified (e.g. password-protected or corrupt), re-throw
                if (err.code === 'DOCUMENT_PASSWORD_PROTECTED' || err.code === 'DOCUMENT_CORRUPTED') {
                    throw err;
                }
                console.warn('[Parser] pdfjs-dist failed, falling back to pdf-parse:', err.message);
            }

            // ── Stage 2: Legacy pdf-parse (fallback for older/simpler PDFs) ──
            if (countRealWords(text) < 20) {
                try {
                    const fallbackText = await extractWithPdfParse(buffer);
                    if (countRealWords(fallbackText) > countRealWords(text)) {
                        text = fallbackText;
                    }
                } catch (parseErr) {
                    console.warn('[Parser] pdf-parse fallback failed:', parseErr.message);
                }
            }

            // ── Stage 3: Vision / OCR fallback for scanned/image-only PDFs ──────────────
            if (countRealWords(text) < 20) {
                console.log('[Parser] Text layer insufficient (<20 words). Attempting Vision / OCR extraction...');

                // 3a. Primary Vision OCR: Gemini Multimodal Vision (pure cloud, zero local C++ dependencies)
                const geminiResult = await extractWithGeminiVision(buffer);
                if (geminiResult.available && countRealWords(geminiResult.text) >= 20) {
                    text = geminiResult.text;
                    ocrUsed = true;
                    console.log(`[Parser] Successfully extracted ${countRealWords(text)} words via Gemini Multimodal Vision`);
                }

                // 3b. Local Tesseract OCR fallback (if canvas is compiled, e.g. Linux/Render.com)
                if (countRealWords(text) < 20) {
                    const ocrResult = await extractWithOCR(buffer);

                    if (ocrResult.available && countRealWords(ocrResult.text) >= 20) {
                        text = ocrResult.text;
                        ocrUsed = true;
                        console.log(`[OCR] Successfully extracted ${countRealWords(text)} words via Tesseract OCR`);
                    } else {
                        // All extraction methods attempted and selectable text is genuinely missing
                        const scanErr = new Error(
                            'This resume was saved as a flat image or graphic without selectable text. ' +
                            'Real-world Applicant Tracking Systems (ATS) cannot parse text from image files. ' +
                            'Please export from Word or Google Docs using Save As > PDF (with selectable text enabled), or upload directly as DOCX or TXT.'
                        );
                        scanErr.code = 'SCANNED_IMAGE_PDF';
                        throw scanErr;
                    }
                }
            }

        } else if (isDocx) {
            try {
                text = await extractDocxText(buffer);
            } catch (err) {
                const docxErr = new Error(`Could not read DOCX document: ${err.message}`);
                docxErr.code = 'DOCUMENT_CORRUPTED';
                throw docxErr;
            }

            if (countRealWords(text) < 20) {
                const emptyDocxErr = new Error('This DOCX document appears to be empty or contains no readable text. Please check the file and try again.');
                emptyDocxErr.code = 'DOCUMENT_EMPTY';
                throw emptyDocxErr;
            }

        } else if (isTxt) {
            text = buffer.toString('utf8');
            if (countRealWords(text) < 10) {
                const emptyTxtErr = new Error('This text file appears to be empty or contains no readable resume content.');
                emptyTxtErr.code = 'DOCUMENT_EMPTY';
                throw emptyTxtErr;
            }

        } else {
            const typeErr = new Error(`Unsupported file type (${ext || mimetype}). Please upload a .pdf, .docx, or .txt resume.`);
            typeErr.code = 'UNSUPPORTED_FILE_TYPE';
            throw typeErr;
        }

        parentPort.postMessage({ success: true, text, ocrUsed });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message || String(error),
            code: error.code || 'TEXT_EXTRACTION_FAILED'
        });
    }
});
