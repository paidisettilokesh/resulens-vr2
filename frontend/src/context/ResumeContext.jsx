
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
            const msg = err.response?.data?.error || err.message || "Operation failed";
            if (err.response?.status === 401) {
                console.warn("Unauthorized API call, logging out:", msg);
                logout();
            }
            setError(msg);
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

