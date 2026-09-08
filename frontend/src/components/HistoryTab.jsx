import React, { useEffect, useState } from 'react';
import apiClient, { classifyApiError } from '../utils/apiClient';
import { useUser } from '../context/UserContext';
import {
    Clock, ChevronRight, AlertTriangle, Loader2,
    Trash2, Zap, Sparkles, MessageSquare,
    Briefcase, Target, Flame, FileText, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HistoryTab = ({ user, backendUrl, setActiveTab, setAnalysis, setCandidateName, setIsHistoryView }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { logout } = useUser();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await apiClient.get('/history');
            setHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            const classified = classifyApiError(err);
            if (classified.isAuth) {
                logout();
            }
            setError(classified.message || 'Failed to load history.');
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm('Are you sure you want to clear all history?')) return;
        try {
            await apiClient.delete('/history');
            setHistory([]);
        } catch (err) {
            const classified = classifyApiError(err);
            if (classified.isAuth) {
                logout();
            }
            alert(classified.message || 'Failed to clear history.');
        }
    };

    const TYPE_CONFIG = {
        analysis: {
            icon: Zap,
            label: 'AI Audit',
            tag: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10',
            iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
            hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500',
        },
        rewrite: {
            icon: Sparkles,
            label: 'Neural Rewrite',
            tag: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10',
            iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500',
        },
        tailor: {
            icon: Target,
            label: 'JD Alignment',
            tag: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10',
            iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
            hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-500',
        },
        roast: {
            icon: Flame,
            label: 'Resume Roast',
            tag: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/10',
            iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
            hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-500',
        },
        interview: {
            icon: MessageSquare,
            label: 'Interview Prep',
            tag: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/10',
            iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-500',
        },
        market: {
            icon: Briefcase,
            label: 'Market Insight',
            tag: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10',
            iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
            hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500',
        },
        default: {
            icon: FileText,
            label: 'Activity',
            tag: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/10',
            iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
            hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-500',
        },
    };

    const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

    const loadAnalysis = (item) => {
        // Support MongoDB schema where details stores the main object, and JSON fallbacks
        const type = item.type || item.details?.type || (item.details ? 'analysis' : undefined);
        const analysisData = item.analysis || item.details?.analysis || (type === 'analysis' ? (item.details || item) : null);
        if (type === 'analysis' && analysisData) {
            setAnalysis(analysisData);
            if (analysisData.candidateName) setCandidateName(analysisData.candidateName);
            setIsHistoryView(true);
            window.scrollTo(0, 0);
        }
    };

    if (loading) return <div className="text-center py-32"><Loader2 className="animate-spin text-cyan-600 mx-auto w-10 h-10" /></div>;

    if (error && history.length === 0) {
        return (
            <div className="max-w-md mx-auto text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-rose-500/20 p-8 space-y-4 my-8">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Unable to Load History</h3>
                <p className="text-xs text-[var(--text-secondary)]">{error}</p>
                <button onClick={fetchHistory} className="btn-primary !py-2 !px-6 text-xs flex items-center gap-2 mx-auto">
                    <RefreshCw size={14} /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-fade-in py-4">
            {/* Header Hub */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black text-[var(--text-primary)] flex items-center gap-4 tracking-tighter">
                        <div className="p-3 bg-cyan-600 rounded-2xl text-white shadow-lg">
                            <Sparkles size={24} />
                        </div>
                        History
                    </h2>
                    <p className="text-[var(--text-secondary)] font-medium mt-1">Archive of your professional milestones and AI-driven breakthroughs.</p>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={clearHistory}
                        className="group flex items-center gap-2 px-6 py-3 bg-[var(--bg-surface-secondary)] hover:bg-rose-500/10 text-[var(--text-primary)] hover:text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-transparent hover:border-rose-500/20"
                    >
                        <Trash2 size={16} className="group-hover:rotate-12 transition-transform" /> Reset History
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="text-center py-24 bg-[var(--bg-surface)] rounded-[3rem] border border-dashed border-[var(--border-primary)] shadow-inner">
                    <div className="w-20 h-20 bg-[var(--bg-surface-secondary)] rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
                        <FileText size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2">The ledger is empty.</h3>
                    <p className="text-[var(--text-secondary)] mb-10 max-w-xs mx-auto font-medium">Your career breakthroughs will be chronicled here as you use ResuLens.</p>
                    <button onClick={() => setActiveTab('home')} className="btn-primary !px-10">Launch New Session</button>
                </div>
            ) : (
                <div className="grid gap-6">
                    <AnimatePresence>
                        {history.map((item, index) => {
                            const type = item.type || item.details?.type || (item.details ? 'analysis' : undefined);
                            const config = getTypeConfig(type);
                            const analysisData = item.analysis || item.details?.analysis || (type === 'analysis' ? (item.details || item) : item);
                            const score = analysisData.atsScore || analysisData.score || analysisData.matchScore || (analysisData.jobMatchAnalysis?.skillMatch ? analysisData.atsScore : undefined);
                            const isClickable = type === 'analysis';

                            return (
                                <motion.div
                                    key={item._id || item.id || index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => isClickable && loadAnalysis(item)}
                                    className={`
                                        relative overflow-hidden bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-primary)] 
                                        transition-all hover:shadow-2xl ${config.hoverBorder} group
                                        ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                                    `}
                                >
                                    {/* Action Type Tag */}
                                    <div className={`absolute top-0 right-0 px-6 py-2 ${config.tag} text-[9px] font-black uppercase tracking-widest rounded-bl-2xl border-l border-b`}>
                                        {config.label}
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className={`
                                            w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0
                                            ${config.iconBg}
                                        `}>
                                            <config.icon size={24} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-bold text-[var(--text-primary)] text-xl truncate group-hover:text-cyan-600 transition-colors">
                                                    {item.role || analysisData.jobRole || (type === 'analysis' ? 'AI Audit Report' : 'Professional Profile')}
                                                </h4>
                                                {score !== undefined && score !== 0 && (
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${score >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                                        {score}% Match
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5"><Clock size={12} /> {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1.5">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Today'}</span>
                                                {item.details && typeof item.details === 'string' && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-[var(--text-secondary)] normal-case italic font-medium truncate max-w-[200px]">"{item.details}"</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {isClickable && (
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-secondary)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm">
                                                <ChevronRight size={20} />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default HistoryTab;

