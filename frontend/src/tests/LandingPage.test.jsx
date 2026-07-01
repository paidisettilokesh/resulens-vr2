import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import LandingPage from '../components/LandingPage.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';

describe('LandingPage Component', () => {
    beforeAll(() => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
            },
            writable: true,
        });

        // Mock matchMedia
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

    const mockOnOpenAuth = vi.fn();

    const renderWithProviders = (component) => {
        return render(<ThemeProvider>{component}</ThemeProvider>);
    };

    it('renders the landing page correctly', () => {
        renderWithProviders(<LandingPage onOpenAuth={mockOnOpenAuth} />);
        
        // Use regex for flexible matching since the exact text might be split
        expect(screen.getAllByText(/ResuLens/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/AI Resume Intelligence/i)).toBeInTheDocument();
    });

    it('calls onOpenAuth when get started is clicked', () => {
        renderWithProviders(<LandingPage onOpenAuth={mockOnOpenAuth} />);
        
        const getStartedBtns = screen.getAllByRole('button', { name: /Get Started/i });
        fireEvent.click(getStartedBtns[0]);
        
        expect(mockOnOpenAuth).toHaveBeenCalledWith('signup');
    });
});
