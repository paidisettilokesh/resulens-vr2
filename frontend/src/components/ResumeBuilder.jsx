import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import {
    Loader2, Save, Trash, Plus,
    Briefcase, MapPin, Sparkles,
    Feather, ShieldCheck, Settings,
    FileDown, Zap, Target, ArrowUp, ArrowDown, LayoutTemplate, Activity, ChevronDown, ChevronUp
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadPDF } from '../utils/helpers';

// Template Imports
import ProfessionalATS from './resume-templates/ProfessionalATS';
import ModernProfessional from './resume-templates/ModernProfessional';
import Executive from './resume-templates/Executive';
import Graduate from './resume-templates/Graduate';
import Creative from './resume-templates/Creative';
import Technical from './resume-templates/Technical';

const BACKEND = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

const ResumeBuilder = ({ builderData, setBuilderData, saveResume, loading }) => {
    const { user, logout } = useUser();
    const [template, setTemplate] = useState('executive');
    
    // UI State
    const [expandedSection, setExpandedSection] = useState('identity');
    const [isMobilePreview, setIsMobilePreview] = useState(false);
    
    // Architect State
    const [bioLoading, setBioLoading] = useState(false);
    const [polishingId, setPolishingId] = useState(null);
    const [bioError, setBioError] = useState('');
    const [polishError, setPolishError] = useState('');
    
    const [targetJob, setTargetJob] = useState('');
    const [blueprintLoading, setBlueprintLoading] = useState(false);
    
    const [healthScore, setHealthScore] = useState(null);
    const [healthLoading, setHealthLoading] = useState(false);

    // Run health check periodically
    useEffect(() => {
        const timer = setTimeout(() => {
            if (builderData.personal.fullName || builderData.experience.length > 0) {
                checkHealth();
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [builderData]);

    const checkHealth = async () => {
        setHealthLoading(true);
        try {
            const res = await axios.post(`${BACKEND}/api/builder/evaluate-health`, {
                resumeData: builderData
            }, {
                headers: { 'x-user-id': user?.id || 'guest', ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}) }
            });
            if (res.data) setHealthScore(res.data);
        } catch (e) {
            console.error("Health check failed", e);
        } finally {
            setHealthLoading(false);
        }
    };

    const generateBlueprint = async () => {
        if (!targetJob) return alert('Please enter a target job description.');
        setBlueprintLoading(true);
        try {
            const res = await axios.post(`${BACKEND}/api/builder/blueprint-generator`, {
                jobDescription: targetJob,
                userSummary: builderData.personal.bio || builderData.skills || "N/A"
            }, {
                headers: { 'x-user-id': user?.id || 'guest', ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}) }
            });
            
            if (res.data) {
                setBuilderData(prev => ({
                    ...prev,
                    personal: { ...prev.personal, bio: res.data.personal?.bio || prev.personal.bio },
                    experience: res.data.experience?.map((e, i) => ({ ...e, id: Date.now() + i })) || prev.experience,
                    skills: res.data.skills || prev.skills
                }));
                alert("Blueprint generated successfully!");
            }
        } catch (e) {
            alert('AI generation failed. Check backend.');
        } finally {
            setBlueprintLoading(false);
        }
    };

    // --- DOCX GENERATION ---
    const generateDocx = () => {
        let docChildren = [
            new Paragraph({
                text: (builderData.personal.fullName || 'NAME').toUpperCase(),
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 }
            }),
            new Paragraph({
                text: `${builderData.personal.location || ''} | ${builderData.personal.phone || ''} | ${builderData.personal.email || ''}`,
                alignment: AlignmentType.CENTER,
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 4, color: '000000' } },
                spacing: { after: 300 }
            }),
            ...(builderData.personal.bio ? [
                new Paragraph({ text: 'PROFESSIONAL PROFILE', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: builderData.personal.bio, spacing: { after: 200 } }),
            ] : []),
            new Paragraph({ text: 'PROFESSIONAL EXPERIENCE', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            ...builderData.experience.flatMap(exp => [
                new Paragraph({
                    children: [
                        new TextRun({ text: exp.company.toUpperCase(), bold: true }),
                        new TextRun({ text: ` | ${exp.role}`, bold: true }),
                        new TextRun({ text: `\t${exp.period}`, italics: true })
                    ]
                }),
                new Paragraph({ text: exp.details, spacing: { after: 150 } }),
            ]),
            new Paragraph({ text: 'ACADEMIC BACKGROUND', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            ...builderData.education.flatMap(edu => [
                new Paragraph({
                    children: [
                        new TextRun({ text: edu.school, bold: true }),
                        new TextRun({ text: `, ${edu.degree}` }),
                        new TextRun({ text: ` (${edu.year})` })
                    ]
                })
            ]),
            new Paragraph({ text: 'TECHNICAL COMPETENCIES', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            new Paragraph({ text: builderData.skills })
        ];

        const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `${builderData.personal.fullName || 'Resume'}_${template}.docx`);
        });
    };

    const moveExp = (index, dir) => {
        const newExp = [...builderData.experience];
        if (dir === -1 && index > 0) {
            [newExp[index - 1], newExp[index]] = [newExp[index], newExp[index - 1]];
        } else if (dir === 1 && index < newExp.length - 1) {
            [newExp[index + 1], newExp[index]] = [newExp[index], newExp[index + 1]];
        }
        setBuilderData({ ...builderData, experience: newExp });
    };

    const toggleSection = (sec) => setExpandedSection(prev => prev === sec ? null : sec);

    const renderTemplate = () => {
        switch (template) {
            case 'professionalATS': return <ProfessionalATS data={builderData} />;
            case 'modern': return <ModernProfessional data={builderData} />;
            case 'executive': return <Executive data={builderData} />;
            case 'graduate': return <Graduate data={builderData} />;
            case 'creative': return <Creative data={builderData} />;
            case 'technical': return <Technical data={builderData} />;
            default: return <ProfessionalATS data={builderData} />;
        }
    };

    return (
        <div className="relative max-h-[85vh]">
            
            {/* Mobile Toggle */}
            <div className="lg:hidden flex justify-center mb-4">
                <div className="bg-[var(--bg-surface)] p-1 rounded-full border border-[var(--border-primary)] flex gap-1">
                    <button onClick={() => setIsMobilePreview(false)} className={`px-6 py-2 rounded-full text-xs font-bold ${!isMobilePreview ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)]'}`}>Editor</button>
                    <button onClick={() => setIsMobilePreview(true)} className={`px-6 py-2 rounded-full text-xs font-bold ${isMobilePreview ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)]'}`}>Preview</button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 h-full">

                {/* ── LEFT: FORM ───────────────────────────────────────── */}
                <div className={`space-y-6 overflow-y-auto pr-2 pb-20 custom-scrollbar ${isMobilePreview ? 'hidden lg:block' : 'block'}`}>

                    {/* AI Health Bar */}
                    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-primary)] p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                <Activity size={18} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Resume Health</h4>
                                <div className="text-sm font-bold text-[var(--text-primary)]">
                                    {healthLoading ? 'Evaluating...' : (healthScore ? `ATS Ready: ${healthScore.atsScore}%` : 'Awaiting Data')}
                                </div>
                            </div>
                        </div>
                        {healthScore && (
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-[10px] font-black uppercase text-[var(--text-muted)]">Keywords</div>
                                    <div className="text-sm font-bold text-cyan-500">{healthScore.keywordScore}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-black uppercase text-[var(--text-muted)]">Readability</div>
                                    <div className="text-sm font-bold text-amber-500">{healthScore.readabilityScore}%</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Header + Actions */}
                    <div className="flex justify-between items-center bg-[var(--bg-surface)] p-6 rounded-[2rem] border border-[var(--border-primary)] shadow-sm">
                        <div>
                            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">Resume Builder</h2>
                            <p className="text-[var(--text-muted)] text-[10px] font-bold mt-1 uppercase tracking-widest">Live Editor</p>
                        </div>
                        <button onClick={saveResume} disabled={loading} className="p-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl transition-all shadow-lg flex items-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            <span className="text-[10px] font-bold uppercase tracking-widest">Save Session</span>
                        </button>
                    </div>

                    {/* Target Job Generator */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('target')} className="w-full flex justify-between items-center p-6 bg-gradient-to-r from-cyan-500/5 to-transparent hover:from-cyan-500/10 transition-colors">
                            <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-3"><Target size={18} className="text-cyan-500" /> Target Job Blueprint</h3>
                            {expandedSection === 'target' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'target' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-4">
                                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">Paste the description of the job you are targeting. Our AI Architect will instantly generate a structural blueprint perfectly matched to the ATS criteria of this role.</p>
                                        <textarea placeholder="Paste Job Description here..." value={targetJob} onChange={e => setTargetJob(e.target.value)} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-2xl p-4 h-32 text-xs" />
                                        <button onClick={generateBlueprint} disabled={blueprintLoading} className="w-full py-3 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-700 transition-all shadow-md flex justify-center items-center gap-2">
                                            {blueprintLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            {blueprintLoading ? 'Generating Blueprint...' : 'Generate Blueprint Resume'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Templates */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('templates')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-3"><LayoutTemplate size={18} className="text-indigo-500" /> Professional Templates</h3>
                            {expandedSection === 'templates' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'templates' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'professionalATS', label: 'Classic ATS' },
                                            { id: 'modern', label: 'Modern Pro' },
                                            { id: 'executive', label: 'Executive' },
                                            { id: 'graduate', label: 'Graduate' },
                                            { id: 'creative', label: 'Creative' },
                                            { id: 'technical', label: 'Technical' }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTemplate(t.id)}
                                                className={`py-3 px-2 rounded-2xl border-2 transition-all ${template === t.id ? 'bg-[var(--bg-surface)] border-indigo-500 text-indigo-500 shadow-md' : 'bg-[var(--bg-surface-secondary)] border-[var(--border-secondary)] text-[var(--text-muted)] hover:border-indigo-300 hover:text-indigo-500'}`}
                                            >
                                                <span className="text-[9px] font-bold uppercase tracking-tighter block text-center">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Identity */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('identity')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-3"><MapPin size={18} className="text-emerald-500" /> Identity & Profile</h3>
                            {expandedSection === 'identity' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'identity' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Full Name</label>
                                                <input type="text" placeholder="Johnathan Doe" value={builderData.personal.fullName} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, fullName: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Email</label>
                                                <input type="email" placeholder="j.doe@example.com" value={builderData.personal.email} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, email: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Phone</label>
                                                <input type="text" placeholder="+1 555-000-0000" value={builderData.personal.phone} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, phone: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Location</label>
                                                <input type="text" placeholder="London, UK" value={builderData.personal.location} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, location: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Professional Summary</label>
                                                <button onClick={async () => {
                                                    setBioError('');
                                                    setBioLoading(true);
                                                    try {
                                                        const res = await axios.post(`${BACKEND}/api/builder/suggest-bio`, {
                                                            name: builderData.personal.fullName,
                                                            role: builderData.experience[0]?.role || 'Professional',
                                                            skills: builderData.skills,
                                                            experienceSummary: builderData.experience.map(e => e.role).join(', ')
                                                        }, { headers: { 'x-user-id': user?.id || 'guest', ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}) } });
                                                        if (res.data.bio) setBuilderData(prev => ({ ...prev, personal: { ...prev.personal, bio: res.data.bio } }));
                                                    } catch (e) { setBioError('AI unavailable.'); } finally { setBioLoading(false); }
                                                }} disabled={bioLoading} className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                                    {bioLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Auto-Write
                                                </button>
                                            </div>
                                            <textarea placeholder="Senior Technology Executive with 12+ years..." value={builderData.personal.bio} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, bio: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-2xl p-4 h-32 text-xs leading-relaxed" />
                                            {bioError && <p className="text-[10px] text-rose-500 font-bold px-2">⚠ {bioError}</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Experience */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('experience')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-3"><Briefcase size={18} className="text-amber-500" /> Career History</h3>
                            {expandedSection === 'experience' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'experience' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-6">
                                        {builderData.experience.map((exp, index) => (
                                            <div key={exp.id} className="p-5 bg-[var(--bg-surface-secondary)] rounded-2xl relative space-y-4 border border-[var(--border-secondary)] group">
                                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button aria-label="Move experience up" onClick={() => moveExp(index, -1)} disabled={index === 0} className="p-1.5 bg-[var(--bg-surface)] rounded-md border border-[var(--border-secondary)] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowUp size={12} /></button>
                                                    <button aria-label="Move experience down" onClick={() => moveExp(index, 1)} disabled={index === builderData.experience.length - 1} className="p-1.5 bg-[var(--bg-surface)] rounded-md border border-[var(--border-secondary)] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowDown size={12} /></button>
                                                    <button aria-label="Delete experience" onClick={() => setBuilderData({ ...builderData, experience: builderData.experience.filter(e => e.id !== exp.id) })} className="p-1.5 bg-[var(--bg-surface)] text-rose-500 rounded-md border border-[var(--border-secondary)] hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash size={12} /></button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Company</label>
                                                        <input type="text" placeholder="Global Tech Corp" value={exp.company} onChange={(e) => { const n = [...builderData.experience]; n[index].company = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Job Title</label>
                                                        <input type="text" placeholder="Director of Engineering" value={exp.role} onChange={(e) => { const n = [...builderData.experience]; n[index].role = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Dates</label>
                                                    <input type="text" placeholder="Mar 2018 - Present" value={exp.period} onChange={(e) => { const n = [...builderData.experience]; n[index].period = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Achievements (bullet points)</label>
                                                    </div>
                                                    <textarea placeholder="• Increased revenue by 22% ($4.5M)..." value={exp.details} onChange={(e) => { const n = [...builderData.experience]; n[index].details = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 h-32 text-xs leading-relaxed" />
                                                    <div className="flex justify-end pt-2">
                                                        <button
                                                            onClick={async () => {
                                                                setPolishError('');
                                                                setPolishingId(exp.id);
                                                                try {
                                                                    const res = await axios.post(`${BACKEND}/api/builder/optimize-experience`, { role: exp.role, company: exp.company, details: exp.details }, { headers: { 'x-user-id': user?.id || 'guest', ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}) } });
                                                                    if (res.data.optimized) {
                                                                        const n = [...builderData.experience];
                                                                        n[index].details = res.data.optimized;
                                                                        setBuilderData(prev => ({ ...prev, experience: n }));
                                                                    }
                                                                } catch (e) { setPolishError('AI Polish failed.'); } finally { setPolishingId(null); }
                                                            }}
                                                            disabled={polishingId === exp.id}
                                                            className="bg-amber-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-amber-600 transition-all disabled:opacity-60"
                                                        >
                                                            {polishingId === exp.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                            AI Polish
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => setBuilderData({ ...builderData, experience: [...builderData.experience, { id: Date.now(), company: '', role: '', period: '', details: '' }] })} className="w-full py-4 border-2 border-dashed border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] rounded-2xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-colors">
                                            <Plus size={16} /> Add Position
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Skills */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('skills')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-3"><Settings size={18} className="text-rose-500" /> Core Competencies</h3>
                            {expandedSection === 'skills' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'skills' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-4">
                                        <textarea placeholder="Strategic Planning, AI/ML, Cross-functional Leadership..." value={builderData.skills} onChange={(e) => setBuilderData({ ...builderData, skills: e.target.value })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-2xl p-4 h-24 text-xs leading-relaxed" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>

                {/* ── RIGHT: PREVIEW ───────────────────────────────────── */}
                <div className={`relative flex flex-col items-center ${!isMobilePreview ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="w-full flex justify-between items-center mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Live Rendering</span>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => downloadPDF('resume-preview', `${builderData.personal.fullName || 'Resume'}_${template}`)} 
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
                            >
                                <FileDown size={14} /> PDF
                            </button>
                            <button 
                                onClick={generateDocx} 
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
                            >
                                <FileDown size={14} /> DOCX
                            </button>
                        </div>
                    </div>

                    <div className="w-full bg-[var(--bg-surface-secondary)] p-4 sm:p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-inner overflow-auto h-[75vh] custom-scrollbar">
                        {/* Wrapper enforces white paper background regardless of Dark Mode */}
                        <div id="resume-preview" className="mx-auto transform origin-top w-full">
                            {renderTemplate()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeBuilder;
