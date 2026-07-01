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
        <nav className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-20 hover:w-64 z-[110] bg-[var(--bg-surface)] border-r border-[var(--border-primary)] shadow-2xl transition-all duration-300 group overflow-x-hidden overflow-y-auto">
            {/* Logo area in sidebar */}
            <div className="p-6 pb-8 flex items-center gap-4 border-b border-[var(--border-secondary)]">
                <div className="w-8 h-8 bg-cyan-600 rounded-xl flex shrink-0 items-center justify-center text-white shadow-xl shadow-cyan-100">
                    <Zap size={16} />
                </div>
                <span className="font-black tracking-tighter text-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">ResuLens AI</span>
            </div>

            <div className="flex flex-col flex-grow gap-2 p-4">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                relative flex items-center gap-4 px-3 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group/item overflow-hidden
                                ${isActive ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 shadow-sm border border-cyan-100 dark:border-cyan-800/30' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-secondary)] hover:text-[var(--text-primary)]'}
                            `}
                        >
                            <tab.icon size={20} className="shrink-0 relative z-10" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap relative z-10">{tab.label}</span>
                            
                            {/* Tooltip for compact state */}
                            <div className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover:opacity-0 transition-opacity whitespace-nowrap z-50">
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

