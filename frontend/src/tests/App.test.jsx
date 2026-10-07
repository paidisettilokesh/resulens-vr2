import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import App from '../App.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { UserProvider } from '../context/UserContext.jsx';
import { ResumeProvider } from '../context/ResumeContext.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

describe('App Root Integration', () => {
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

    it('mounts the App component within all contexts without throwing an ErrorBoundary fault', () => {
        render(
            <ErrorBoundary>
                <UserProvider>
                    <ResumeProvider>
                        <ThemeProvider>
                            <App />
                        </ThemeProvider>
                    </ResumeProvider>
                </UserProvider>
            </ErrorBoundary>
        );

        // Verify that ErrorBoundary is NOT triggered
        expect(screen.queryByText(/Application Fault/i)).not.toBeInTheDocument();
        // Verify landing/home view renders
        expect(screen.getAllByText(/ResuLens/i).length).toBeGreaterThan(0);
    });
});
