
import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { useUser } from './UserContext';

const ResumeContext = createContext(null);

export const ResumeProvider = ({ children }) => {
    const { user, logout } = useUser();

    // Core Data
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Metadata / Form Inputs
    const [selectedRole, setSelectedRole] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [location, setLocation] = useState('India');
    const [candidateName, setCandidateName] = useState('');

    // Feature Results
    const [results, setResults] = useState({
        rewrite: null,
        coverLetter: null,
        interview: null,
        skills: null,
        roast: null,
        linkedin: null,
        email: null,
        market: null,
        tailor: null
    });

    const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api';

    const callApi = useCallback(async (endpoint, formData) => {
        setLoading(true);
        setError('');
        try {
            const config = {
                headers: { 
                    'x-user-id': user?.id || 'guest',
                    ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
                },
                timeout: 300000 // 5 mins
            };
            const response = await axios.post(`${backendUrl}/${endpoint}`, formData, config);

            let data = response.data;
            if (response.data.analysis && endpoint === 'analyze') data = response.data.analysis;

            if (data?.candidateName) setCandidateName(data.candidateName);

            return data;
        } catch (err) {
            const status = err.response?.status;
            const serverMsg = err.response?.data?.error || '';

            let userMsg;
            if (status === 429) {
                userMsg = 'AI service rate limit reached. Please wait a moment and try again.';
            } else if (status === 408 || err.code === 'ECONNABORTED') {
                userMsg = 'Request timed out — the AI service may be busy. Please try again.';
            } else if (status === 413) {
                userMsg = 'File too large. Please upload a resume under 5MB.';
            } else if (status === 400 && serverMsg) {
                // 400 errors carry specific, safe user-facing messages (e.g. scanned PDF)
                userMsg = serverMsg;
            } else if (status === 401) {
                console.warn('Unauthorized API call, logging out:', serverMsg);
                logout();
                userMsg = 'Your session has expired. Please log in again.';
            } else if (status === 403) {
                userMsg = 'Access denied. Please check your account permissions.';
            } else if (status === 502 || status === 503) {
                userMsg = 'Analysis service temporarily unavailable. Please try again in a moment.';
            } else if (status >= 500) {
                // Show server message only if it is safe (no internal paths / stack traces)
                userMsg = serverMsg && serverMsg.length < 300 && !serverMsg.includes('at ')
                    ? serverMsg
                    : 'Analysis failed. Please try again.';
            } else {
                userMsg = serverMsg || err.message || 'Operation failed. Please try again.';
            }

            setError(userMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user, backendUrl]);

    const resetResume = () => {
        setFile(null);
        setAnalysis(null);
        setCandidateName('');
        setSelectedRole('');
        setCustomRole('');
        setCompanyName('');
        setJobDescription('');
        setResults({
            rewrite: null,
            coverLetter: null,
            interview: null,
            skills: null,
            roast: null,
            linkedin: null,
            email: null,
            market: null,
            tailor: null
        });
    };

    const value = {
        file, setFile,
        analysis, setAnalysis,
        loading, setLoading,
        error, setError,
        selectedRole, setSelectedRole,
        customRole, setCustomRole,
        companyName, setCompanyName,
        jobDescription, setJobDescription,
        location, setLocation,
        candidateName, setCandidateName,
        results, setResults,
        callApi, resetResume, backendUrl
    };

    return (
        <ResumeContext.Provider value={value}>
            {children}
        </ResumeContext.Provider>
    );
};

export const useResume = () => {
    const context = useContext(ResumeContext);
    if (!context) throw new Error("useResume must be used within a ResumeProvider");
    return context;
};

