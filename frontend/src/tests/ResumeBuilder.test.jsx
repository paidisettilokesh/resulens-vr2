import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import ResumeBuilder from '../components/ResumeBuilder.jsx';
import ProfessionalATS from '../components/resume-templates/ProfessionalATS.jsx';
import ModernProfessional from '../components/resume-templates/ModernProfessional.jsx';
import Executive from '../components/resume-templates/Executive.jsx';
import Graduate from '../components/resume-templates/Graduate.jsx';
import Creative from '../components/resume-templates/Creative.jsx';
import Technical from '../components/resume-templates/Technical.jsx';
import { UserContext } from '../context/UserContext.jsx';

describe('ResumeBuilder & Templates - Education Inspection', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
            writable: true,
        });
    });

    const mockUserContext = {
        user: { id: 'test_user', name: 'Tester', email: 'test@example.com' },
        logout: vi.fn()
    };

    const sampleResumeData = {
        personal: {
            fullName: 'Alexander Hamilton',
            email: 'alexander@example.com',
            phone: '+1 555-123-4567',
            location: 'New York, NY',
            bio: 'Distinguished finance leader with proven track record in institutional management.'
        },
        experience: [
            {
                id: 1,
                company: 'Treasury Dept',
                role: 'Secretary of the Treasury',
                period: '1789 - 1795',
                details: '• Established national financial system\n• Created Bank of the United States'
            }
        ],
        education: [
            {
                id: 1,
                school: 'King\'s College (Columbia University)',
                degree: 'Bachelor of Arts',
                fieldOfStudy: 'Political Economy',
                startDate: '1774',
                endDate: '1776',
                grade: 'Summa Cum Laude',
                coursework: 'Constitutional Law, Economics, Classics',
                achievements: 'Debate Society President, Founder of Literary Society'
            },
            {
                id: 2,
                school: 'Princeton University',
                degree: 'Master of Public Administration',
                fieldOfStudy: 'Fiscal Policy',
                startDate: '1780',
                endDate: '1782',
                grade: '3.95 / 4.0 GPA',
                coursework: 'Public Finance, Banking Systems',
                achievements: 'Graduate Fellowship Scholar'
            }
        ],
        skills: 'Financial Modeling, Public Policy, Economic Strategy, Executive Leadership'
    };

    const renderWithContext = (ui) => {
        return render(
            <UserContext.Provider value={mockUserContext}>
                {ui}
            </UserContext.Provider>
        );
    };

    it('renders the Education & Academics section in ResumeBuilder', () => {
        const setBuilderData = vi.fn();
        renderWithContext(
            <ResumeBuilder
                builderData={sampleResumeData}
                setBuilderData={setBuilderData}
                saveResume={vi.fn()}
                loading={false}
            />
        );

        expect(screen.getByText(/Education & Academics/i)).toBeInTheDocument();
        expect(screen.getByText(/Resume Health/i)).toBeInTheDocument();
    });

    it('allows opening Education section and displaying qualification fields', () => {
        const setBuilderData = vi.fn();
        renderWithContext(
            <ResumeBuilder
                builderData={sampleResumeData}
                setBuilderData={setBuilderData}
                saveResume={vi.fn()}
                loading={false}
            />
        );

        // Click to toggle Education accordion
        const eduToggle = screen.getByRole('button', { name: /Education & Academics/i });
        fireEvent.click(eduToggle);

        // Expect education inputs to be visible
        expect(screen.getByDisplayValue(/King's College/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/Political Economy/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/Summa Cum Laude/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/Constitutional Law/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/Debate Society President/i)).toBeInTheDocument();
    });

    it('adds a new education entry when "Add Education Entry" is clicked', () => {
        const setBuilderData = vi.fn();
        renderWithContext(
            <ResumeBuilder
                builderData={sampleResumeData}
                setBuilderData={setBuilderData}
                saveResume={vi.fn()}
                loading={false}
            />
        );

        // Open Education accordion
        fireEvent.click(screen.getByRole('button', { name: /Education & Academics/i }));

        const addEduBtn = screen.getByRole('button', { name: /Add Education Entry/i });
        fireEvent.click(addEduBtn);

        expect(setBuilderData).toHaveBeenCalled();
        const updateCall = setBuilderData.mock.calls[0][0];
        expect(updateCall.education.length).toBe(3);
    });

    it('removes an education entry when delete button is clicked', () => {
        const setBuilderData = vi.fn();
        renderWithContext(
            <ResumeBuilder
                builderData={sampleResumeData}
                setBuilderData={setBuilderData}
                saveResume={vi.fn()}
                loading={false}
            />
        );

        // Open Education accordion
        fireEvent.click(screen.getByRole('button', { name: /Education & Academics/i }));

        const deleteButtons = screen.getAllByRole('button', { name: /Delete education/i });
        expect(deleteButtons.length).toBe(2);
        fireEvent.click(deleteButtons[0]);

        expect(setBuilderData).toHaveBeenCalled();
        const updateCall = setBuilderData.mock.calls[0][0];
        expect(updateCall.education.length).toBe(1);
    });

    it('ProfessionalATS template renders all education details correctly', () => {
        render(<ProfessionalATS data={sampleResumeData} />);
        
        expect(screen.getByText(/King's College/i)).toBeInTheDocument();
        expect(screen.getByText(/Bachelor of Arts in Political Economy/i)).toBeInTheDocument();
        expect(screen.getByText(/1774 – 1776/i)).toBeInTheDocument();
        expect(screen.getByText(/Summa Cum Laude/i)).toBeInTheDocument();
        expect(screen.getByText(/Constitutional Law, Economics, Classics/i)).toBeInTheDocument();
        expect(screen.getByText(/Debate Society President, Founder of Literary Society/i)).toBeInTheDocument();
        
        // Second qualification
        expect(screen.getByText(/Princeton University/i)).toBeInTheDocument();
        expect(screen.getByText(/Master of Public Administration in Fiscal Policy/i)).toBeInTheDocument();
    });

    it('ModernProfessional template renders all education details correctly', () => {
        render(<ModernProfessional data={sampleResumeData} />);
        
        expect(screen.getByText(/King's College/i)).toBeInTheDocument();
        expect(screen.getByText(/Bachelor of Arts in Political Economy/i)).toBeInTheDocument();
        expect(screen.getByText(/1774 – 1776/i)).toBeInTheDocument();
        expect(screen.getByText(/Summa Cum Laude/i)).toBeInTheDocument();
        expect(screen.getByText(/Princeton University/i)).toBeInTheDocument();
    });

    it('Executive template renders all education details correctly', () => {
        render(<Executive data={sampleResumeData} />);
        
        expect(screen.getByText(/King's College/i)).toBeInTheDocument();
        expect(screen.getByText(/Bachelor of Arts in Political Economy/i)).toBeInTheDocument();
        expect(screen.getByText(/Princeton University/i)).toBeInTheDocument();
        expect(screen.getByText(/3.95 \/ 4.0 GPA/i)).toBeInTheDocument();
    });

    it('Graduate template renders all education details prominently', () => {
        render(<Graduate data={sampleResumeData} />);
        
        expect(screen.getByText(/Education & Academic Credentials/i)).toBeInTheDocument();
        expect(screen.getByText(/King's College/i)).toBeInTheDocument();
        expect(screen.getByText(/Bachelor of Arts in Political Economy/i)).toBeInTheDocument();
        expect(screen.getByText(/Debate Society President/i)).toBeInTheDocument();
    });

    it('Creative template renders education credentials correctly', () => {
        render(<Creative data={sampleResumeData} />);
        
        expect(screen.getByText(/Education & Design Credentials/i)).toBeInTheDocument();
        expect(screen.getByText(/King's College/i)).toBeInTheDocument();
        expect(screen.getByText(/Princeton University/i)).toBeInTheDocument();
    });

    it('Technical template renders engineering education & coursework correctly', () => {
        render(<Technical data={sampleResumeData} />);
        
        expect(screen.getByText(/Education & Academic Credentials/i)).toBeInTheDocument();
        expect(screen.getByText(/King's College/i)).toBeInTheDocument();
        expect(screen.getByText(/Princeton University/i)).toBeInTheDocument();
        expect(screen.getByText(/Constitutional Law, Economics, Classics/i)).toBeInTheDocument();
    });
});
