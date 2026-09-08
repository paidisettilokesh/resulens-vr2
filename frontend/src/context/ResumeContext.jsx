import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import apiClient, { getApiBaseUrl, classifyApiError } from '../utils/apiClient';
import { useUser } from './UserContext';

const ResumeContext = createContext(null);

export const ResumeProvider = ({ children }) => {
    const { user, logout } = useUser();

    // Core Data
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errorDetail, setErrorDetail] = useState(null);

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

    const backendUrl = getApiBaseUrl();
    const lastRequestRef = useRef(null);

    const callApi = useCallback(async (endpoint, formData) => {
        setLoading(true);
        setError('');
        setErrorDetail(null);
        lastRequestRef.current = { endpoint, formData };

        try {
            const config = {
                headers: {
                    'x-user-id': user?.id || 'guest',
                    ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
                },
                timeout: 85000 // 85s timeout strictly under 100s proxy drop
            };

            const response = await apiClient.post(`/${endpoint.replace(/^\/+/, '')}`, formData, config);

            let data = response.data;
            if (response.data.analysis && endpoint === 'analyze') data = response.data.analysis;

            if (data?.candidateName) setCandidateName(data.candidateName);

            setError('');
            setErrorDetail(null);
            return data;
        } catch (err) {
            const classified = classifyApiError(err);
            setErrorDetail(classified);
            setError(classified.message);

            // Only log out the user on authenticated endpoints if the token was explicitly invalid/expired
            if (classified.type === 'AUTH_EXPIRED') {
                console.warn('Authentication token expired during API call, clearing session:', classified.message);
                logout();
            }

            throw err;
        } finally {
            setLoading(false);
        }
    }, [user, logout]);

    const retryLastApiCall = useCallback(async () => {
        if (!lastRequestRef.current) return null;
        const { endpoint, formData } = lastRequestRef.current;
        return callApi(endpoint, formData);
    }, [callApi]);

    const resetResume = () => {
        setFile(null);
        setAnalysis(null);
        setCandidateName('');
        setSelectedRole('');
        setCustomRole('');
        setCompanyName('');
        setJobDescription('');
        setError('');
        setErrorDetail(null);
        lastRequestRef.current = null;
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
        errorDetail, setErrorDetail,
        selectedRole, setSelectedRole,
        customRole, setCustomRole,
        companyName, setCompanyName,
        jobDescription, setJobDescription,
        location, setLocation,
        candidateName, setCandidateName,
        results, setResults,
        callApi, resetResume, backendUrl,
        retryLastApiCall
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
