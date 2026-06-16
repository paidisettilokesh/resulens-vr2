import { motion } from 'framer-motion';
import Header from '../components/Header';
import { SOCIAL_LINKS } from '../constants/socialLinks';

const MainLayout = ({ children, user, activeTab, setActiveTab, candidateName, analysis, resetAnalysis, triggerNewUpload, handleLogout, onOpenOnboarding }) => {
    return (
        <div className="min-h-screen bg-[var(--bg-app)] font-sans text-[var(--text-primary)] selection:bg-cyan-100 selection:text-cyan-900 relative overflow-x-hidden transition-colors duration-300">

            {/* Elite Background Architecture */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-cyan-50/10 via-transparent to-transparent" />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>

            <Header
                windowSize={{ width: window.innerWidth, height: window.innerHeight }}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                candidateName={candidateName}
                analysis={analysis}
                resetAnalysis={resetAnalysis}
                triggerNewUpload={triggerNewUpload}
                user={user}
                handleLogout={handleLogout}
                onOpenOnboarding={onOpenOnboarding}
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-32 pb-20 relative z-10"
            >
                <main className="container-custom">
                    {children}
                </main>
            </motion.div>

            {/* ── Footer ───────────────────────────────────────────────────────────── */}
            <footer className="relative z-10 border-t border-[var(--border-primary)] bg-[var(--bg-surface)]/60 backdrop-blur-sm">
                <div className="container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-4">

                    {/* Brand */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">ResuLens</span>
                        <span className="text-[var(--text-muted)] text-sm">·</span>
                        <span className="text-xs text-[var(--text-muted)]">AI Resume Intelligence</span>
                    </div>

                    {/* Social Links */}
                    <div className="flex items-center gap-5">
                        <a
                            href={SOCIAL_LINKS.github.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={SOCIAL_LINKS.github.ariaLabel}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 hover:scale-105"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                            </svg>
                            GitHub
                        </a>

                        <span className="text-[var(--border-primary)] select-none">|</span>

                        <a
                            href={SOCIAL_LINKS.linkedin.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={SOCIAL_LINKS.linkedin.ariaLabel}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[#0077B5] dark:hover:text-[#38bdf8] transition-all duration-200 hover:scale-105"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                            LinkedIn
                        </a>
                    </div>

                    {/* Copyright */}
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">
                        © {new Date().getFullYear()} ResuLens · Built with ❤️
                    </p>

                </div>
            </footer>

            {/* Global Interaction Ring — Subtle ambient decoration */}
            <div className="fixed bottom-10 right-10 w-32 h-32 border border-slate-200/50 rounded-full -z-10 animate-pulse pointer-events-none" />
        </div>
    );
};

export default MainLayout;
