
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Confetti from 'react-confetti';
import axios from 'axios';
import './index.css';

// --- CONTEXTS ---
import { useUser } from './context/UserContext';
import { useResume } from './context/ResumeContext';

// --- COMPONENTS ---
import Auth from './components/Auth.jsx';
import Header from './components/Header.jsx';
import Navigation from './components/Navigation.jsx';
import HomeTab from './components/HomeTab.jsx';
import MainLayout from './layouts/MainLayout.jsx';

// Lazy-loaded sub-engines for optimized bundle delivery
const AnalysisView = React.lazy(() => import('./components/AnalysisView.jsx'));
const ResumeStudio = React.lazy(() => import('./components/ResumeStudio.jsx'));
const InterviewCoach = React.lazy(() => import('./components/InterviewCoach.jsx'));
const RoastTab = React.lazy(() => import('./components/RoastTab.jsx'));
const SkillsTab = React.lazy(() => import('./components/SkillsTab.jsx'));
const HistoryTab = React.lazy(() => import('./components/HistoryTab.jsx'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard.jsx'));

// Icons
import { AlertTriangle, CheckCircle } from 'lucide-react';

function App() {
    // Context Consumption
    const { user, loading: userLoading, login: handleLogin, logout: handleLogout } = useUser();
    const {
        file, setFile, analysis, setAnalysis, loading: resumeLoading, error, setError,
        selectedRole, setSelectedRole, customRole, setCustomRole,
        companyName, setCompanyName, jobDescription, setJobDescription,
        location, setLocation, candidateName, setCandidateName,
        results, setResults, callApi, resetResume, backendUrl
    } = useResume();

    // UI Local State
    const [activeTab, setActiveTab] = useState('home');
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [isHistoryView, setIsHistoryView] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);
    const fileInputRef = useRef(null);

    // Resume Builder State (Moved to local or could be a separate Context later)
    const [builderData, setBuilderData] = useState({
        personal: { fullName: '', email: '', phone: '', location: '', website: '', bio: '' },
        experience: [{ id: 1, company: '', role: '', period: '', details: '' }],
        education: [{ id: 1, school: '', degree: '', year: '' }],
        skills: '',
        projects: []
    });

    const [toastMsg, setToastMsg] = useState('');

    // Fetch latest saved resume session on load/user change
    useEffect(() => {
        if (!user) return;
        const loadLatestResume = async () => {
            try {
                const config = {
                    headers: {
                        'x-user-id': user?.id || 'guest',
                        ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
                    }
                };
                const { data } = await axios.get(`${backendUrl}/user-resumes/latest`, config);
                if (data && data.content) {
                    setBuilderData(data.content);
                }
            } catch (err) {
                console.error("Failed to load latest resume:", err);
                if (err.response?.status === 401) {
                    handleLogout();
                }
            }
        };
        loadLatestResume();
    }, [user, backendUrl]);

    const saveResume = async () => {
        try {
            setError('');
            setToastMsg('');
            const config = {
                headers: {
                    'x-user-id': user?.id || 'guest',
                    ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
                }
            };
            const { data } = await axios.post(`${backendUrl}/user-resumes/save`, {
                userId: user?.id || 'guest',
                resumeData: builderData
            }, config);
            if (data.success) {
                setToastMsg('Resume Saved Successfully');
                setTimeout(() => setToastMsg(''), 2000);
            }
        } catch (err) {
            if (err.response?.status === 401) {
                handleLogout();
            }
            setError(err.response?.data?.error || err.message || 'Failed to save resume session');
        }
    };

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Role-based Access Control Guard for Admin Panel
    useEffect(() => {
        if (activeTab === 'admin' && user && user.role !== 'admin' && user.role !== 'founder') {
            setActiveTab('home');
        }
    }, [activeTab, user]);

    // Handlers
    const handleFileUpload = (event) => {
        const uploadedFile = event.target.files[0];
        if (!uploadedFile) return;
        setFile(uploadedFile);
        setError('');
    };

    const triggerNewUpload = () => {
        resetResume();
        setTimeout(() => fileInputRef.current?.click(), 100);
    };

    const analyzeResume = async () => {
        if (!file || !selectedRole) { setError('Upload resume and select a target role first.'); return; }
        const fd = new FormData();
        fd.append('resume', file);
        fd.append('jobRole', selectedRole === 'Other' ? customRole : selectedRole);

        try {
            const data = await callApi('analyze', fd);
            setAnalysis(data);
        } catch (err) { /* Error handled in context */ }
    };

    const runFeature = async (feature) => {
        const roleToUse = selectedRole === 'Other' ? customRole : selectedRole;

        // Per-feature validation
        const needsResume = !['market'].includes(feature);
        if (needsResume && !file && !analysis?.raw) {
            setError('Please upload or analyze a resume first.');
            return;
        }
        if (['cover-letter', 'tailor', 'interview'].includes(feature) && !jobDescription?.trim()) {
            setError('Please enter a job description for this feature.');
            return;
        }

        const fd = new FormData();
        if (file) fd.append('resume', file);
        else if (analysis?.raw) fd.append('resumeText', analysis.raw);
        fd.append('jobRole', roleToUse);
        fd.append('location', location);

        try {
            if (feature === 'rewrite') {
                setResults(prev => ({ ...prev, rewrite: null }));
                const data = await callApi('rewrite', fd);
                setResults(prev => ({ ...prev, rewrite: data }));
            } else if (feature === 'skills') {
                setResults(prev => ({ ...prev, skills: null, market: null }));
                const skillsRes = await callApi('skills', fd);
                let marketRes = null;
                try {
                    marketRes = await callApi('market', fd);
                } catch (e) {
                    console.error("Failed to fetch market insights for learning path:", e);
                }
                setResults(prev => ({ ...prev, skills: skillsRes, market: marketRes }));
            } else if (feature === 'market') {
                const data = await callApi('market', fd);
                setResults(prev => ({ ...prev, market: data }));
            } else if (feature === 'linkedin') {
                const data = await callApi('linkedin', fd);
                setResults(prev => ({ ...prev, linkedin: data }));
            } else if (feature === 'email') {
                const data = await callApi('email', fd);
                setResults(prev => ({ ...prev, email: data }));
            } else if (feature === 'roast') {
                const data = await callApi('roast', fd);
                setResults(prev => ({ ...prev, roast: data }));
            } else if (feature === 'interview') {
                fd.append('jobDescription', jobDescription);
                const data = await callApi('interview/generate', fd);
                setResults(prev => ({ ...prev, interview: data }));
            } else if (feature === 'cover-letter') {
                fd.append('companyName', companyName);
                fd.append('jobDescription', jobDescription);
                const data = await callApi('cover-letter', fd);
                setResults(prev => ({ ...prev, coverLetter: data }));
            } else if (feature === 'tailor') {
                fd.append('jobDescription', jobDescription);
                const data = await callApi('tailor', fd);
                setResults(prev => ({ ...prev, tailor: data }));
            }
        } catch (err) {
            // Error state is set inside callApi via context
        }
    };

    if (userLoading) return null; // Or a splash screen
    if (!user) return <Auth onLogin={handleLogin} backendUrl={backendUrl} />;

    const loading = resumeLoading;

    return (
        <div className="app-container min-h-screen">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.doc,.docx" className="hidden" />

            <MainLayout
                user={user}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                candidateName={candidateName}
                analysis={analysis}
                resetAnalysis={resetResume}
                triggerNewUpload={triggerNewUpload}
                handleLogout={handleLogout}
            >
                {analysis?.atsScore > 75 && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} />}

                <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        <Suspense fallback={
                            <div className="text-center py-32 flex flex-col items-center justify-center space-y-6">
                                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-600 rounded-full animate-spin" />
                                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] animate-pulse">Initializing Interface...</p>
                            </div>
                        }>
                            {activeTab === 'home' && (
                                <HomeTab
                                    selectedRole={selectedRole} setSelectedRole={setSelectedRole}
                                    customRole={customRole} setCustomRole={setCustomRole}
                                    commonRoles={[
                                        'Software Engineer', 'Frontend Developer', 'Backend Developer',
                                        'Full Stack Developer', 'DevOps Engineer', 'Data Scientist',
                                        'Machine Learning Engineer', 'Data Analyst', 'Product Manager',
                                        'UI/UX Designer', 'Cybersecurity Analyst', 'Cloud Architect',
                                        'Business Analyst', 'QA Engineer', 'Mobile Developer (iOS/Android)',
                                        'Blockchain Developer'
                                    ]}
                                    file={file} handleFileUpload={handleFileUpload}
                                    analyzeResume={analyzeResume} error={error} setActiveTab={setActiveTab}
                                    loading={loading}
                                />
                            )}

                            {activeTab === 'analyzer' && (
                                <AnalysisView
                                    analysis={analysis} loading={loading} error={error} file={file}
                                    selectedRole={selectedRole} customRole={customRole}
                                    candidateName={candidateName} setActiveTab={setActiveTab}
                                    isHistoryView={isHistoryView} user={user}
                                    backendUrl={backendUrl}
                                    onBack={() => setIsHistoryView(false)}
                                />
                            )}

                            {activeTab === 'studio' && (
                                <ResumeStudio
                                    runFeature={runFeature} rewrittenResume={results.rewrite}
                                    coverLetter={results.coverLetter} linkedinData={results.linkedin}
                                    emailData={results.email} tailorData={results.tailor}
                                    builderData={builderData} setBuilderData={setBuilderData}
                                    saveResume={saveResume} loading={loading} error={error}
                                    candidateName={candidateName}
                                    selectedRole={selectedRole === 'Other' ? customRole : selectedRole}
                                    jobDescription={jobDescription} setJobDescription={setJobDescription}
                                    setCompanyName={setCompanyName} companyName={companyName}
                                />
                            )}

                            {activeTab === 'interview' && (
                                <InterviewCoach
                                    runFeature={runFeature} interviewPrep={results.interview} loading={loading}
                                    jobDescription={jobDescription} setJobDescription={setJobDescription}
                                    selectedRole={selectedRole === 'Other' ? customRole : selectedRole}
                                />
                            )}

                            {activeTab === 'roast' && (
                                <RoastTab
                                    roastData={results.roast} runFeature={runFeature} loading={loading}
                                />
                            )}

                            {activeTab === 'courses' && (
                                <SkillsTab
                                    runFeature={runFeature}
                                    skillsData={results.skills}
                                    marketData={results.market}
                                    analysis={analysis}
                                    loading={loading}
                                    selectedRole={selectedRole === 'Other' ? customRole : selectedRole}
                                    location={location}
                                />
                            )}

                            {activeTab === 'history' && (
                                <HistoryTab
                                    user={user} backendUrl={backendUrl} setActiveTab={setActiveTab}
                                    setAnalysis={setAnalysis} setCandidateName={setCandidateName}
                                    setIsHistoryView={setIsHistoryView}
                                />
                            )}

                            {activeTab === 'admin' && (user?.role === 'admin' || user?.role === 'founder') && (
                                <AdminDashboard
                                    user={user}
                                    backendUrl={backendUrl}
                                />
                            )}
                        </Suspense>
                    </motion.div>
                </AnimatePresence>
            </MainLayout>

            {/* Notification System */}
            <AnimatePresence>
                {copyStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className="fixed bottom-10 left-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest border border-white/10"
                    >
                        <CheckCircle size={16} className="text-emerald-400" /> Clipboard Sync Success
                    </motion.div>
                )}
                {toastMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className="fixed bottom-10 left-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest border border-white/10"
                    >
                        <CheckCircle size={16} className="text-emerald-400" /> {toastMsg}
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className="fixed bottom-10 left-1/2 z-50 bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest border border-white/10"
                    >
                        <AlertTriangle size={16} /> System: {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;

