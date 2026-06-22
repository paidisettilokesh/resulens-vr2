import React, { useState } from 'react';
import {
    Edit3, FileText, Linkedin, Mail, CheckCircle, Copy,
    Download, Loader2, Target, Lightbulb, UserCheck,
    Send, Sparkles, Image as ImageIcon, Zap, ArrowRight
} from 'lucide-react';
import { copyToClipboard, downloadTextFile } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

const OptimizeTab = ({
    runFeature, rewrittenResume, coverLetter, linkedinData, emailData, tailorData,
    loading, error, candidateName, selectedRole, jobDescription, setJobDescription
}) => {

    const [activeSubTab, setActiveSubTab] = useState('rewrite');
    const [copyStatus, setCopyStatus] = useState(null);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(id);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const tabs = [
        { id: 'rewrite', label: 'ATS Rewriter', icon: Edit3, color: 'primary' },
        { id: 'tailor', label: 'JD Tailoring', icon: Target, color: 'emerald' },
        { id: 'cover-letter', label: 'Cover Letter', icon: FileText, color: 'indigo' },
        { id: 'linkedin', label: 'LinkedIn Pro', icon: Linkedin, color: 'sky' },
        { id: 'email', label: 'Outreach', icon: Mail, color: 'slate' },
    ];

    return (
        <div className="space-y-10 py-4">
            {/* Header Section */}
            <div className="relative p-12 rounded-[3.5rem] bg-cyan-50 dark:bg-cyan-500/10 text-[var(--text-primary)] overflow-hidden shadow-xl border border-cyan-100 dark:border-cyan-500/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-x-20 translate-y-20 blur-3xl" />

                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-cyan-100 dark:border-cyan-500/20 mb-6">
                        <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Premium Optimization Hub</span>
                    </div>
                    <h2 className="text-5xl font-bold mb-4 tracking-tighter text-[var(--text-primary)]">Polish Your <span className="text-cyan-600 dark:text-cyan-400">Professional Identity</span></h2>
                    <p className="text-[var(--text-secondary)] text-lg font-medium leading-relaxed">
                        Transform your raw profile into a high-conversion career brand. Use our AI sub-engines to dominate applicant tracking systems and recruiter searches.
                    </p>
                </div>
            </div>

            {/* Navigation System */}
            <div className="flex flex-wrap justify-center gap-3">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`group flex items-center gap-3 px-8 py-4 rounded-3xl text-sm font-black transition-all duration-300 ${activeSubTab === tab.id
                            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xl ring-1 ring-[var(--border-primary)] -translate-y-1'
                            : 'bg-[var(--bg-surface-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-secondary)]'
                            }`}
                    >
                        <div className={`p-2 rounded-xl transition-colors ${activeSubTab === tab.id ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-[var(--bg-surface-secondary)]'}`}>
                            <tab.icon size={18} />
                        </div>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
                {copyStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest border border-white/10"
                    >
                        <CheckCircle size={16} className="text-emerald-400" /> Authorized Copy Success
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-6xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSubTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* ATS REWRITER */}
                        {activeSubTab === 'rewrite' && (
                            <div className="space-y-8">
                                <div className="bg-[var(--bg-surface)] p-12 rounded-[3rem] border border-[var(--border-primary)] shadow-sm text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-cyan-600 rounded-b-full" />
                                    <div className="w-20 h-20 bg-cyan-500/10 rounded-[2.5rem] flex items-center justify-center text-cyan-600 dark:text-cyan-400 mx-auto mb-6 border border-cyan-500/20 shadow-inner">
                                        <Edit3 size={32} />
                                    </div>
                                    <h3 className="text-3xl font-black text-[var(--text-primary)] mb-3 tracking-tighter">Elite Narrative Engineering</h3>
                                    <p className="text-[var(--text-secondary)] mb-10 max-w-xl mx-auto font-medium leading-relaxed italic">
                                        Deconstructing your career history to inject high-density keywords and quantified achievements required for {selectedRole} prominence.
                                    </p>
                                    <button onClick={() => runFeature('rewrite')} disabled={loading} className="btn-primary !px-16 !py-5 text-lg shadow-2xl active:scale-95 transition-all">
                                        {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} /> Execute Neural Rewrite</>}
                                    </button>
                                </div>

                                {rewrittenResume?.performanceMetrics && (
                                    <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
                                        <div className="p-8 bg-cyan-500 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={40} /></div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2 block">Impact Before</span>
                                            <p className="text-4xl font-black">{rewrittenResume.performanceMetrics.before || 45}%</p>
                                        </div>
                                        <div className="p-8 bg-emerald-500 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles size={40} /></div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2 block">Optimized Score</span>
                                            <p className="text-4xl font-black">{rewrittenResume.performanceMetrics.after || 95}%</p>
                                        </div>
                                        <div className="p-8 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-[2.5rem] text-emerald-600 shadow-xl relative overflow-hidden flex flex-col justify-center">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2 block">Performance Delta</span>
                                            <p className="text-2xl font-black tracking-tighter">{rewrittenResume.performanceMetrics.delta || '+50% Impact Density'}</p>
                                        </div>
                                    </div>
                                )}

                                {rewrittenResume?.skillGapAnalysis?.length > 0 && (
                                    <div className="p-10 bg-rose-500/5 rounded-[3rem] border border-rose-500/10 animate-fade-in">
                                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                            <Target size={18} /> Narrative Skill Gaps Identified
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {rewrittenResume.skillGapAnalysis.map((gap, i) => (
                                                <span key={i} className="px-5 py-2.5 bg-[var(--bg-surface)] rounded-xl text-xs font-bold text-rose-600 border border-rose-100 shadow-sm uppercase tracking-tight">/ {gap}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {rewrittenResume?.rewrittenBullets?.map((section, idx) => (
                                    <div key={idx} className="grid md:grid-cols-2 gap-8 relative p-2">
                                        <div className="bg-[var(--bg-surface-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none font-black text-6xl uppercase tracking-tighter">PREVIOUS</div>
                                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-6 block">Legacy Bullet Point</span>
                                            <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed italic line-through decoration-rose-200 decoration-2">{section.original}</p>
                                        </div>
                                        <div className="bg-[var(--bg-surface)] p-8 rounded-[2.5rem] border-2 border-primary-100 shadow-xl relative group">
                                            <div className="absolute -top-4 left-10 bg-gradient-to-r from-primary-600 to-cyan-600 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg border-2 border-white uppercase tracking-widest">Optimized Bullet</div>
                                            <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-6 block">AI Executive Strategy</span>
                                            <p className="text-base text-[var(--text-primary)] font-bold leading-relaxed">{section.rewritten}</p>
                                            <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex items-start gap-3">
                                                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle size={14} /></div>
                                                <p className="text-xs font-black text-emerald-600 uppercase tracking-wide">Rationale: <span className="text-[var(--text-secondary)] normal-case font-bold">{section.reasoning}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {rewrittenResume?.optimizedSkills && (
                                    <div className="bg-[var(--bg-surface-secondary)] p-12 rounded-[4rem] text-[var(--text-primary)] shadow-xl border border-[var(--border-primary)] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl opacity-50" />
                                        <h4 className="text-2xl font-bold mb-10 flex items-center gap-4 text-[var(--text-primary)]">
                                            <div className="w-2 h-8 bg-cyan-500 rounded-full" /> Skill Optimization Matrix
                                        </h4>
                                        <div className="grid md:grid-cols-3 gap-8">
                                            {['core', 'tools', 'soft'].map(category => (
                                                <div key={category} className="p-8 bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-secondary)] shadow-sm">
                                                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-6 block border-b border-[var(--border-primary)] pb-4">{category} Competencies</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {rewrittenResume.optimizedSkills[category]?.map((s, i) => (
                                                            <span key={i} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/20 uppercase italic">/ {s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* JD TAILORING */}
                        {activeSubTab === 'tailor' && (
                            <div className="space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="bg-[var(--bg-surface)] p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-sm">
                                        <h3 className="text-2xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                                            <Target className="text-emerald-500" /> Executive JD Mapping
                                        </h3>
                                        <textarea
                                            value={jobDescription}
                                            onChange={(e) => setJobDescription(e.target.value)}
                                            className="input-field h-64 font-mono text-xs leading-loose focus:ring-emerald-500/20"
                                            placeholder="Example: We are looking for a Senior React Engineer with 5+ years of experience in distributed systems and state management..."
                                        />
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest italic">
                                            <Lightbulb size={12} className="text-amber-500" /> Pro Tip: Paste the full JD for 99% accuracy.
                                        </div>
                                        <button onClick={() => runFeature('tailor')} disabled={loading || !jobDescription} className="w-full mt-6 btn-primary bg-emerald-600 hover:bg-emerald-700 !py-5 shadow-emerald-200">
                                            {loading ? <Loader2 className="animate-spin" /> : 'Map Resume to JD'}
                                        </button>
                                    </div>

                                    <div className="bg-[var(--bg-surface-secondary)] p-10 rounded-[3rem] text-[var(--text-primary)] flex flex-col justify-center relative overflow-hidden shadow-xl border border-[var(--border-primary)]">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full translate-x-10 -translate-y-10 blur-2xl" />

                                        {!tailorData ? (
                                            <div className="text-center space-y-4">
                                                <UserCheck size={48} className="mx-auto text-emerald-500 opacity-50 mb-4" />
                                                <h4 className="text-xl font-bold text-[var(--text-primary)]">Strategic Compatibility</h4>
                                                <p className="text-[var(--text-muted)] text-sm font-medium">Deconstructing your profile against specific employer requirements.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-10">
                                                <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-6">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Algorithmic Match</span>
                                                        <p className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">{tailorData.matchScore}%</p>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        {Object.entries(tailorData.skillRelevance || {}).map(([key, val]) => (
                                                            <div key={key} className="text-center">
                                                                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{key}</p>
                                                                <p className="text-xs font-black text-emerald-600">{val}%</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div>
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-2">
                                                            <Target size={14} /> Critical Keyword Density
                                                        </h5>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {tailorData.keywordAnalysis?.map((kw, i) => (
                                                                <div key={i} className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-primary)] flex items-center justify-between group hover:border-emerald-200 transition-colors">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-[var(--text-primary)]">{kw.keyword}</span>
                                                                        <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Imp: {kw.jdImportance}</span>
                                                                    </div>
                                                                    <div className={`text-xs font-black ${kw.resumeDensity > 50 ? 'text-emerald-500' : 'text-rose-400'}`}>{kw.resumeDensity}%</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Critical Skill Gaps</h5>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(tailorData.missingSkills || []).map((s, i) => (
                                                                <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-100 uppercase italic">! {s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {tailorData && (
                                    <div className="bg-[var(--bg-surface)] p-12 rounded-[4rem] border-2 border-emerald-100 shadow-xl animate-fade-in divide-y divide-slate-100">
                                        <div className="pb-8">
                                            <h4 className="text-lg font-black text-[var(--text-primary)] mb-4 flex items-center gap-3"><Lightbulb className="text-amber-500" /> Recruiter Gap Analysis</h4>
                                            <p className="text-sm text-[var(--text-secondary)] font-bold leading-relaxed italic pr-12">"{tailorData.recruiterGapAnalysis}"</p>
                                        </div>
                                        <div className="pt-8 space-y-4">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 block">Precision Resume Adjustments</span>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {tailorData.suggestedEdits?.map((adj, i) => (
                                                    <div key={i} className="p-6 bg-[var(--bg-surface-secondary)] rounded-[2rem] border border-[var(--border-primary)] flex flex-col gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-secondary)] flex items-center justify-center text-[10px] font-black text-[var(--text-muted)]">{i + 1}</div>
                                                            <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{adj.context}</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed">{adj.suggestion}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* COVER LETTER */}
                        {activeSubTab === 'cover-letter' && (
                            <div className="space-y-8 animate-fade-in px-4">
                                <div className="bg-[var(--bg-surface)] p-12 rounded-[3.5rem] border border-[var(--border-primary)] shadow-sm text-center">
                                    <div className="w-20 h-20 bg-cyan-100 rounded-[2rem] flex items-center justify-center text-cyan-600 mx-auto mb-6"><FileText size={32} /></div>
                                    <h3 className="text-3xl font-black text-[var(--text-primary)] mb-3">Premium Executive Intent</h3>
                                    <p className="text-[var(--text-muted)] mb-10 max-w-xl mx-auto font-medium">Drafting a high-fidelity, dual-mode cover letter engineered for immediate recruiter resonance.</p>
                                    <button onClick={() => runFeature('cover-letter')} disabled={loading} className="btn-primary bg-cyan-600 hover:bg-cyan-700 !px-16 !py-5 shadow-cyan-100">
                                        {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Generate Professional Letter</>}
                                    </button>
                                </div>

                                {coverLetter?.coverLetter && (
                                    <div className="md:col-span-2 p-12 bg-cyan-50 rounded-[4rem] text-[var(--text-primary)] shadow-xl border border-cyan-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full translate-x-10 -translate-y-10 blur-3xl" />
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-10 pb-6 border-b border-cyan-200 uppercase tracking-[0.2em] font-bold text-xs">
                                            <div className="flex items-center gap-3 text-cyan-600">
                                                <div className="w-10 h-10 bg-[var(--bg-surface)] rounded-xl flex items-center justify-center border border-cyan-100 shadow-sm"><UserCheck size={20} /></div>
                                                Master Draft: {selectedRole}
                                            </div>
                                            <button onClick={() => handleCopy(coverLetter.coverLetter, 'cl')} className="flex items-center gap-2 group/btn text-cyan-600 hover:opacity-70 transition-opacity">
                                                {copyStatus === 'cl' ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                {copyStatus === 'cl' ? 'Copied Success' : 'Copy Full Text'}
                                            </button>
                                        </div>
                                        <pre className="whitespace-pre-wrap font-serif text-[var(--text-primary)] text-xl leading-relaxed italic max-w-4xl relative z-10">{coverLetter.coverLetter}</pre>
                                        <div className="mt-12 flex justify-between items-center bg-[var(--bg-surface)] p-6 rounded-3xl border border-cyan-100 shadow-sm">
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase">Tone Setting: <span className="text-cyan-600">{coverLetter.toneAnalysis}</span></p>
                                            <button onClick={() => downloadTextFile(coverLetter.coverLetter, `CoverLetter-${candidateName}.txt`)} className="px-10 py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-[10px] font-bold transition-all flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-cyan-100"><Download size={14} /> Download PDF Ready</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LINKEDIN PRO */}
                        {activeSubTab === 'linkedin' && (
                            <div className="space-y-10 animate-fade-in px-4 pb-20">
                                <div className="bg-[#0077b5] p-16 rounded-[4rem] text-white overflow-hidden relative shadow-2xl">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--bg-surface)]/10 rounded-full translate-x-32 -translate-y-32 blur-3xl opacity-30" />
                                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
                                        <div className="p-6 bg-[var(--bg-surface)] rounded-[2rem] text-[#0077b5] shadow-2xl shadow-black/20"><Linkedin size={60} /></div>
                                        <div>
                                            <h3 className="text-5xl font-black mb-4 tracking-tighter text-white">LinkedIn Brand Refresh</h3>
                                            <p className="text-white/80 font-medium text-xl max-w-xl">Optimizing your digital authority with executive headlines and storytelling-driven biographies.</p>
                                        </div>
                                        <button onClick={() => runFeature('linkedin')} disabled={loading} className="md:ml-auto px-12 py-6 bg-[var(--bg-surface)] text-[#0077b5] rounded-3xl font-black hover:bg-opacity-90 transition-all shadow-2xl text-lg flex items-center gap-3 active:scale-95">
                                            {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Refresh My Presence</>}
                                        </button>
                                    </div>
                                </div>

                                {linkedinData && (
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-8">
                                            <div className="bg-[var(--bg-surface)] p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-sm relative group overflow-hidden">
                                                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transition-transform group-hover:scale-110"><Sparkles size={100} /></div>
                                                <div className="flex items-center gap-4 mb-8">
                                                    <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-4 py-2 rounded-full uppercase tracking-widest">Optimized High-Impact Headline</span>
                                                    <div className="h-0.5 bg-[var(--bg-surface-secondary)] flex-grow" />
                                                </div>
                                                <h4 className="text-2xl font-black text-[var(--text-primary)] leading-tight mb-8">{linkedinData.headline}</h4>
                                                <button onClick={() => handleCopy(linkedinData.headline, 'li_h')} className="text-xs font-black text-cyan-600 flex items-center gap-2 hover:opacity-70 group/copy">
                                                    {copyStatus === 'li_h' ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} className="group-hover/copy:rotate-6 transition-transform" />}
                                                    {copyStatus === 'li_h' ? 'Authorized Copy Success' : 'Copy Premium Headline'}
                                                </button>
                                            </div>

                                            <div className="bg-[var(--bg-surface)] p-10 rounded-[3.5rem] border border-[var(--border-primary)] shadow-sm">
                                                <div className="flex justify-between items-center mb-10 pb-6 border-b border-[var(--border-primary)]">
                                                    <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Elite "About" Narrative</span>
                                                    <button onClick={() => handleCopy(linkedinData.about, 'li_a')} className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] hover:text-cyan-600 uppercase tracking-widest transition-colors">
                                                        {copyStatus === 'li_a' ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                        {copyStatus === 'li_a' ? 'Copied' : 'Copy Full Story'}
                                                    </button>
                                                </div>
                                                <div className="text-base text-[var(--text-primary)] font-bold leading-relaxed whitespace-pre-line p-10 bg-[var(--bg-surface-secondary)]/50 rounded-[3rem] border border-[var(--border-primary)] italic">
                                                    {linkedinData.about}
                                                </div>
                                            </div>

                                            {linkedinData.experience && (
                                                <div className="space-y-4">
                                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-6">Optimized LinkedIn Experience Bullets</span>
                                                    {linkedinData.experience.map((exp, i) => (
                                                        <div key={i} className="p-8 bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm group">
                                                            <h5 className="text-[10px] font-black text-primary-600 uppercase mb-4">{exp.company}</h5>
                                                            <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed italic">"{exp.rewritten}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-8">
                                            <div className="bg-cyan-50 p-8 rounded-[3rem] text-[var(--text-primary)] shadow-xl border border-cyan-100 relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-sky-400" />
                                                <div className="flex items-center gap-3 mb-6 text-cyan-600">
                                                    <ImageIcon size={20} />
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Visual Identity Concept</span>
                                                </div>
                                                <p className="text-sm font-bold leading-relaxed italic text-[var(--text-secondary)]">
                                                    "{linkedinData.bannerConcept || "A minimalist high-tech background with a blend of your core tech stack icons and professional typography."}"
                                                </p>
                                            </div>

                                            <div className="bg-[var(--bg-surface)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-sm">
                                                <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-6 block">Targeted Endorsements</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {linkedinData.skillsToPin?.map((s, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-cyan-50 text-cyan-700 text-[10px] font-bold rounded-xl border border-cyan-100 uppercase italic"># {s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OUTREACH */}
                        {activeSubTab === 'email' && (
                            <div className="space-y-12 animate-fade-in px-4 pb-20">
                                <div className="bg-[var(--bg-surface-secondary)] p-16 rounded-[4rem] text-[var(--text-primary)] text-center shadow-xl border border-[var(--border-primary)] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full translate-x-20 -translate-y-20 blur-3xl" />
                                    <div className="inline-block p-6 bg-[var(--bg-surface)] rounded-3xl mb-8 border border-[var(--border-primary)] shadow-sm"><Mail size={60} className="text-cyan-600" /></div>
                                    <h3 className="text-5xl font-bold mb-4 tracking-tighter text-[var(--text-primary)]">Outreach Engine <span className="text-cyan-600">v2</span></h3>
                                    <p className="text-[var(--text-muted)] font-medium text-xl mb-12 max-w-2xl mx-auto italic">"Cold outreach is a numbers game. We provide the winning numbers."</p>
                                    <button onClick={() => runFeature('email')} disabled={loading} className="px-16 py-6 btn-primary rounded-[2rem] mx-auto">
                                        {loading ? <Loader2 className="animate-spin" /> : <><Send size={24} /> Generate High-Response Templates</>}
                                    </button>
                                </div>

                                {emailData?.templates && (
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {emailData.templates.map((tmpl, idx) => (
                                            <div key={idx} className="bg-[var(--bg-surface)] p-10 rounded-[3.5rem] border border-[var(--border-primary)] shadow-sm flex flex-col h-full hover:shadow-xl transition-all relative group">
                                                <div className="absolute top-8 right-8 text-primary-100 group-hover:text-primary-500/10 transition-colors"><Mail size={48} /></div>
                                                <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-4 py-2 rounded-full uppercase tracking-[0.2em] mb-8 self-start">{tmpl.type}</span>
                                                <div className="mb-6 pb-6 border-b border-[var(--border-primary)]">
                                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Subject:</span>
                                                    <h4 className="font-black text-lg text-[var(--text-primary)] leading-tight">{tmpl.subject}</h4>
                                                </div>
                                                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-loose flex-grow bg-[var(--bg-surface-secondary)]/50 p-8 rounded-[2.5rem] mb-8 border border-[var(--border-primary)] italic transition-colors group-hover:bg-[var(--bg-surface)]">
                                                    {tmpl.body}
                                                </pre>
                                                <button onClick={() => handleCopy(tmpl.body, `em_${idx}`)} className="w-full py-5 bg-cyan-600 text-white hover:bg-cyan-700 rounded-3xl text-sm font-bold transition-all flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 shadow-lg shadow-cyan-100">
                                                    {copyStatus === `em_${idx}` ? <CheckCircle size={16} /> : <Copy size={16} />}
                                                    {copyStatus === `em_${idx}` ? 'Authorized Copy Success' : 'Copy to Clipboard'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default OptimizeTab;


