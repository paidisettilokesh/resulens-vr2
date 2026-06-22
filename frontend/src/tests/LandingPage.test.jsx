import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LandingPage from '../components/LandingPage.jsx';

describe('LandingPage Component', () => {
    const mockOnOpenAuth = vi.fn();

    it('renders the landing page correctly', () => {
        render(<LandingPage onOpenAuth={mockOnOpenAuth} />);
        
        // Use regex for flexible matching since the exact text might be split
        expect(screen.getByText(/ResuLens/i)).toBeInTheDocument();
        expect(screen.getByText(/AI-Powered Resume Analysis/i)).toBeInTheDocument();
    });

    it('calls onOpenAuth when get started is clicked', () => {
        render(<LandingPage onOpenAuth={mockOnOpenAuth} />);
        
        const getStartedBtns = screen.getAllByRole('button', { name: /Get Started/i });
        fireEvent.click(getStartedBtns[0]);
        
        expect(mockOnOpenAuth).toHaveBeenCalledWith('signup', null);
    });
});
