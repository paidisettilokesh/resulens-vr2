import React from 'react';
import { Home, Zap, BookOpen, Briefcase, TrendingUp, CheckCircle, FilePlus, Flame, Clock, Shield } from 'lucide-react';
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
        { id: 'history', label: 'Insight Vault', icon: Clock }
    ];

    if (user && (user.role === 'admin' || user.role === 'founder')) {
        tabs.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
    }

    return (
        <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex bg-[var(--glass-bg)] backdrop-blur-md p-1.5 rounded-2xl border border-[var(--glass-border)] shadow-sm w-max mx-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                            ${activeTab === tab.id
                                ? 'bg-[var(--bg-surface)] text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-[var(--border-secondary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)]'
                            }
                        `}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );

};

export default Navigation;

