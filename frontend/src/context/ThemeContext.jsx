import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        try {
            const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
            if (savedTheme) return savedTheme;
        } catch (e) {}
        try {
            if (typeof window !== 'undefined' && window.matchMedia) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
        } catch (e) {}
        return 'light';
    });

    useEffect(() => {
        try {
            const root = window?.document?.documentElement;
            if (root) {
                if (theme === 'dark') {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                }
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('theme', theme);
            }
        } catch (e) {}
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        return { theme: 'dark', toggleTheme: () => {} };
    }
    return context;
};

