import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RotateCcw, User, LogOut, ChevronDown, Sparkles, LayoutDashboard, Target, BarChart3, Rocket, Sun, Moon, BookOpen, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { SOCIAL_LINKS } from '../constants/socialLinks';

// ── GitHub SVG Icon ───────────────────────────────────────────────────────────
const GitHubIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
);

// ── LinkedIn SVG Icon ─────────────────────────────────────────────────────────
const LinkedInIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
);


const Header = ({ activeTab, setActiveTab, candidateName, analysis, resetAnalysis, triggerNewUpload, user, handleLogout, onOpenOnboarding }) => {
    const { theme, toggleTheme } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const tabs = [
        { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'analyzer', label: 'AI Analysis', icon: Zap },
        { id: 'studio', label: 'Resume Studio', icon: CheckCircle }, // Actually FilePlus, I'll use CheckCircle for now or import it
        { id: 'interview', label: 'Interview Prep', icon: Target },
        { id: 'courses', label: 'Learning Path', icon: BookOpen },
        { id: 'roast', label: 'Resume Roast', icon: Sparkles },
        { id: 'history', label: 'History', icon: RotateCcw }
    ];
    if (user && (user.role === 'admin' || user.role === 'founder')) {
        tabs.push({ id: 'admin', label: 'Admin Panel', icon: User });
    }

    return (
        <header className={`fixed top-0 left-0 md:left-20 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-4' : 'py-8'}`}>
            <div className="container-custom">
                <div className={`
                    relative bg-[var(--glass-bg)] backdrop-blur-2xl px-6 py-4 rounded-[2.5rem] border border-[var(--glass-border)] shadow-2xl flex items-center justify-between
                    ${scrolled ? 'shadow-premium' : ''}
                `} style={{ boxShadow: `0 8px 30px var(--shadow-color)` }}>
                    {/* Brand Section */}
                    <div className="flex items-center gap-4 md:gap-10">
                        {/* Mobile Hamburger */}
                        <button 
                            aria-label="Toggle mobile menu"
                            className="md:hidden p-2 bg-[var(--bg-surface-secondary)] rounded-lg text-[var(--text-primary)]"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                        </button>

                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => setActiveTab('home')}
                        >
                            <div className="w-10 h-10 bg-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-cyan-100 group-hover:scale-110 group-active:scale-95 transition-all overflow-hidden">
                                {/* ResuLens Logo Mark */}
                                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                                    <circle cx="22" cy="22" r="14" stroke="white" strokeWidth="2.2" fill="none" />
                                    <circle cx="22" cy="22" r="8.5" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
                                    <rect x="16.5" y="15" width="11" height="14" rx="1.5" fill="white" fillOpacity="0.15" />
                                    <rect x="16.5" y="15" width="11" height="14" rx="1.5" stroke="white" strokeWidth="1.5" />
                                    <path d="M24 15 L27.5 18.5 L24 18.5 Z" fill="white" fillOpacity="0.6" />
                                    <path d="M24 15 L27.5 18.5 L24 18.5" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                                    <line x1="18.5" y1="21" x2="24.5" y2="21" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                    <line x1="18.5" y1="24" x2="26" y2="24" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                    <line x1="18.5" y1="27" x2="23" y2="27" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                    <line x1="37" y1="37" x2="32" y2="32" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-xl text-slate-800 tracking-tighter leading-none dark:text-white">ResuLens</span>
                                <span className="text-[9px] font-bold text-cyan-500 uppercase tracking-[0.2em] leading-none mt-0.5">AI Resume Intelligence</span>
                            </div>
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl bg-slate-100/50 text-slate-600 hover:bg-white hover:shadow-md transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                            aria-label="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>

                        {/* Social Profile Links */}
                        <div className="flex items-center gap-1.5">
                            <a
                                href={SOCIAL_LINKS.github.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={SOCIAL_LINKS.github.ariaLabel}
                                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-md hover:scale-110 transition-all active:scale-95 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                                title="GitHub Profile"
                            >
                                <GitHubIcon size={18} />
                            </a>
                            <a
                                href={SOCIAL_LINKS.linkedin.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={SOCIAL_LINKS.linkedin.ariaLabel}
                                className="p-2.5 rounded-xl text-slate-500 hover:text-[#0077B5] hover:bg-blue-50 hover:shadow-md hover:scale-110 transition-all active:scale-95 dark:text-slate-400 dark:hover:text-[#0ea5e9] dark:hover:bg-slate-800"
                                title="LinkedIn Profile"
                            >
                                <LinkedInIcon size={18} />
                            </a>
                        </div>

                    </div>

                    {/* Action Hub */}
                    <div className="flex items-center gap-4">
                        {analysis && activeTab !== 'home' && (
                            <div className="flex items-center gap-3">
                                {candidateName && (
                                    <div className="hidden xl:flex flex-col items-end px-4 border-r border-slate-200">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Profile</span>
                                        <span className="text-xs font-bold text-cyan-600 italic">@{candidateName.replace(/\s+/g, '').toLowerCase()}</span>
                                    </div>
                                )}
                                <button
                                    onClick={triggerNewUpload}
                                    className="hidden sm:flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <RotateCcw size={14} /> New Audit
                                </button>
                            </div>
                        )}

                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-3 p-1.5 pr-4 bg-[var(--bg-surface)] border border-[var(--border-secondary)] rounded-2xl shadow-sm hover:scale-[1.02] transition-all"
                            >
                                <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm border border-white/20">
                                    {user?.name?.charAt(0) || 'G'}
                                </div>
                                <div className="flex flex-col items-start text-left">
                                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest truncate max-w-[100px]">
                                        {analysis?.location || (user?.id === 'guest' ? 'Elite Access' : 'Verified')}
                                    </span>
                                    <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[100px]">
                                        {candidateName || user?.name || 'Guest'}
                                    </span>
                                </div>
                                <ChevronDown className={`text-slate-400 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} size={14} />
                            </button>

                            <AnimatePresence>
                                {showProfileMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-4 w-60 bg-[var(--bg-surface)] rounded-[2rem] shadow-2xl border border-[var(--border-primary)] p-3 z-50 overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-[var(--border-primary)] mb-2">
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Signed in as</p>
                                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.email || 'Guest Explorer'}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                onOpenOnboarding();
                                                setShowProfileMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 p-4 rounded-2xl text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)] transition-all font-bold text-xs"
                                        >
                                            <BookOpen size={16} className="text-cyan-600 dark:text-cyan-400" /> User Guide & Tour
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all font-bold text-xs border-t border-[var(--border-primary)] mt-1 pt-4"
                                        >
                                            <LogOut size={16} /> Sign Out of Portal
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-[var(--bg-surface)] border-b border-[var(--border-primary)] shadow-2xl overflow-hidden mt-4 mx-4 rounded-2xl"
                    >
                        <div className="flex flex-col p-4 gap-2">
                            {tabs.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                                        className={`
                                            flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all
                                            ${isActive ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400' : 'text-[var(--text-secondary)]'}
                                        `}
                                    >
                                        <tab.icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;

