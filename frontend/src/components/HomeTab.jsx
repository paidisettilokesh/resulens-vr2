
import React from 'react';
import { Zap, Briefcase, AlertTriangle, CheckCircle, Download, CheckCircle as CheckIcon, Globe, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useResume } from '../context/ResumeContext';

const HomeTab = ({ commonRoles, analyzeResume, setActiveTab }) => {
    const {
        file, setFile, selectedRole, setSelectedRole,
        customRole, setCustomRole, error, loading
    } = useResume();

    const handleFileUpload = (event) => {
        const uploadedFile = event.target.files[0];
        if (!uploadedFile) return;
        setFile(uploadedFile);
    };

    return (
        <div className="space-y-20 py-12 animate-fade-up">
            {/* HERO SECTION */}
            <div className="text-center space-y-6 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
                    <Sparkles size={14} /> AI-Powered Career Intelligence
                </div>
                <h1 className="text-7xl font-bold text-[var(--text-primary)] tracking-tighter leading-[0.9] mb-6">
                    Engineering <span className="text-cyan-600 dark:text-cyan-400">Elite</span> Professional Identities
                </h1>
                <p className="text-[var(--text-secondary)] text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                    A senior-grade diagnostic engine designed to optimize your resume for the world's most competitive roles.
                </p>
            </div>

            {/* PORTAL CORE */}
            <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-stretch">
                {/* 1. INPUT POD (7 cols) */}
                <div className="lg:col-span-7 bg-[var(--bg-surface)] rounded-[4rem] p-12 border border-[var(--border-primary)] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -translate-y-16 translate-x-16" />

                    <div className="relative z-10 space-y-10">
                        <div className="space-y-6">
                            <label className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] ml-1">
                                <div className="w-6 h-6 rounded-lg bg-cyan-600 text-white flex items-center justify-center text-[10px]">1</div>
                                Target Career Track
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    className="input-field appearance-none cursor-pointer hover:border-cyan-400 transition-colors"
                                >
                                    <option value="" className="bg-[var(--bg-surface)]">Select Domain...</option>
                                    {commonRoles.map(r => <option key={r} value={r} className="bg-[var(--bg-surface)]">{r}</option>)}
                                    <option value="Other" className="bg-[var(--bg-surface)]">Custom Track</option>
                                </select>
                                {selectedRole === 'Other' && (
                                    <input
                                        placeholder="Enter Specific Role"
                                        value={customRole}
                                        onChange={e => setCustomRole(e.target.value)}
                                        className="input-field animate-fade-up"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] ml-1">
                                <div className="w-6 h-6 rounded-lg bg-cyan-600 text-white flex items-center justify-center text-[10px]">2</div>
                                Professional Manuscript
                            </label>
                            <label className={`block w-full border-4 border-dashed rounded-[3rem] p-12 text-center cursor-pointer transition-all ${file ? 'border-emerald-400 bg-emerald-500/10' : 'border-[var(--border-secondary)] hover:border-cyan-400 hover:bg-cyan-500/5 hover:shadow-inner'}`}>
                                <input type="file" onChange={handleFileUpload} accept=".pdf,.doc,.docx" className="hidden" />
                                <div className="flex flex-col items-center gap-4">
                                    {file ? (
                                        <>
                                            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 animate-bounce">
                                                <CheckIcon size={32} strokeWidth={3} />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xl font-bold text-emerald-500 block">{file.name}</span>
                                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Document Secured</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 bg-cyan-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-cyan-100 group-hover:scale-110 transition-transform">
                                                <Download size={32} />
                                            </div>
                                            <div className="space-y-3">
                                                <span className="text-xl font-bold text-[var(--text-primary)] block">Drop Your Resume Here</span>
                                                <span className="text-sm font-medium text-[var(--text-muted)] block">Click to browse or drag & drop</span>

                                                {/* Supported format badges */}
                                                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                                                    {[
                                                        { ext: 'PDF', tip: 'Text-based PDFs only', color: 'bg-rose-50 text-rose-600 border-rose-200' },
                                                        { ext: 'DOCX', tip: 'Best format — recommended', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                                                        { ext: 'DOC', tip: 'Legacy Word format', color: 'bg-amber-50 text-amber-600 border-amber-200' },
                                                    ].map(({ ext, tip, color }) => (
                                                        <span
                                                            key={ext}
                                                            title={tip}
                                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color} cursor-default`}
                                                        >
                                                            .{ext}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Scanned PDF warning */}
                                                <p className="text-[10px] text-amber-500 font-bold flex items-center justify-center gap-1 mt-1">
                                                    <AlertTriangle size={11} />
                                                    Scanned / image-only PDFs cannot be parsed
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={() => { setActiveTab('analyzer'); analyzeResume(); }}
                            disabled={!file || !selectedRole || loading}
                            className="btn-primary w-full !rounded-[2rem] group"
                        >
                            {loading ? (
                                <Zap size={24} className="animate-spin text-cyan-400" />
                            ) : (
                                <Zap size={24} className="group-hover:text-cyan-400 transition-colors" />
                            )}
                            {loading ? 'Processing...' : 'Execute Neural Analysis'}
                        </button>

                        {error && <p className="text-center text-rose-500 text-sm font-bold italic">! {error}</p>}
                    </div>
                </div>

                {/* 2. INSIGHTS SIDEBAR (5 cols) */}
                <div className="lg:col-span-5 h-full flex flex-col gap-6">
                    <div className="bg-[var(--bg-surface-secondary)] rounded-[4rem] p-10 text-[var(--text-primary)] flex-grow relative overflow-hidden shadow-2xl border border-[var(--border-primary)]">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.05] dark:opacity-[0.1]">
                            <Shield size={120} />
                        </div>
                        <h3 className="text-3xl font-bold mb-8 leading-tight tracking-tight pr-12 relative z-10">
                            Proprietary <span className="text-cyan-600 dark:text-cyan-400">Diagnostic</span> Protocol
                        </h3>
                        <div className="space-y-4 relative z-10">
                            {[
                                { id: 'analyzer', label: 'ATS Architecture Audit', icon: Zap, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
                                { id: 'market', label: 'Market Intelligence 2026', icon: Briefcase, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
                                { id: 'studio', label: 'Identity Rank Optimization', icon: Globe, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' }
                            ].map((f, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ x: 10 }}
                                    onClick={() => setActiveTab(f.id)}
                                    className="flex items-center gap-5 p-6 bg-[var(--bg-surface)] backdrop-blur-sm rounded-[2rem] border border-[var(--border-secondary)] shadow-sm hover:bg-[var(--bg-surface-secondary)] transition-all cursor-pointer group"
                                >
                                    <div className={`p-4 rounded-2xl ${f.bg} ${f.color} shadow-inner shrink-0`}><f.icon size={22} /></div>
                                    <span className="font-bold text-[var(--text-primary)] text-lg tracking-tight">{f.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-[3.5rem] p-10 text-white shadow-xl shadow-cyan-100/50 flex items-center gap-6 group hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                            <Sparkles size={32} />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl leading-snug">Elite Answer Engine</h4>
                            <p className="text-cyan-100 text-xs font-medium opacity-80">Generate high-stakes interview responses.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeTab;

