import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Flame, AlertCircle, Zap,
    Skull, ShieldAlert, Ghost, Loader2,
    MessageSquare, Trophy
} from 'lucide-react';

const RoastTab = ({ roastData, runFeature, loading }) => {

    // Fun stats for the "Roast Meter"
    const roastStats = [
        { label: 'Brutality', value: 'High', color: 'rose' },
        { label: 'Truth Level', value: '100%', color: 'orange' },
        { label: 'Mercy', value: 'None', color: 'slate' }
    ];

    // --- DEFENSIVE DATA NORMALIZATION ---
    const safeJoin = (val) => {
        if (!val) return "";
        if (Array.isArray(val)) return val.join('. ');
        return String(val);
    };

    const processedSections = roastData?.sections || [
        {
            title: "Critical Weaknesses",
            critique: safeJoin(roastData?.weaknesses || roastData?.critique),
            fix: safeJoin(roastData?.priorityFixes || roastData?.fixes)
        },
        {
            title: "Rejection Risks",
            critique: safeJoin(roastData?.rejectionRisks),
            fix: "Address these immediately."
        }
    ];

    const verdict = roastData?.overallVerdict || roastData?.summary || roastData?.brutalTruth;

    return (
        <div className="max-w-5xl mx-auto space-y-10 py-4">
            {/* Roast Header - Fire Aesthetic */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-rose-600/20 rounded-[3.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                <div className="relative p-12 bg-slate-900 rounded-[3.5rem] border border-white/5 overflow-hidden text-center shadow-2xl">
                    {/* Animated Embers Background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 bg-orange-500 rounded-full blur-[1px]"
                                initial={{ y: 300, x: Math.random() * 800, opacity: 0 }}
                                animate={{
                                    y: -100,
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.5, 0]
                                }}
                                transition={{
                                    duration: Math.random() * 3 + 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 5
                                }}
                            />
                        ))}
                    </div>

                    <div className="relative z-10">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-rose-600 rounded-3xl text-white shadow-2xl mb-8 rotate-3 hover:rotate-6 transition-transform"
                        >
                            <Flame size={40} className="animate-pulse" />
                        </motion.div>

                        <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">
                            The Brutal <span className="text-orange-500">Truth</span>
                        </h2>
                        <p className="text-slate-400 max-w-xl mx-auto font-medium text-lg leading-relaxed mb-10">
                            "Recruiters look at your resume for 6 seconds. Most of that time is spent wondering why they opened it. Let's fix that."
                        </p>

                        <button
                            onClick={() => runFeature('roast')}
                            disabled={loading}
                            className="group relative px-12 py-5 bg-white text-slate-900 font-black rounded-2xl hover:bg-orange-500 hover:text-white transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                        >
                            <span className="flex items-center gap-3">
                                {loading ? <Loader2 className="animate-spin" /> : <>Initiate Full Roast <Skull size={18} /></>}
                            </span>
                            <div className="absolute inset-0 bg-white rounded-2xl animate-ping opacity-20 group-hover:hidden" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Roast Results */}
            <AnimatePresence mode="wait">
                {roastData ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        {/* Roast Summary Cards */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {roastStats.map((stat, i) => (
                                <div key={i} className="bg-[var(--bg-surface)] p-6 rounded-[2rem] border border-[var(--border-primary)] shadow-sm text-center">
                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[3px] mb-2">{stat.label}</p>
                                    <p className={`text-2xl font-black text-${stat.color}-500`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Detailed Roasted Sections */}
                        <div className="grid lg:grid-cols-2 gap-8">
                            {processedSections.map((s, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative p-8 bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-primary)] shadow-premium hover:border-orange-200 dark:hover:border-orange-500/30 transition-all group overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        {idx % 3 === 0 ? <ShieldAlert size={80} /> : idx % 3 === 1 ? <Zap size={80} /> : <AlertCircle size={80} />}
                                    </div>

                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-8 bg-orange-500 rounded-full" />
                                        <h4 className="text-xl font-black text-[var(--text-primary)] tracking-tight">{s.title}</h4>
                                    </div>

                                    <p className="text-[var(--text-secondary)] leading-relaxed font-medium mb-8 pl-5 border-l-2 border-slate-100 dark:border-slate-800">
                                        {s.critique || s.roast}
                                    </p>

                                    <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex gap-4">
                                        <div className="p-2 bg-emerald-500 text-white rounded-xl h-fit">
                                            <Trophy size={16} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Elite Fix</span>
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{s.fix || "Strategic adjustment required."}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Grand Finale / Closing Roast */}
                        {verdict && (
                            <div className="p-10 bg-cyan-600 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-400/20 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <MessageSquare className="mx-auto mb-6 opacity-30" size={48} />
                                    <div className="flex flex-col items-center">
                                        <h3 className="text-3xl font-black mb-4 uppercase italic">Final Verdict</h3>
                                        <p className="text-cyan-100 text-lg font-medium leading-relaxed max-w-2xl mx-auto italic mb-8">
                                            "{verdict}"
                                        </p>

                                        {roastData.roastScore !== undefined && (
                                            <div className="bg-white/10 backdrop-blur-md px-10 py-6 rounded-[2rem] border border-white/10">
                                                <div className="text-5xl font-black text-white">{roastData.roastScore}</div>
                                                <div className="text-[10px] font-black text-cyan-200 uppercase tracking-widest mt-1">Impact Potential</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <div className="text-center py-20 grayscale opacity-20">
                        <Ghost size={64} className="mx-auto mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">Awaiting Sacrifice</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RoastTab;

