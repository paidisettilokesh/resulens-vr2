import { parentPort } from 'worker_threads';
import fs from 'fs';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

parentPort.on('message', async (message) => {
    try {
        const { filePath, mimetype } = message;
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const buffer = fs.readFileSync(filePath);
        let text = '';

        if (mimetype === 'application/pdf') {
            const signature = buffer.slice(0, 4).toString();
            if (signature !== '%PDF') {
                text = buffer.toString('utf8', 0, 5000);
            } else {
                try {
                    const data = await pdf(buffer);
                    if (!data.text || data.text.trim().length === 0) {
                        text = "Scanned PDF Detected. Content extraction limited. " + (data.info ? JSON.stringify(data.info) : "");
                    } else {
                        text = data.text;
                    }
                } catch (err) {
                    text = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').substring(0, 5000);
                }
            }
        } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try {
                const data = await mammoth.extractRawText({ buffer });
                text = data.value;
            } catch (err) {
                text = buffer.toString('utf8').substring(0, 3000);
            }
        } else {
            text = buffer.toString('utf8').substring(0, 3000);
        }

        parentPort.postMessage({ success: true, text });
    } catch (error) {
        parentPort.postMessage({ success: false, error: error.stack || String(error) });
    }
});
