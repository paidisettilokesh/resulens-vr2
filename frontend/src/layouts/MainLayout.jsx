import { motion } from 'framer-motion';
import Header from '../components/Header';

const MainLayout = ({ children, user, activeTab, setActiveTab, candidateName, analysis, resetAnalysis, triggerNewUpload, handleLogout, onOpenOnboarding }) => {
    return (
        <div className="min-h-screen bg-[var(--bg-app)] font-sans text-[var(--text-primary)] selection:bg-cyan-100 selection:text-cyan-900 relative overflow-x-hidden transition-colors duration-300 flex flex-col">

            {/* 3D Ambient Depth Architecture */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-cyan-500/[0.03] dark:from-cyan-500/[0.02] via-transparent to-transparent" />
                <div className="glow-orb w-[550px] h-[550px] -top-24 -right-24 bg-cyan-500/5 dark:bg-cyan-400/[0.04]" />
                <div className="glow-orb w-[650px] h-[650px] -bottom-40 -left-40 bg-indigo-500/5 dark:bg-cyan-900/[0.08]" />
            </div>

            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-white focus:text-cyan-700 focus:font-bold focus:shadow-xl focus:top-0 focus:left-0 focus-visible:ring-4 focus-visible:ring-cyan-700">
                Skip to Main Content
            </a>

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
                className="pt-32 pb-20 relative z-10 md:pl-20 flex-1"
            >
                <main id="main-content" className="container-custom" tabIndex="-1" style={{ outline: 'none' }}>
                    {children}
                </main>
            </motion.div>

            {/* Global Interaction Ring — Subtle ambient decoration */}
            <div className="fixed bottom-10 right-10 w-32 h-32 border border-[var(--border-secondary)]/30 rounded-full -z-10 animate-pulse pointer-events-none" />
        </div>
    );
};

export default MainLayout;
