import { jest } from '@jest/globals';

jest.unstable_mockModule('axios', () => ({
    default: {
        post: jest.fn()
    }
}));

jest.unstable_mockModule('../utils/extractText.js', () => ({
    extractText: jest.fn().mockResolvedValue('Mocked resume text content that is long enough to pass the 80-character minimum guard')
}));

const axios = (await import('axios')).default;
const { extractText } = await import('../utils/extractText.js');
const { handleResumeRequest } = await import('../utils/aiService.js');

describe('🤖 AI Service Tests', () => {
    let req;
    let res;
    let mockOnSuccess;

    beforeEach(() => {
        // Only configure Groq for these unit tests — keep Gemini/OpenRouter out of scope
        process.env.GROQ_API_KEY = 'test_groq_key';
        delete process.env.GEMINI_API_KEY;
        delete process.env.OPENROUTER_API_KEY;
        // Use groq-only provider order so test mocks map correctly
        process.env.AI_PROVIDER_ORDER = 'groq';

        req = {
            originalUrl: '/api/analyze',
            body: {
                jobRole: 'Software Engineer',
                location: 'Remote'
            },
            file: {
                path: 'test_path.pdf',
                mimetype: 'application/pdf',
                size: 1024
            }
        };

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        mockOnSuccess = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.AI_PROVIDER_ORDER;
    });

    test('should return formatted AI response when API succeeds', async () => {
        axios.post.mockResolvedValueOnce({
            data: {
                choices: [
                    {
                        message: {
                            content: '{"atsScore": 90, "jobMatchScore": 85}'
                        }
                    }
                ]
            }
        });

        const promptBuilder = ({ resumeText, jobRole }) => `Prompt for ${jobRole}`;

        await handleResumeRequest(req, res, promptBuilder, mockOnSuccess);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            raw: expect.stringContaining('Mocked resume text'),
            atsScore: 90,
            jobMatchScore: 85
        }));

        expect(mockOnSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ atsScore: 90, jobMatchScore: 85 }),
            expect.any(Object)
        );
    });

    test('should fallback to OpenRouter when Groq fails', async () => {
        process.env.OPENROUTER_API_KEY = 'test_or_key';
        // Use groq → openrouter provider order for this test
        process.env.AI_PROVIDER_ORDER = 'groq,openrouter';

        axios.post
            .mockRejectedValueOnce(new Error('Groq fail 1'))
            .mockRejectedValueOnce(new Error('Groq fail 2'))
            .mockRejectedValueOnce(new Error('Groq fail 3'))
            .mockRejectedValueOnce(new Error('Groq fail 4'))
            .mockRejectedValueOnce(new Error('Groq fail 5'))
            .mockResolvedValueOnce({
                data: {
                    choices: [
                        {
                            message: {
                                content: '{"atsScore": 88}'
                            }
                        }
                    ]
                }
            });

        const promptBuilder = () => `Prompt for test 2`;

        await handleResumeRequest(req, res, promptBuilder, mockOnSuccess);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            raw: expect.stringContaining('Mocked resume text'),
            atsScore: 88
        }));
    });

    test('should return 500 when all AI providers fail', async () => {
        axios.post.mockRejectedValue(new Error('API Down'));

        const promptBuilder = () => `Prompt for test 3`;

        await handleResumeRequest(req, res, promptBuilder, mockOnSuccess);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.stringContaining('failed')
        }));
    });
});
