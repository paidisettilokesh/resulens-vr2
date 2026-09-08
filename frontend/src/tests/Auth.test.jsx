import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Auth from '../components/Auth.jsx';
import apiClient from '../utils/apiClient';

vi.mock('../utils/apiClient', () => {
    const mockPost = vi.fn();
    const mockGet = vi.fn();
    return {
        default: {
            post: mockPost,
            get: mockGet
        },
        apiClient: {
            post: mockPost,
            get: mockGet
        },
        classifyApiError: vi.fn((err) => ({
            message: err?.response?.data?.error || err?.message || 'Login failed',
            canRetry: true
        }))
    };
});

describe('Auth Component', () => {
    const mockOnClose = vi.fn();
    const mockOnLogin = vi.fn();

    it('renders login mode by default', () => {
        render(<Auth isOpen={true} onClose={mockOnClose} onLogin={mockOnLogin} backendUrl="http://localhost:5000/api" />);
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
        expect(screen.getByText('Sign in to access your career intelligence dashboard.')).toBeInTheDocument();
    });

    it('switches to signup mode', () => {
        render(<Auth isOpen={true} onClose={mockOnClose} onLogin={mockOnLogin} backendUrl="http://localhost:5000/api" />);
        const signupTab = screen.getByRole('button', { name: /Create Account/i });
        fireEvent.click(signupTab);
        
        expect(screen.getByText('Create your account')).toBeInTheDocument();
        expect(screen.getByText('Join thousands of professionals who landed their next role.')).toBeInTheDocument();
    });

    it('calls login API correctly', async () => {
        apiClient.post.mockResolvedValueOnce({ data: { token: '123', email: 'test@example.com' } });

        render(<Auth isOpen={true} onClose={mockOnClose} onLogin={mockOnLogin} backendUrl="http://localhost:5000/api" />);
        
        const emailInput = screen.getByPlaceholderText('you@company.com');
        const passwordInput = screen.getByPlaceholderText('••••••••');
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        
        const submitBtn = screen.getByRole('button', { name: /Sign In to Portal/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@example.com',
                password: 'password123'
            });
            expect(mockOnLogin).toHaveBeenCalledWith({ token: '123', email: 'test@example.com' });
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
