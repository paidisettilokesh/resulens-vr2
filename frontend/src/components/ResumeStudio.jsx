import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileEdit, Sparkles, Layout, Target,
    ChevronRight, Zap, ShieldCheck, FileText
} from 'lucide-react';
import ResumeBuilder from './ResumeBuilder.jsx';
import OptimizeTab from './OptimizeTab.jsx';

const ResumeStudio = (props) => {
    const [activeSection, setActiveSection] = useState('builder');

    const sections = [
        {
            id: 'builder',
            label: 'Architect Mode',
            desc: 'Build & Structure Foundation',
            icon: FileEdit,
            color: 'indigo'
        },
        {
            id: 'optimize',
            label: 'Optimization Engine',
            desc: 'AI-Powered Precision Polish',
            icon: Sparkles,
            color: 'emerald'
        }
    ];

    return (
        <div className="space-y-8 min-h-[800px]">
            {/* Studio Control Center */}
            <div className="bg-[var(--bg-surface)] rounded-[3rem] border border-[var(--border-primary)] p-2 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.02] to-emerald-500/[0.02] pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center gap-2 p-1">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`
                                relative flex-1 flex items-center gap-4 px-8 py-5 rounded-[2rem] transition-all duration-500 group/btn
                                ${activeSection === section.id
                                    ? 'bg-[var(--bg-app)] shadow-xl ring-1 ring-[var(--border-secondary)]'
                                    : 'hover:bg-[var(--bg-surface-secondary)] opacity-60 hover:opacity-100'
                                }
                            `}
                        >
                            <div className={`
                                p-3 rounded-2xl transition-all duration-500
                                ${activeSection === section.id
                                    ? `bg-${section.color}-500 text-white shadow-lg rotate-0`
                                    : 'bg-[var(--bg-surface-secondary)] text-[var(--text-muted)] group-hover/btn:rotate-12'
                                }
                            `}>
                                <section.icon size={20} />
                            </div>

                            <div className="text-left">
                                <h4 className={`text-sm font-black uppercase tracking-widest ${activeSection === section.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                    {section.label}
                                </h4>
                                <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-70">
                                    {section.desc}
                                </p>
                            </div>

                            {activeSection === section.id && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="ml-auto"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full bg-${section.color}-500 animate-pulse`} />
                                </motion.div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Implementation Workspace */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    {activeSection === 'builder' ? (
                        <div className="animate-fade-in relative">
                            {/* Decorative Badge for Builder */}
                            <div className="absolute -top-4 right-10 z-20 px-4 py-1.5 bg-cyan-600 text-white text-[9px] font-black rounded-full uppercase tracking-[0.2em] shadow-lg border-2 border-white dark:border-slate-900">
                                Document Architect v3.0
                            </div>
                            <ResumeBuilder {...props} />
                        </div>
                    ) : (
                        <div className="animate-fade-in relative">
                            {/* Decorative Badge for Optimization */}
                            <div className="absolute -top-4 right-10 z-20 px-4 py-1.5 bg-emerald-600 text-white text-[9px] font-black rounded-full uppercase tracking-[0.2em] shadow-lg border-2 border-white dark:border-slate-900">
                                Neural Optimization active
                            </div>
                            <OptimizeTab {...props} />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Strategic Footer Context */}
            <div className="flex flex-wrap items-center justify-center gap-8 py-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-1000">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-emerald-500" /> ATS Compliant
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Zap size={14} className="text-amber-500" /> Real-time Sync
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <FileText size={14} className="text-blue-500" /> Export Ready
                </div>
            </div>
        </div>
    );
};

export default ResumeStudio;

