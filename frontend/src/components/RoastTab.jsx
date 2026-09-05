import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Flame, AlertCircle, Zap,
    Skull, ShieldAlert, Ghost, Loader2,
    MessageSquare, Trophy, CheckCircle2,
    XCircle, ArrowRight, Tag, TrendingUp
} from 'lucide-react';

const RoastTab = ({ roastData, runFeature, loading }) => {

    // Defensive Data Normalization for Legacy / Simple Payloads
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
    const scoreVal = roastData?.roastScore !== undefined
        ? Number(roastData.roastScore)
        : roastData?.burnScore !== undefined
            ? Number(roastData.burnScore)
            : null;

    const breakdown = roastData?.breakdown;
    const actionableIssues = roastData?.actionableIssues;
    const jdAlignment = roastData?.jdAlignment;

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
                            className="group relative px-12 py-5 bg-white text-slate-900 font-black rounded-2xl hover:bg-orange-500 hover:text-white transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 shadow-2xl"
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
                        {/* 1. CATEGORIZED SCORING METHODOLOGY BREAKDOWN */}
                        <div className="bg-[var(--bg-surface)] p-8 sm:p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-xl space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-secondary)] pb-6">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-xs font-black uppercase tracking-widest mb-2">
                                        <TrendingUp size={14} /> Diagnostic Scoring System
                                    </div>
                                    <h3 className="text-2xl font-black text-[var(--text-primary)]">Resume Impact Breakdown</h3>
                                    <p className="text-sm font-medium text-[var(--text-secondary)]">Four 25-point dimensions evaluated strictly from your document content.</p>
                                </div>
                                {scoreVal !== null && (
                                    <div className="text-right shrink-0">
                                        <div className="text-4xl font-black text-orange-500">{scoreVal} <span className="text-lg text-[var(--text-muted)]">/ 100</span></div>
                                        <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                                            {scoreVal >= 75 ? 'Top 15% Candidate' : scoreVal >= 50 ? 'Average Rejection Risk' : 'High Friction Profile'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {breakdown ? (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Content & Clarity', val: breakdown.contentScore ?? 0, max: 25, color: 'cyan', desc: 'Summary & progression' },
                                        { label: 'ATS Readiness', val: breakdown.atsScore ?? 0, max: 25, color: 'indigo', desc: 'Formatting & headers' },
                                        { label: 'Impact & Outcomes', val: breakdown.impactScore ?? 0, max: 25, color: 'emerald', desc: 'Metrics & action verbs' },
                                        { label: 'Skills Alignment', val: breakdown.skillsScore ?? 0, max: 25, color: 'orange', desc: 'Role competencies' },
                                    ].map((dim, idx) => (
                                        <div key={idx} className="bg-[var(--bg-surface-secondary)] p-5 rounded-2xl border border-[var(--border-secondary)] space-y-2">
                                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">{dim.label}</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-[var(--text-primary)]">{dim.val}</span>
                                                <span className="text-xs font-bold text-[var(--text-muted)]">/{dim.max}</span>
                                            </div>
                                            <div className="w-full bg-[var(--border-secondary)] h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-${dim.color}-500 rounded-full transition-all duration-1000`}
                                                    style={{ width: `${Math.min(100, (dim.val / dim.max) * 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-[11px] text-[var(--text-muted)]">{dim.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Brutality', value: 'High', color: 'rose' },
                                        { label: 'Truth Level', value: '100%', color: 'orange' },
                                        { label: 'Mercy', value: 'None', color: 'slate' }
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-[var(--bg-surface-secondary)] p-6 rounded-[2rem] border border-[var(--border-secondary)] text-center">
                                            <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[3px] mb-2">{stat.label}</p>
                                            <p className={`text-2xl font-black text-${stat.color}-500`}>{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. JOB DESCRIPTION ALIGNMENT (IF PROVIDED) */}
                        {jdAlignment && (
                            <div className="bg-[var(--bg-surface)] p-8 sm:p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-premium space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-cyan-600 rounded-full" />
                                    <h4 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Job Description Alignment</h4>
                                </div>
                                {jdAlignment.alignmentSummary && (
                                    <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed">{jdAlignment.alignmentSummary}</p>
                                )}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-3">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                            <CheckCircle2 size={16} /> Verified Skills in Resume
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {jdAlignment.matchingSkills?.length ? jdAlignment.matchingSkills.map((s, i) => (
                                                <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/20">
                                                    {s}
                                                </span>
                                            )) : <span className="text-xs text-[var(--text-muted)]">No explicit matches parsed.</span>}
                                        </div>
                                    </div>
                                    <div className="p-6 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-3">
                                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
                                            <XCircle size={16} /> Missing High-Priority Requirements
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {jdAlignment.missingSkills?.length ? jdAlignment.missingSkills.map((s, i) => (
                                                <span key={i} className="px-3 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-500/20">
                                                    {s}
                                                </span>
                                            )) : <span className="text-xs text-[var(--text-muted)]">No critical gaps detected.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. STRUCTURED ACTIONABLE DIAGNOSTICS */}
                        {actionableIssues && actionableIssues.length > 0 ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                                        Evidence-Based Issues & Fixes
                                    </h4>
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                        {actionableIssues.length} Identified
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {actionableIssues.map((issue, idx) => {
                                        const isHigh = issue.priority === 'High';
                                        const isMed = issue.priority === 'Medium';
                                        const badgeColor = isHigh
                                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                                            : isMed
                                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                                : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20';

                                        return (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="p-8 bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-primary)] shadow-premium hover:border-orange-200 dark:hover:border-orange-500/30 transition-all space-y-6"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-secondary)] pb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
                                                            {issue.priority || 'High'} Priority
                                                        </span>
                                                        {issue.location && (
                                                            <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1">
                                                                <Tag size={12} /> {issue.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Problem Quote */}
                                                <div className="space-y-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Identified Flaw:</span>
                                                    <div className="p-4 bg-rose-500/5 rounded-xl border-l-4 border-rose-500 text-sm font-medium text-[var(--text-primary)] italic">
                                                        "{issue.problem}"
                                                    </div>
                                                </div>

                                                {/* Why it matters & How to fix */}
                                                <div className="grid md:grid-cols-2 gap-6 text-xs leading-relaxed">
                                                    <div className="space-y-1">
                                                        <span className="font-black text-[var(--text-muted)] uppercase tracking-wider block">Why It Matters:</span>
                                                        <p className="text-[var(--text-secondary)] font-medium">{issue.whyItMatters}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="font-black text-[var(--text-muted)] uppercase tracking-wider block">How To Fix:</span>
                                                        <p className="text-[var(--text-secondary)] font-medium">{issue.howToFix}</p>
                                                    </div>
                                                </div>

                                                {/* Improved Example */}
                                                {issue.improvedExample && (
                                                    <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-2">
                                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                                                            <Trophy size={14} /> Recruiter-Approved Replacement
                                                        </div>
                                                        <p className="text-xs font-medium text-[var(--text-primary)] leading-relaxed italic pl-2 border-l-2 border-emerald-500">
                                                            "{issue.improvedExample}"
                                                        </p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            /* Fallback to processed sections for backward compatibility */
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
                                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Elite Fix</span>
                                                <p className="text-sm font-bold text-[var(--text-primary)]">{s.fix || "Strategic adjustment required."}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Grand Finale / Closing Roast */}
                        {verdict && (
                            <div className="p-10 bg-cyan-600 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-400/20 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <MessageSquare className="mx-auto mb-6 opacity-30" size={48} />
                                    <div className="flex flex-col items-center">
                                        <h3 className="text-3xl font-black mb-4 uppercase italic">Final Recruiter Verdict</h3>
                                        <p className="text-cyan-100 text-lg font-medium leading-relaxed max-w-2xl mx-auto italic mb-8">
                                            "{verdict}"
                                        </p>

                                        {scoreVal !== null && (
                                            <div className="bg-white/10 backdrop-blur-md px-10 py-6 rounded-[2rem] border border-white/10">
                                                <div className="text-5xl font-black text-white">{scoreVal}</div>
                                                <div className="text-xs font-black text-cyan-200 uppercase tracking-widest mt-1">Impact Potential</div>
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
