import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../utils/apiClient';

const UserContext = createContext(null);

/**
 * Safely decodes a JWT payload to check expiry without external dependencies
 */
const isTokenExpired = (token) => {
    if (!token || typeof token !== 'string') return true;
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Malformed JWT

    try {
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        if (!payload.exp) return false;
        // Expired if current time exceeds expiry with a 30s buffer
        return (payload.exp * 1000) < (Date.now() + 30000);
    } catch (e) {
        return true;
    }
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        setUser(null);
        try {
            localStorage.removeItem('user');
        } catch (e) {}
    }, []);

    const login = useCallback((userData) => {
        if (!userData || !userData.token) return;
        setUser(userData);
        try {
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {}
    }, []);

    // Session restoration on mount
    useEffect(() => {
        const restoreSession = () => {
            try {
                const savedUser = localStorage.getItem('user');
                if (savedUser) {
                    const parsedUser = JSON.parse(savedUser);
                    if (parsedUser && parsedUser.token) {
                        if (isTokenExpired(parsedUser.token)) {
                            console.warn("Stored session token is expired. Clearing local session.");
                            localStorage.removeItem('user');
                            setUser(null);
                        } else {
                            setUser(parsedUser);
                        }
                    } else {
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                }
            } catch (err) {
                console.error("Auth Restore Error:", err);
                try { localStorage.removeItem('user'); } catch (e) {}
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    return (
        <UserContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within a UserProvider");
    return context;
};
