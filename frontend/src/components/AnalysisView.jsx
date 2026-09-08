import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import {
    Loader2, AlertTriangle, Download, Zap, Briefcase, FileText,
    ArrowRight, Edit3, BookOpen, CheckCircle, Globe, Layout,
    ShieldCheck, Target, Award, TrendingUp, BarChart3, Fingerprint, MapPin, 
    MessageSquare, ChevronRight, Clock, Star, Sparkles, Flame, Shield, ArrowUpRight, TrendingDown,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadPDF, downloadTextFile, copyToClipboard, getJobLinks, getCourseLink } from '../utils/helpers';
import ProgressiveLoader from './ui/ProgressiveLoader.jsx';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const AnalysisView = ({
    analysis, loading, error, file, selectedRole, customRole, candidateName,
    setActiveTab, isHistoryView, onBack, user, backendUrl, onRetry
}) => {
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoadingHistory(false);
            return;
        }
        const fetchHistory = async () => {
            try {
                const { data } = await apiClient.get('/history');
                
                // Filter only analysis records
                const analysisRecords = (data || [])
                    .filter(item => {
                        const type = item.type || item.details?.type || (item.details ? 'analysis' : undefined);
                        return type === 'analysis';
                    })
                    .map(item => {
                        const rec = item.analysis || item.details?.analysis || item.details || item;
                        return {
                            ...rec,
                            timestamp: item.timestamp || rec.timestamp || item.createdAt
                        };
                    })
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                setHistory(analysisRecords);
            } catch (err) {
                console.error("Failed to load history in AnalysisView:", err);
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [user, analysis]);

    if (!analysis) {
        return (
            <div className="min-h-[600px] flex flex-col items-center justify-center bg-[var(--bg-surface-secondary)] rounded-[4rem] border-2 border-dashed border-[var(--border-secondary)] p-6">
                {loading ? (
                    <ProgressiveLoader active={loading} />
                ) : error ? (
                    (() => {
                        const errorLower = String(error).toLowerCase();
                        const isScannedError = errorLower.includes('image') ||
                            errorLower.includes('scanned') ||
                            errorLower.includes('selectable text');

                        if (isScannedError) {
                            return (
                                <div className="text-center p-8 md:p-12 max-w-2xl mx-auto">
                                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-amber-200 dark:border-amber-500/20 shadow-xl shadow-amber-200/40">
                                        <FileText size={40} className="text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
                                        ATS Compatibility Notice
                                    </div>
                                    <h2 className="text-3xl font-black text-[var(--text-primary)] mb-3 tracking-tight">
                                        Image-Based PDF Detected
                                    </h2>
                                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
                                        This resume was saved as a flat image or graphic (common with Canva, Figma, or phone scans). Real-world <strong>Applicant Tracking Systems (ATS)</strong> cannot read text from image files and will automatically reject them.
                                    </p>
                                    <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-secondary)] shadow-sm text-left space-y-3 mb-8 text-sm">
                                        <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                            <Sparkles size={16} className="text-cyan-600 dark:text-cyan-400" /> How to fix it:
                                        </div>
                                        <ul className="text-[var(--text-secondary)] space-y-2 list-disc list-inside text-xs leading-relaxed">
                                            <li>Export from Word or Google Docs using <strong>Save As &gt; PDF</strong> (preserves selectable text).</li>
                                            <li>If using Canva, export using <strong>PDF Standard</strong> with selectable text enabled.</li>
                                            <li>Or directly upload your <strong>.DOCX</strong> document.</li>
                                        </ul>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('home')} 
                                        className="btn-primary !py-4 !px-8 !rounded-2xl shadow-xl shadow-cyan-200 active:scale-95 transition-all inline-flex items-center gap-2"
                                    >
                                        Upload Text-Based Resume <ArrowRight size={18} />
                                    </button>
                                </div>
                            );
                        }

                        const isColdStartOrNet = errorLower.includes('network') ||
                            errorLower.includes('waking up') ||
                            errorLower.includes('unavailable') ||
                            errorLower.includes('timeout') ||
                            errorLower.includes('initializing');

                        return (
                            <div className="text-center p-8 md:p-12 max-w-xl mx-auto">
                                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-amber-200 dark:border-amber-500/20 shadow-xl shadow-amber-200/50">
                                    <AlertTriangle size={40} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <h2 className="text-3xl font-black text-[var(--text-primary)] mb-3 tracking-tight">
                                    {isColdStartOrNet ? 'Service Interrupted' : 'Analysis Interrupted'}
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold mb-4">
                                    {isColdStartOrNet ? 'Backend Service Connection' : 'Diagnostic Notice'}
                                </p>
                                <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-secondary)] shadow-sm mb-8 text-sm font-medium text-[var(--text-secondary)] leading-relaxed">
                                    {error}
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    {onRetry && (
                                        <button 
                                            onClick={onRetry} 
                                            className="btn-primary w-full sm:w-auto !py-4 !px-8 !rounded-2xl shadow-xl shadow-cyan-200 active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={18} /> Retry Analysis
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setActiveTab('home')} 
                                        className="btn-secondary w-full sm:w-auto !py-4 !px-8 !rounded-2xl border border-[var(--border-secondary)] hover:bg-[var(--bg-surface-secondary)] transition-all inline-flex items-center justify-center gap-2"
                                    >
                                        Change Resume
                                    </button>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <button onClick={() => setActiveTab('home')} className="group flex items-center gap-3 text-cyan-600 font-black text-lg hover:gap-5 transition-all">
                        Return to Control Center <ArrowRight />
                    </button>
                )}
            </div>
        );
    }

    const jobLinks = getJobLinks(selectedRole === 'Other' ? customRole : selectedRole, analysis.location || 'India');

    // ── Unified Intelligence fallbacks ────────────────────────────────────────
    const atsScore = analysis.atsScore || 0;
    const jobMatchScore = analysis.jobMatchScore || 0;
    
    const recruiterInterest = analysis.recruiterInterest ?? Math.round((atsScore * 0.4) + (jobMatchScore * 0.6));
    const educationScore = analysis.educationScore ?? (analysis.atsScoreBreakdown?.educationMatch != null ? Math.round((analysis.atsScoreBreakdown.educationMatch / analysis.atsScoreBreakdown.educationMatchMax) * 100) : 0);
    const experienceScore = analysis.experienceScore ?? (analysis.atsScoreBreakdown?.experienceMatch != null ? Math.round((analysis.atsScoreBreakdown.experienceMatch / analysis.atsScoreBreakdown.experienceMatchMax) * 100) : 0);
    const skillsMatchScore = analysis.skillsMatch ?? (analysis.atsScoreBreakdown?.skillsMatch != null ? Math.round((analysis.atsScoreBreakdown.skillsMatch / analysis.atsScoreBreakdown.skillsMatchMax) * 100) : 0);

    // Intelligence Metrics (Skill Depth, Experience Quality, Impact Density, Profile Strength)
    const intelligenceMetrics = analysis.intelligenceMetrics || {
        skillDepth: skillsMatchScore,
        experienceQuality: experienceScore,
        impactDensity: Math.round((experienceScore * 0.7) + (educationScore * 0.3)),
        profileStrength: Math.round((skillsMatchScore * 0.35) + (experienceScore * 0.35) + (educationScore * 0.30))
    };
    
    // Recruiter Interest Category & Breakdown
    const recruiterBreakdown = analysis.recruiterInterestBreakdown || {};
    let interestCategory = recruiterBreakdown.category || 'Moderate';
    let interestColor = 'text-amber-700 dark:text-amber-400';
    let interestBg = 'bg-amber-500/10';
    let interestBorder = 'border-amber-500/20';
    let interestExplanation = recruiterBreakdown.explanation || '';

    if (recruiterInterest >= 85) {
        if (!recruiterBreakdown.category) interestCategory = 'Excellent';
        interestColor = 'text-cyan-700 dark:text-cyan-400';
        interestBg = 'bg-cyan-500/10';
        interestBorder = 'border-cyan-500/20';
        if (!interestExplanation) interestExplanation = `High seniority fit and verified technical depth yield top recruiter callback odds.`;
    } else if (recruiterInterest >= 70) {
        if (!recruiterBreakdown.category) interestCategory = 'Strong';
        interestColor = 'text-emerald-700 dark:text-emerald-400';
        interestBg = 'bg-emerald-500/10';
        interestBorder = 'border-emerald-500/20';
        if (!interestExplanation) interestExplanation = `Strong track alignment and 6-second scanability for technical recruiters.`;
    } else if (recruiterInterest >= 50) {
        if (!recruiterBreakdown.category) interestCategory = 'Moderate';
        interestColor = 'text-amber-700 dark:text-amber-400';
        interestBg = 'bg-amber-500/10';
        interestBorder = 'border-amber-500/20';
        if (!interestExplanation) interestExplanation = `Competent baseline profile; adding leadership and quantifiable achievements will increase engagement.`;
    } else {
        if (!recruiterBreakdown.category) interestCategory = 'Needs Improvement';
        interestColor = 'text-rose-700 dark:text-rose-400';
        interestBg = 'bg-rose-500/10';
        interestBorder = 'border-rose-500/20';
        if (!interestExplanation) interestExplanation = `Resume lacks critical hiring signals and immediate scanability for recruiter review.`;
    }

    // ── Dynamic Achievement Badges fallbacks ───────────────────────────────────
    const generateBadges = () => {
        const badges = [];
        const skillsLower = (analysis.jobMatchAnalysis?.skillMatch?.matched || []).map(s => s.toLowerCase());
        const roleLower = (selectedRole === 'Other' ? customRole : selectedRole).toLowerCase();
        
        if (roleLower.includes('developer') || roleLower.includes('engineer') || roleLower.includes('architect')) {
            badges.push('Core Developer');
        }
        if (roleLower.includes('full') || (skillsLower.includes('react') && skillsLower.includes('node'))) {
            badges.push('Full Stack Developer');
        }
        if (roleLower.includes('ai') || roleLower.includes('machine learning') || roleLower.includes('data scientist') || (skillsLower.includes('python') && (skillsLower.includes('machine learning') || skillsLower.includes('tensorflow') || skillsLower.includes('pytorch')))) {
            badges.push('AI Innovator');
        }
        if (roleLower.includes('analyst') || (skillsLower.includes('sql') && (skillsLower.includes('tableau') || skillsLower.includes('power bi') || skillsLower.includes('pandas')))) {
            badges.push('Data Insights Expert');
        }
        if (skillsLower.includes('aws') || skillsLower.includes('docker') || skillsLower.includes('kubernetes') || skillsLower.includes('cloud') || roleLower.includes('devops')) {
            badges.push('Cloud Certified');
        }
        if (atsScore >= 80) {
            badges.push('Problem Solver');
        }
        if (analysis.atsAnalysis?.resumeStructure === 'Professional') {
            badges.push('Structure Elite');
        }

        if (badges.length === 0) {
            badges.push('Fast Learner');
            badges.push('Team Player');
        }
        
        return badges.slice(0, 3);
    };

    const activeBadges = analysis.badges || generateBadges();
    
    // ── Dynamic Career Coach fallbacks ─────────────────────────────────────────
    const getCoachRecommendations = () => {
        const roleLower = (selectedRole === 'Other' ? customRole : selectedRole).toLowerCase();
        
        if (roleLower.includes('developer') || roleLower.includes('engineer') || roleLower.includes('architect')) {
            return [
                { text: 'Add cloud-native deployment projects showcasing containerization.', priority: 'High' },
                { text: 'Quantify engineering achievements (e.g. latency reduction, scaling metrics).', priority: 'Medium' },
                { text: 'Integrate Docker, Kubernetes, or CI/CD pipelines in your active project descriptions.', priority: 'Low' }
            ];
        } else if (roleLower.includes('analyst') || roleLower.includes('data')) {
            return [
                { text: 'Highlight end-to-end data pipeline construction and SQL index optimizations.', priority: 'High' },
                { text: 'Include portfolio links to interactive Tableau, Power BI, or Looker dashboards.', priority: 'Medium' },
                { text: 'Specify statistical or machine learning metrics (e.g., accuracy improvements, cost savings).', priority: 'Low' }
            ];
        } else if (roleLower.includes('design') || roleLower.includes('product') || roleLower.includes('ux') || roleLower.includes('ui')) {
            return [
                { text: 'Link to verified case studies or Figma portfolios demonstrating user research.', priority: 'High' },
                { text: 'Emphasize cross-functional collaboration and user experience improvement rates.', priority: 'Medium' },
                { text: 'Mention specific prototyping, testing, and interface analytics tools used.', priority: 'Low' }
            ];
        } else {
            return [
                { text: 'Ensure all experience bullets start with strong, results-oriented action verbs.', priority: 'High' },
                { text: 'Incorporate quantitative metrics for business impact (revenue, time saved, efficiency).', priority: 'Medium' },
                { text: 'List the exact technical stack used directly below each project or role.', priority: 'Low' }
            ];
        }
    };

    const activeCoach = analysis.careerCoach || getCoachRecommendations();

    // ── Dynamic Roadmap fallbacks ──────────────────────────────────────────────
    const getRoadmapItems = () => {
        const suggestions = analysis.atsAnalysis?.suggestions || [];
        const roadmap = [];
        
        const highSuggestions = suggestions.slice(0, 2);
        highSuggestions.forEach(s => {
            roadmap.push({ text: s, priority: 'High', boost: '+12%', reason: 'Addresses missing critical track structures.' });
        });
        
        const medSuggestions = suggestions.slice(2, 4);
        medSuggestions.forEach(s => {
            roadmap.push({ text: s, priority: 'Medium', boost: '+6%', reason: 'Enhances standard keywords and metadata alignment.' });
        });
        
        const lowSuggestions = suggestions.slice(4, 6);
        lowSuggestions.forEach(s => {
            roadmap.push({ text: s, priority: 'Low', boost: '+3%', reason: 'Polishes presentation consistency.' });
        });
        
        if (roadmap.length === 0) {
            roadmap.push({ text: 'Quantify achievements in your professional experience section.', priority: 'High', boost: '+15%', reason: 'Gives recruiters measurable outcomes.' });
            roadmap.push({ text: 'Integrate target role keywords (e.g. AWS, CI/CD, React).', priority: 'Medium', boost: '+8%', reason: 'Helps bypass automatic parser filters.' });
            roadmap.push({ text: 'Ensure consistent bullet styling and date formatting.', priority: 'Low', boost: '+4%', reason: 'Maintains elite branding alignment.' });
        }
        
        return roadmap;
    };

    const activeRoadmap = analysis.roadmap || getRoadmapItems();

    // ── Personalized Motivation fallback ───────────────────────────────────────
    const activeMotivation = analysis.personalizedMotivation || "Build on target track cloud architectures to expand vacancy conversion.";

    // ── Version History mapping ────────────────────────────────────────────────
    const getVersionHistory = () => {
        if (history.length === 0) return [];
        return history.map((h, idx) => ({
            version: `Version ${idx + 1}`,
            atsScore: h.atsScore || 0,
            marketFit: h.jobMatchScore || 0,
            role: h.jobRole || selectedRole,
            date: h.timestamp ? new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'
        }));
    };

    const versions = getVersionHistory();
    const matchedSkills = analysis.jobMatchAnalysis?.skillMatch?.matched || [];
    const missingSkills = analysis.jobMatchAnalysis?.skillMatch?.missing || [];

    // ── Hiring Verdict Mapping ─────────────────────────────────────────────────
    const verdictText = analysis.jobMatchAnalysis?.recruiterVerdict || 'Elite Match - Ready for immediate sourcing.';
    const verdictRating = analysis.verdict || verdictText.split('-')[0]?.trim() || (jobMatchScore >= 80 ? 'Strong Candidate' : 'Moderate Candidate');
    const verdictReasoning = verdictText.split('-').slice(1).join('-')?.trim() || 'Your competency levels map closely to senior parameters for this track.';

    let verdictColor = 'text-emerald-700 dark:text-emerald-400';
    let verdictBg = 'bg-emerald-500/10';
    let verdictBorder = 'border-emerald-500/20';

    if (verdictRating.toLowerCase().includes('reject') || verdictRating.toLowerCase().includes('improvement')) {
        verdictColor = 'text-rose-700 dark:text-rose-400';
        verdictBg = 'bg-rose-500/10';
        verdictBorder = 'border-rose-500/20';
    } else if (verdictRating.toLowerCase().includes('maybe') || verdictRating.toLowerCase().includes('moderate')) {
        verdictColor = 'text-amber-700 dark:text-amber-400';
        verdictBg = 'bg-amber-500/10';
        verdictBorder = 'border-amber-500/20';
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            id="analysis-report"
            className="pb-20 space-y-8"
        >
            {/* 1. ELITE COMMAND HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 surface-3d p-6 sm:p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-600/5 blur-[120px] -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        {isHistoryView && (
                            <button onClick={onBack || (() => setActiveTab('history'))} className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-cyan-600 transition-all">
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                        )}
                        <div className="px-4 py-1.5 bg-cyan-600/10 text-cyan-600 text-xs font-black uppercase tracking-[0.3em] rounded-full border border-cyan-600/20">
                            Neural Diagnostics Active
                        </div>
                    </div>
                    <h1 className="text-6xl font-black text-[var(--text-primary)] tracking-tighter leading-none">
                        Career <span className="text-cyan-600">Intelligence</span> Report
                    </h1>
                    <p className="text-[var(--text-secondary)] font-medium text-lg max-w-2xl">
                        A comprehensive architectural breakdown of your professional profile for the <span className="font-black text-cyan-600 underline decoration-cyan-200 underline-offset-4">{selectedRole === 'Other' ? customRole : selectedRole}</span> position.
                    </p>
                </div>

                <div className="relative z-10 flex gap-4">
                    <button onClick={() => downloadPDF('analysis-report', `Analysis-${candidateName}`)} className="btn-primary !rounded-2xl !py-4 !px-8 flex items-center gap-3 shadow-xl shadow-cyan-500/20">
                        <Download size={20} /> Download PDF
                    </button>
                </div>
            </div>

            {/* 2. CORE DASHBOARD GRID */}
            <div className="grid lg:grid-cols-12 gap-8 items-start scene-3d">
                
                {/* LEFT PANEL (Profile, Recruiter Interest, Skills, Badges, Motivation, History) */}
                <div className="lg:col-span-4 space-y-8 scene-3d">
                    {/* Profile Intelligence */}
                    <div className="surface-3d p-8 rounded-[2.5rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-cyan-500/10 group-hover:scale-105 transition-transform shrink-0">
                                {candidateName ? candidateName.charAt(0) : 'E'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit mb-1">
                                    <ShieldCheck size={10} strokeWidth={3} /> Verified Profile
                                </span>
                                <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight truncate leading-none">
                                    {candidateName || 'Professional Lead'}
                                </h2>
                                <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-semibold mt-1">
                                    <MapPin size={11} className="text-cyan-700 dark:text-cyan-400 shrink-0" />
                                    <span className="truncate">{analysis.location || 'Remote / Global'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-[var(--border-secondary)] flex items-center justify-between relative z-10">
                            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Track</span>
                            <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 dark:bg-cyan-500/10 px-3 py-1 rounded-full">
                                {selectedRole === 'Other' ? customRole : selectedRole}
                            </span>
                        </div>
                    </div>

                    {/* Recruiter Interest Score */}
                    <div className="surface-3d p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                            <Star size={13} className="text-cyan-700 dark:text-cyan-400" /> Recruiter Interest
                        </h3>
                        <div className="flex items-center gap-5">
                            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" stroke="var(--border-secondary)" strokeWidth="8" fill="transparent" />
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="url(#interestGradient)" 
                                        strokeWidth="8" 
                                        fill="transparent" 
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 - (251.2 * recruiterInterest) / 100}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                    <defs>
                                        <linearGradient id="interestGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#06b6d4" />
                                            <stop offset="100%" stopColor="#3b82f6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-xl font-black text-[var(--text-primary)]">{recruiterInterest}%</span>
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Interest</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <span className={`inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-widest rounded-lg ${interestBg} ${interestColor}`}>
                                    {interestCategory}
                                </span>
                                <p className="text-[11px] font-bold text-[var(--text-secondary)] leading-relaxed">
                                    {interestExplanation}
                                </p>
                            </div>
                        </div>
                        {recruiterBreakdown.seniorityAlignment != null && (
                            <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] grid grid-cols-3 gap-2 text-center">
                                <div className="bg-[var(--bg-surface-secondary)] p-2 rounded-xl border border-[var(--border-secondary)]">
                                    <span className="text-[var(--text-muted)] font-black block text-[8px] uppercase tracking-wider">Seniority</span>
                                    <span className="text-xs font-black text-[var(--text-primary)]">{recruiterBreakdown.seniorityAlignment}%</span>
                                </div>
                                <div className="bg-[var(--bg-surface-secondary)] p-2 rounded-xl border border-[var(--border-secondary)]">
                                    <span className="text-[var(--text-muted)] font-black block text-[8px] uppercase tracking-wider">Scanability</span>
                                    <span className="text-xs font-black text-[var(--text-primary)]">{recruiterBreakdown.scanability}%</span>
                                </div>
                                <div className="bg-[var(--bg-surface-secondary)] p-2 rounded-xl border border-[var(--border-secondary)]">
                                    <span className="text-[var(--text-muted)] font-black block text-[8px] uppercase tracking-wider">Signals</span>
                                    <span className="text-xs font-black text-[var(--text-primary)]">{recruiterBreakdown.hiringSignals}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Top Skills & Badges */}
                    <div className="surface-3d p-8 rounded-[2.5rem] space-y-6">
                        <div>
                            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
                                <Zap size={13} className="text-cyan-700 dark:text-cyan-400" /> Top Skills
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {matchedSkills.slice(0, 6).map((skill, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/80 text-xs font-bold text-[var(--text-primary)] rounded-lg border border-[var(--border-secondary)] uppercase tracking-wider">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="pt-5 border-t border-[var(--border-secondary)]">
                            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
                                <Award size={13} className="text-cyan-700 dark:text-cyan-400" /> Achievement Badges
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {activeBadges.map((badge, idx) => (
                                    <span key={idx} className="px-2.5 py-1 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/10 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                        ★ {badge}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Personalized Motivation Card */}
                    <div className="surface-3d bg-gradient-to-br from-cyan-950 via-slate-900 to-cyan-950 p-8 rounded-[2.5rem] text-white relative overflow-hidden group border border-cyan-500/20">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)]" />
                        <Sparkles className="absolute top-4 right-4 text-cyan-400 opacity-30 animate-pulse" size={20} />
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-3">AI Growth Insight</h4>
                        <p className="text-xs font-bold leading-relaxed italic">
                            "{activeMotivation}"
                        </p>
                    </div>

                    {/* Resume Version History */}
                    {!loadingHistory && versions.length > 0 && (
                        <div className="surface-3d p-8 rounded-[2.5rem] space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Clock size={13} className="text-cyan-700 dark:text-cyan-400" /> Version History
                                </h3>
                            </div>
                            <div className="relative pl-5 border-l-2 border-[var(--border-secondary)] space-y-5">
                                {versions.map((ver, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-4 border-[var(--bg-surface)] bg-cyan-500" />
                                        <div className="flex justify-between items-start text-xs">
                                            <div>
                                                <h4 className="font-bold text-[var(--text-primary)] leading-tight">{ver.version}</h4>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{ver.date}</p>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">{ver.atsScore}% ATS</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* CENTER PANEL (Summary, Intelligence Metrics Grid, Roadmap, Career Coach) */}
                <div className="lg:col-span-5 space-y-8 scene-3d">
                    {/* Executive Summary */}
                    <div className="surface-3d p-8 rounded-[2.5rem] relative overflow-hidden group">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                            <FileText size={13} className="text-cyan-700 dark:text-cyan-400" /> Executive Summary
                        </h3>
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed italic">
                            "{analysis.summary}"
                        </p>
                    </div>

                    {/* Intelligence Metrics Grid */}
                    <div className="surface-3d p-8 rounded-[2.5rem] space-y-5">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] flex items-center gap-2">
                            <BarChart3 size={13} className="text-cyan-700 dark:text-cyan-400" /> Intelligence Metrics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[var(--bg-surface-secondary)] border border-[var(--border-secondary)] rounded-2xl text-center">
                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">Skill Depth</span>
                                <span className="text-2xl font-black text-[var(--text-primary)]">{intelligenceMetrics.skillDepth ?? skillsMatchScore}%</span>
                            </div>
                            <div className="p-4 bg-[var(--bg-surface-secondary)] border border-[var(--border-secondary)] rounded-2xl text-center">
                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">Experience Quality</span>
                                <span className="text-2xl font-black text-[var(--text-primary)]">{intelligenceMetrics.experienceQuality ?? experienceScore}%</span>
                            </div>
                            <div className="p-4 bg-[var(--bg-surface-secondary)] border border-[var(--border-secondary)] rounded-2xl text-center">
                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">Impact & Metrics</span>
                                <span className="text-2xl font-black text-[var(--text-primary)]">{intelligenceMetrics.impactDensity ?? educationScore}%</span>
                            </div>
                            <div className="p-4 bg-[var(--bg-surface-secondary)] border border-[var(--border-secondary)] rounded-2xl text-center">
                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">Profile Strength</span>
                                <span className="text-2xl font-black text-cyan-600">{intelligenceMetrics.profileStrength ?? atsScore}%</span>
                            </div>
                        </div>
                    </div>

                    {/* ATS Improvement Roadmap */}
                    <div className="surface-3d p-8 rounded-[2.5rem] space-y-5">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] flex items-center gap-2">
                            <Target size={13} className="text-cyan-700 dark:text-cyan-400" /> ATS Improvement Roadmap
                        </h3>
                        <div className="space-y-3.5">
                            {activeRoadmap.map((item, idx) => {
                                let priorityColor = 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                                if (item.priority?.toLowerCase() === 'high') priorityColor = 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
                                else if (item.priority?.toLowerCase() === 'medium') priorityColor = 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';

                                return (
                                    <div key={idx} className="p-4 bg-[var(--bg-surface-secondary)] rounded-2xl border border-[var(--border-secondary)] flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest border ${priorityColor}`}>
                                                    {item.priority}
                                                </span>
                                                <span className="text-xs font-bold text-[var(--text-primary)]">{item.text}</span>
                                            </div>
                                            {item.reason && <p className="text-xs text-[var(--text-muted)] leading-relaxed italic">{item.reason}</p>}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${priorityColor} shrink-0`}>
                                            {item.boost || '+5%'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI Career Coach */}
                    <div className="surface-3d p-8 rounded-[2.5rem] space-y-5">
                        <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.25em] flex items-center gap-2">
                            <Sparkles size={13} className="text-cyan-700 dark:text-cyan-400" /> AI Career Coach
                        </h3>
                        <div className="space-y-3">
                            {activeCoach.map((rec, idx) => (
                                <div key={idx} className="flex gap-3 p-4 bg-[var(--bg-surface-secondary)] rounded-2xl border border-[var(--border-secondary)]">
                                    <div className="w-5 h-5 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 text-xs">
                                        {idx + 1}
                                    </div>
                                    <div className="space-y-0.5">
                                        {rec.priority && <span className="text-xs font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest">Priority: {rec.priority}</span>}
                                        <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed">{rec.text || rec}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL (ATS Score, Market Fit, AI Verdict, Scoring Transparency, CTAs) */}
                <div className="lg:col-span-3 space-y-8 scene-3d">
                    {/* ATS & Market Fit Score Blocks - Highest Visual Priority */}
                    <div className="grid grid-cols-2 gap-4 scene-3d">
                        <div className="p-6 surface-3d-raised rounded-[2.5rem] text-center border-cyan-500/30 md:scale-105 transition-transform z-10">
                            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">ATS Score</span>
                            <span className="text-3xl font-black text-cyan-600">{atsScore}%</span>
                        </div>
                        <div className="p-6 surface-3d-raised rounded-[2.5rem] text-center border-emerald-500/30 transition-transform z-10">
                            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">Market Fit</span>
                            <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{jobMatchScore}%</span>
                        </div>
                    </div>

                    {/* AI Verdict Card */}
                    <div className="surface-3d p-6 rounded-[2.5rem] space-y-3">
                        <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <Shield size={12} className="text-cyan-700 dark:text-cyan-400" /> AI Verdict
                        </h3>
                        <div className={`p-4 rounded-xl border ${verdictBg} ${verdictBorder} text-center`}>
                            <span className={`text-xs font-black uppercase tracking-widest ${verdictColor}`}>{verdictRating}</span>
                        </div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed italic border-l border-cyan-500/20 pl-3">
                            "{verdictReasoning}"
                        </p>
                    </div>

                    {/* Scoring Transparency Breakdown */}
                    {analysis.atsScoreBreakdown && (
                        <div className="surface-3d p-6 rounded-[2.5rem] space-y-4">
                            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Scoring Transparency</h3>
                            
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                        { subject: 'Skills', A: analysis.atsScoreBreakdown.skillsMatch || 0, fullMark: analysis.atsScoreBreakdown.skillsMatchMax || 100 },
                                        { subject: 'Keywords', A: analysis.atsScoreBreakdown.keywordMatch || 0, fullMark: analysis.atsScoreBreakdown.keywordMatchMax || 100 },
                                        { subject: 'Experience', A: analysis.atsScoreBreakdown.experienceMatch || 0, fullMark: analysis.atsScoreBreakdown.experienceMatchMax || 100 },
                                        { subject: 'Education', A: analysis.atsScoreBreakdown.educationMatch || 0, fullMark: analysis.atsScoreBreakdown.educationMatchMax || 100 },
                                        { subject: 'Formatting', A: analysis.atsScoreBreakdown.formattingMatch || 0, fullMark: analysis.atsScoreBreakdown.formattingMatchMax || 100 },
                                    ]}>
                                        <PolarGrid stroke="var(--border-secondary)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }} />
                                        <Radar name="Score" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', borderRadius: '1rem' }} itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Resume Optimization CTA */}
                    <div className="surface-3d p-6 rounded-[2.5rem] space-y-3">
                        <button onClick={() => downloadPDF('analysis-report', `Analysis-${candidateName}`)} className="w-full btn-primary !rounded-xl !py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider shadow-sm">
                            <Download size={14} /> Download Report
                        </button>
                        <button onClick={() => setActiveTab('home')} className="w-full py-3 bg-[var(--bg-surface-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-cyan-600 rounded-xl border border-[var(--border-secondary)] hover:border-cyan-500/20 text-xs font-black uppercase tracking-wider transition-all text-center">
                            Re-analyze Resume
                        </button>
                    </div>
                </div>

            </div>

            {/* 3. STRATEGIC LEARNING PATH */}
            <div className="bg-gradient-to-br from-cyan-900 via-cyan-800 to-cyan-950 rounded-[4rem] p-16 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-white opacity-[0.03] rotate-12 translate-x-1/2" />

                <div className="relative z-10 grid lg:grid-cols-[1fr_2fr] gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6 border border-white/10">
                            Growth Expedition
                        </div>
                        <h3 className="text-5xl font-black tracking-tighter mb-6 leading-tight">Strategic Learning Path</h3>
                        <p className="text-cyan-100/70 text-lg font-medium leading-relaxed mb-10">
                            Execute these targeted curriculum modules to bridge critical gaps and transition your profile into the Elite 1%.
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xl">
                                <BookOpen size={30} className="text-white" />
                            </div>
                            <div>
                                <div className="text-4xl font-black">{analysis.recommendedCourses?.length || 0}</div>
                                <div className="text-xs font-bold uppercase tracking-widest opacity-80">Verified Paths</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {analysis.recommendedCourses?.map((course, i) => (
                            <a
                                key={i}
                                href={getCourseLink(course.title, course.platform)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.03] transition-all group"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-cyan-500/30 px-3 py-1.5 rounded-full border border-cyan-400/20 group-hover:bg-cyan-500 transition-colors">
                                        {course.platform}
                                    </span>
                                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                                <h5 className="text-xl font-bold leading-tight mb-4 group-hover:text-cyan-200 transition-colors">{course.title}</h5>
                                <div className="flex items-center gap-4 text-xs font-bold opacity-80">
                                    <TrendingUp size={14} /> {course.timeEstimate || 'Flexible Duration'}
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* PORTAL LINKS */}
            <div className="flex flex-wrap justify-center gap-4 pt-10">
                {jobLinks.map(s => (
                    <a key={s.platform} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-8 py-4 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-full text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-cyan-600 hover:border-cyan-600 shadow-sm transition-all hover:shadow-xl">
                        <Globe size={16} /> Apply on {s.platform}
                    </a>
                ))}
            </div>
        </motion.div>
    );
};

export default AnalysisView;


