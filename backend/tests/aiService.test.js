import { jest } from '@jest/globals';

jest.unstable_mockModule('axios', () => ({
    default: {
        post: jest.fn()
    }
}));

jest.unstable_mockModule('../utils/extractText.js', () => ({
    extractText: jest.fn().mockResolvedValue('Mocked resume text content')
}));

const axios = (await import('axios')).default;
const { extractText } = await import('../utils/extractText.js');
const { handleResumeRequest } = await import('../utils/aiService.js');

describe('🤖 AI Service Tests', () => {
    let req;
    let res;
    let mockOnSuccess;

    beforeEach(() => {
        process.env.GROQ_API_KEY = 'test_groq_key';
        
        req = {
            originalUrl: '/api/analyze',
            body: {
                jobRole: 'Software Engineer',
                location: 'Remote'
            },
            file: {
                path: 'test_path.pdf'
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
            raw: 'Mocked resume text content',
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

        axios.post
            .mockRejectedValueOnce(new Error('Groq fail 1'))
            .mockRejectedValueOnce(new Error('Groq fail 2'))
            .mockRejectedValueOnce(new Error('Groq fail 3'))
            .mockRejectedValueOnce(new Error('Groq fail 4'))
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
            raw: 'Mocked resume text content',
            atsScore: 88
        }));
    });

    test('should return 500 when all AI providers fail', async () => {
        axios.post.mockRejectedValue(new Error('API Down'));

        const promptBuilder = () => `Prompt for test 3`;

        await handleResumeRequest(req, res, promptBuilder, mockOnSuccess);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.stringContaining('All AI providers failed')
        }));
    });
});
