import React from 'react';
import { Home, Zap, BookOpen, Briefcase, TrendingUp, CheckCircle, FilePlus, Flame, Clock, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';

const Navigation = ({ activeTab, setActiveTab }) => {
    const { user } = useUser();

    // 100% Success: Consolidated Tabs Lists
    const tabs = [
        { id: 'home', label: 'Dashboard', icon: Home },
        { id: 'analyzer', label: 'AI Analysis', icon: Zap },
        { id: 'studio', label: 'Resume Studio', icon: FilePlus },
        { id: 'interview', label: 'Interview Prep', icon: CheckCircle },
        { id: 'courses', label: 'Learning Path', icon: BookOpen },
        { id: 'roast', label: 'Resume Roast', icon: Flame },
        { id: 'history', label: 'History', icon: Clock }
    ];

    if (user && (user.role === 'admin' || user.role === 'founder')) {
        tabs.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
    }

    return (
        <nav aria-label="Main Navigation" className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-20 hover:w-64 z-[110] bg-[var(--surface-3d)] border-r border-[var(--border-3d)] shadow-lg transition-all duration-300 group overflow-x-hidden overflow-y-auto">
            {/* Logo area in sidebar */}
            <div className="p-6 pb-8 flex items-center gap-4 border-b border-[var(--border-3d)]">
                <div className="w-8 h-8 bg-cyan-600 rounded-xl flex shrink-0 items-center justify-center text-white shadow-md shadow-cyan-600/20">
                    <Zap size={16} />
                </div>
                <span className="font-black tracking-tighter text-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[var(--text-primary)]">ResuLens AI</span>
            </div>

            <div className="flex flex-col flex-grow gap-2 p-4">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`
                                relative flex items-center gap-4 px-3 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group/item overflow-hidden min-h-[44px]
                                ${isActive ? 'text-cyan-700 dark:text-cyan-400 surface-3d-raised !shadow-sm border-cyan-500/30' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3d-inset)] hover:text-[var(--text-primary)] border border-transparent'}
                            `}
                        >
                            <tab.icon size={20} aria-hidden="true" className="shrink-0 relative z-10" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap relative z-10">{tab.label}</span>
                            
                            {/* Tooltip for compact state */}
                            <div className="absolute left-16 bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover:opacity-0 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                                {tab.label}
                            </div>
                        </button>
                    );
                })}
            </div>
        </nav>
    );

};

export default Navigation;

