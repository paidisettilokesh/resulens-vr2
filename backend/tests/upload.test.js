import { jest } from '@jest/globals';
import { fileFilter } from '../utils/upload.js';

describe('Upload Utility', () => {
    describe('fileFilter', () => {
        let req;
        let cb;

        beforeEach(() => {
            req = {};
            cb = jest.fn();
        });

        it('should allow valid PDF files', () => {
            const file = {
                originalname: 'resume.pdf',
                mimetype: 'application/pdf'
            };
            fileFilter(req, file, cb);
            expect(cb).toHaveBeenCalledWith(null, true);
        });

        it('should allow valid DOCX files', () => {
            const file = {
                originalname: 'resume.docx',
                mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            fileFilter(req, file, cb);
            expect(cb).toHaveBeenCalledWith(null, true);
        });

        it('should reject invalid extensions (e.g. .doc)', () => {
            const file = {
                originalname: 'resume.doc',
                mimetype: 'application/msword'
            };
            fileFilter(req, file, cb);
            expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
            expect(cb.mock.calls[0][0].message).toBe('Invalid file type. Only PDF and DOCX files are allowed.');
        });

        it('should reject invalid mime types with valid extensions', () => {
            const file = {
                originalname: 'malicious.pdf',
                mimetype: 'text/html' // Fake mime type
            };
            fileFilter(req, file, cb);
            expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
        });

        it('should reject case-insensitive invalid extensions', () => {
            const file = {
                originalname: 'resume.TXT',
                mimetype: 'text/plain'
            };
            fileFilter(req, file, cb);
            expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
        });
        
        it('should accept upper-case valid extensions', () => {
            const file = {
                originalname: 'resume.PDF',
                mimetype: 'application/pdf'
            };
            fileFilter(req, file, cb);
            expect(cb).toHaveBeenCalledWith(null, true);
        });
    });
});
