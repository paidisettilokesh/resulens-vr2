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



            {/* Global Interaction Ring — Subtle ambient decoration */}
            <div className="fixed bottom-10 right-10 w-32 h-32 border border-slate-200/50 rounded-full -z-10 animate-pulse pointer-events-none" />
        </div>
    );
};

export default MainLayout;
