import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useUser } from '../context/UserContext';
import {
    Loader2, Save, Trash, Plus,
    Briefcase, MapPin, Sparkles,
    Settings, FileDown, Zap, Target,
    ArrowUp, ArrowDown, LayoutTemplate,
    Activity, ChevronDown, ChevronUp,
    GraduationCap
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

const ResumeBuilder = ({ builderData, setBuilderData, saveResume, loading }) => {
    const { user } = useUser();
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
            if (
                builderData?.personal?.fullName ||
                builderData?.experience?.length > 0 ||
                builderData?.education?.length > 0
            ) {
                checkHealth();
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [builderData]);

    const checkHealth = async () => {
        setHealthLoading(true);
        try {
            const res = await apiClient.post('/builder/evaluate-health', {
                resumeData: builderData
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
            const res = await apiClient.post('/builder/blueprint-generator', {
                jobDescription: targetJob,
                userSummary: builderData.personal?.bio || builderData.skills || "N/A"
            });
            
            if (res.data) {
                setBuilderData(prev => ({
                    ...prev,
                    personal: { ...prev.personal, bio: res.data.personal?.bio || prev.personal?.bio },
                    experience: res.data.experience?.map((e, i) => ({ ...e, id: Date.now() + i })) || prev.experience,
                    education: res.data.education?.map((e, i) => ({ ...e, id: Date.now() + 100 + i })) || prev.education,
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
        const personal = builderData.personal || {};
        const experience = Array.isArray(builderData.experience) ? builderData.experience : [];
        const education = Array.isArray(builderData.education) ? builderData.education : [];

        let docChildren = [
            new Paragraph({
                text: (personal.fullName || 'NAME').toUpperCase(),
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 }
            }),
            new Paragraph({
                text: `${personal.location || ''} | ${personal.phone || ''} | ${personal.email || ''}`,
                alignment: AlignmentType.CENTER,
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 4, color: '000000' } },
                spacing: { after: 300 }
            }),
            ...(personal.bio ? [
                new Paragraph({ text: 'PROFESSIONAL PROFILE', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({ text: personal.bio, spacing: { after: 200 } }),
            ] : []),
            new Paragraph({ text: 'PROFESSIONAL EXPERIENCE', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            ...experience.flatMap(exp => [
                new Paragraph({
                    children: [
                        new TextRun({ text: (exp.company || '').toUpperCase(), bold: true }),
                        new TextRun({ text: exp.role ? ` | ${exp.role}` : '', bold: true }),
                        new TextRun({ text: exp.period ? `\t${exp.period}` : '', italics: true })
                    ]
                }),
                new Paragraph({ text: exp.details || '', spacing: { after: 150 } }),
            ]),
            new Paragraph({ text: 'ACADEMIC BACKGROUND', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            ...education.flatMap(edu => {
                const institution = edu.school || edu.institution || 'University';
                const dates = edu.startDate && (edu.endDate || edu.year)
                    ? `${edu.startDate} – ${edu.endDate || edu.year}`
                    : (edu.endDate || edu.year || edu.startDate || '');
                const degreeTitle = [edu.degree, edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : null].filter(Boolean).join(' ');

                const items = [
                    new Paragraph({
                        children: [
                            new TextRun({ text: institution.toUpperCase(), bold: true }),
                            new TextRun({ text: degreeTitle ? ` | ${degreeTitle}` : '' }),
                            new TextRun({ text: dates ? `\t${dates}` : '', italics: true })
                        ]
                    })
                ];
                if (edu.grade) {
                    items.push(new Paragraph({
                        children: [new TextRun({ text: `Grade: ${edu.grade}`, italics: true })]
                    }));
                }
                if (edu.coursework) {
                    items.push(new Paragraph({
                        children: [new TextRun({ text: `Relevant Coursework: ${edu.coursework}` })]
                    }));
                }
                if (edu.achievements) {
                    items.push(new Paragraph({
                        children: [new TextRun({ text: `Honors: ${edu.achievements}` })]
                    }));
                }
                return items;
            }),
            new Paragraph({ text: 'TECHNICAL COMPETENCIES', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            new Paragraph({ text: builderData.skills || '' })
        ];

        const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `${personal.fullName || 'Resume'}_${template}.docx`);
        });
    };

    // Reordering & State Mutators for Experience
    const moveExp = (index, dir) => {
        const list = [...(builderData.experience || [])];
        if (dir === -1 && index > 0) {
            [list[index - 1], list[index]] = [list[index], list[index - 1]];
        } else if (dir === 1 && index < list.length - 1) {
            [list[index + 1], list[index]] = [list[index], list[index + 1]];
        }
        setBuilderData({ ...builderData, experience: list });
    };

    // Reordering & State Mutators for Education
    const moveEdu = (index, dir) => {
        const list = [...(builderData.education || [])];
        if (dir === -1 && index > 0) {
            [list[index - 1], list[index]] = [list[index], list[index - 1]];
        } else if (dir === 1 && index < list.length - 1) {
            [list[index + 1], list[index]] = [list[index], list[index + 1]];
        }
        setBuilderData({ ...builderData, education: list });
    };

    const addEdu = () => {
        const list = [...(builderData.education || [])];
        list.push({
            id: Date.now(),
            school: '',
            degree: '',
            fieldOfStudy: '',
            startDate: '',
            endDate: '',
            grade: '',
            coursework: '',
            achievements: ''
        });
        setBuilderData({ ...builderData, education: list });
    };

    const removeEdu = (id) => {
        const list = (builderData.education || []).filter(e => e.id !== id);
        setBuilderData({ ...builderData, education: list });
    };

    const updateEdu = (index, field, value) => {
        const list = [...(builderData.education || [])];
        list[index] = { ...list[index], [field]: value };
        setBuilderData({ ...builderData, education: list });
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

    const educationList = Array.isArray(builderData.education) ? builderData.education : [];
    const experienceList = Array.isArray(builderData.experience) ? builderData.experience : [];

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
                            <div className="p-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">
                                <Activity size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">Resume Health</h4>
                                <div className="text-sm font-bold text-[var(--text-primary)]">
                                    {healthLoading ? 'Evaluating...' : (healthScore ? `ATS Ready: ${healthScore.atsScore}%` : 'Awaiting Data')}
                                </div>
                            </div>
                        </div>
                        {healthScore && (
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Keywords</div>
                                    <div className="text-sm font-bold text-cyan-700 dark:text-cyan-400">{healthScore.keywordScore}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Readability</div>
                                    <div className="text-sm font-bold text-amber-700 dark:text-amber-400">{healthScore.readabilityScore}%</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Header + Actions */}
                    <div className="flex justify-between items-center bg-[var(--bg-surface)] p-6 rounded-[2rem] border border-[var(--border-primary)] shadow-sm">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Resume Builder</h2>
                            <p className="text-[var(--text-muted)] text-xs font-semibold mt-1 uppercase tracking-wider">Live Editor</p>
                        </div>
                        <button onClick={saveResume} disabled={loading} className="p-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl transition-all shadow-lg flex items-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            <span className="text-xs font-bold uppercase tracking-widest">Save Session</span>
                        </button>
                    </div>

                    {/* Target Job Generator */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('target')} className="w-full flex justify-between items-center p-6 bg-gradient-to-r from-cyan-500/5 to-transparent hover:from-cyan-500/10 transition-colors">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-3"><Target size={18} className="text-cyan-700 dark:text-cyan-400" /> Target Job Blueprint</h3>
                            {expandedSection === 'target' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'target' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-4">
                                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">Paste the description of the job you are targeting. Our AI Architect will instantly generate a structural blueprint perfectly matched to the ATS criteria of this role.</p>
                                        <textarea placeholder="Paste Job Description here..." value={targetJob} onChange={e => setTargetJob(e.target.value)} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-2xl p-4 h-32 text-xs" />
                                        <button onClick={generateBlueprint} disabled={blueprintLoading} className="w-full py-3 bg-cyan-600 text-white text-xs font-bold uppercase tracking-wider rounded-2xl hover:bg-cyan-700 transition-all shadow-md flex justify-center items-center gap-2">
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
                            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-3"><LayoutTemplate size={18} className="text-indigo-500" /> Professional Templates</h3>
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
                                                <span className="text-xs font-semibold uppercase tracking-wider block text-center">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Identity & Profile */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('identity')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-3"><MapPin size={18} className="text-emerald-700 dark:text-emerald-400" /> Identity & Profile</h3>
                            {expandedSection === 'identity' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'identity' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Full Name</label>
                                                <input type="text" placeholder="Johnathan Doe" value={builderData.personal?.fullName || ''} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, fullName: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Email</label>
                                                <input type="email" placeholder="j.doe@example.com" value={builderData.personal?.email || ''} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, email: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Phone</label>
                                                <input type="text" placeholder="+1 555-000-0000" value={builderData.personal?.phone || ''} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, phone: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Location</label>
                                                <input type="text" placeholder="London, UK or New York, NY" value={builderData.personal?.location || ''} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, location: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2.5 text-xs" />
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Professional Summary</label>
                                                <button onClick={async () => {
                                                    setBioError('');
                                                    setBioLoading(true);
                                                    try {
                                                        const res = await apiClient.post('/builder/suggest-bio', {
                                                            name: builderData.personal?.fullName,
                                                            role: builderData.experience?.[0]?.role || 'Professional',
                                                            skills: builderData.skills,
                                                            experienceSummary: (builderData.experience || []).map(e => e.role).join(', ')
                                                        });
                                                        if (res.data.bio) setBuilderData(prev => ({ ...prev, personal: { ...prev.personal, bio: res.data.bio } }));
                                                    } catch (e) { setBioError('AI unavailable.'); } finally { setBioLoading(false); }
                                                }} disabled={bioLoading} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                    {bioLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Auto-Write
                                                </button>
                                            </div>
                                            <textarea placeholder="Senior Technology Executive with 12+ years of experience..." value={builderData.personal?.bio || ''} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, bio: e.target.value } })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-2xl p-4 h-32 text-xs leading-relaxed" />
                                            {bioError && <p className="text-xs text-rose-700 dark:text-rose-400 font-bold px-2">⚠ {bioError}</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Education & Academics (DEDICATED SECTION) ────────────────── */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('education')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-3">
                                <GraduationCap size={18} className="text-cyan-700 dark:text-cyan-400" />
                                Education & Academics
                                <span className="text-[10px] bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                                    {educationList.length}
                                </span>
                            </h3>
                            {expandedSection === 'education' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'education' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-6">
                                        {educationList.length === 0 ? (
                                            <div className="p-6 border-2 border-dashed border-[var(--border-secondary)] rounded-2xl text-center space-y-2">
                                                <GraduationCap className="mx-auto text-[var(--text-muted)] opacity-60" size={32} />
                                                <p className="text-xs font-semibold text-[var(--text-muted)]">No education entries yet.</p>
                                                <p className="text-[11px] text-[var(--text-muted)] opacity-80">Add degrees, college/university details, grades, and academic achievements.</p>
                                            </div>
                                        ) : (
                                            educationList.map((edu, index) => (
                                                <div key={edu.id || index} className="p-5 bg-[var(--bg-surface-secondary)] rounded-2xl relative space-y-4 border border-[var(--border-secondary)] group">
                                                    {/* Control Buttons */}
                                                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-secondary)]">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                            Qualification #{index + 1}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                aria-label="Move education up"
                                                                onClick={() => moveEdu(index, -1)}
                                                                disabled={index === 0}
                                                                className="p-1.5 bg-[var(--bg-surface)] rounded-md border border-[var(--border-secondary)] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-primary)]"
                                                            >
                                                                <ArrowUp size={12} />
                                                            </button>
                                                            <button
                                                                aria-label="Move education down"
                                                                onClick={() => moveEdu(index, 1)}
                                                                disabled={index === educationList.length - 1}
                                                                className="p-1.5 bg-[var(--bg-surface)] rounded-md border border-[var(--border-secondary)] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-primary)]"
                                                            >
                                                                <ArrowDown size={12} />
                                                            </button>
                                                            <button
                                                                aria-label="Delete education"
                                                                onClick={() => removeEdu(edu.id)}
                                                                className="p-1.5 bg-[var(--bg-surface)] text-rose-700 dark:text-rose-400 rounded-md border border-[var(--border-secondary)] hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                            >
                                                                <Trash size={12} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Fields */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                                Institution / University / College
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Stanford University or IIT Bombay"
                                                                value={edu.school || edu.institution || ''}
                                                                onChange={(e) => updateEdu(index, 'school', e.target.value)}
                                                                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                                Degree / Course
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Bachelor of Technology / B.S. / MBA"
                                                                value={edu.degree || ''}
                                                                onChange={(e) => updateEdu(index, 'degree', e.target.value)}
                                                                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                                Specialization / Major
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Computer Science & Engineering"
                                                                value={edu.fieldOfStudy || edu.major || edu.specialization || ''}
                                                                onChange={(e) => updateEdu(index, 'fieldOfStudy', e.target.value)}
                                                                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                                CGPA / Percentage / Grade
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. 3.8 / 4.0 or 8.5 CGPA or 85%"
                                                                value={edu.grade || edu.gpa || ''}
                                                                onChange={(e) => updateEdu(index, 'grade', e.target.value)}
                                                                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                                Start Date
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Aug 2020"
                                                                value={edu.startDate || ''}
                                                                onChange={(e) => updateEdu(index, 'startDate', e.target.value)}
                                                                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                                End Date or "Present"
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. May 2024 or Present"
                                                                value={edu.endDate || edu.year || ''}
                                                                onChange={(e) => updateEdu(index, 'endDate', e.target.value)}
                                                                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                            Relevant Coursework (optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Data Structures, Cloud Computing, Database Management, Algorithms"
                                                            value={edu.coursework || ''}
                                                            onChange={(e) => updateEdu(index, 'coursework', e.target.value)}
                                                            className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                                                            Academic Achievements & Honors (optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Dean's Honor Roll (2021-2023), Merit Scholarship Recipient"
                                                            value={edu.achievements || ''}
                                                            onChange={(e) => updateEdu(index, 'achievements', e.target.value)}
                                                            className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}

                                        <button
                                            onClick={addEdu}
                                            className="w-full py-3.5 border-2 border-dashed border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-cyan-500 rounded-2xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-colors"
                                        >
                                            <Plus size={16} /> Add Education Entry
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Experience / Career History */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('experience')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-3">
                                <Briefcase size={18} className="text-amber-700 dark:text-amber-400" />
                                Career History & Projects
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                                    {experienceList.length}
                                </span>
                            </h3>
                            {expandedSection === 'experience' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'experience' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-6">
                                        {experienceList.map((exp, index) => (
                                            <div key={exp.id || index} className="p-5 bg-[var(--bg-surface-secondary)] rounded-2xl relative space-y-4 border border-[var(--border-secondary)] group">
                                                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-secondary)]">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                        Position #{index + 1}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <button aria-label="Move experience up" onClick={() => moveExp(index, -1)} disabled={index === 0} className="p-1.5 bg-[var(--bg-surface)] rounded-md border border-[var(--border-secondary)] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-primary)]"><ArrowUp size={12} /></button>
                                                        <button aria-label="Move experience down" onClick={() => moveExp(index, 1)} disabled={index === experienceList.length - 1} className="p-1.5 bg-[var(--bg-surface)] rounded-md border border-[var(--border-secondary)] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-primary)]"><ArrowDown size={12} /></button>
                                                        <button aria-label="Delete experience" onClick={() => setBuilderData({ ...builderData, experience: experienceList.filter(e => e.id !== exp.id) })} className="p-1.5 bg-[var(--bg-surface)] text-rose-700 dark:text-rose-400 rounded-md border border-[var(--border-secondary)] hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash size={12} /></button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Company / Organization</label>
                                                        <input type="text" placeholder="Global Tech Corp" value={exp.company || ''} onChange={(e) => { const n = [...experienceList]; n[index] = { ...n[index], company: e.target.value }; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Job Title / Role</label>
                                                        <input type="text" placeholder="Director of Engineering" value={exp.role || ''} onChange={(e) => { const n = [...experienceList]; n[index] = { ...n[index], role: e.target.value }; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Dates / Period</label>
                                                    <input type="text" placeholder="Mar 2021 - Present" value={exp.period || ''} onChange={(e) => { const n = [...experienceList]; n[index] = { ...n[index], period: e.target.value }; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-2 text-xs" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">Achievements & Responsibilities (bullet points)</label>
                                                    </div>
                                                    <textarea placeholder="• Spearheaded cloud migration reducing infrastructure cost by 28%..." value={exp.details || ''} onChange={(e) => { const n = [...experienceList]; n[index] = { ...n[index], details: e.target.value }; setBuilderData({ ...builderData, experience: n }); }} className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 h-32 text-xs leading-relaxed" />
                                                    <div className="flex justify-end pt-2">
                                                        <button
                                                            onClick={async () => {
                                                                setPolishError('');
                                                                setPolishingId(exp.id);
                                                                try {
                                                                    const res = await apiClient.post('/builder/optimize-experience', { role: exp.role, company: exp.company, details: exp.details });
                                                                    if (res.data.optimized) {
                                                                        const n = [...experienceList];
                                                                        n[index] = { ...n[index], details: res.data.optimized };
                                                                        setBuilderData(prev => ({ ...prev, experience: n }));
                                                                    }
                                                                } catch (e) { setPolishError('AI Polish failed.'); } finally { setPolishingId(null); }
                                                            }}
                                                            disabled={polishingId === exp.id}
                                                            className="bg-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-sm hover:bg-amber-600 transition-all disabled:opacity-80"
                                                        >
                                                            {polishingId === exp.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                            AI Polish
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => setBuilderData({ ...builderData, experience: [...experienceList, { id: Date.now(), company: '', role: '', period: '', details: '' }] })} className="w-full py-3.5 border-2 border-dashed border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-amber-500 rounded-2xl text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-colors">
                                            <Plus size={16} /> Add Position
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Core Competencies / Skills */}
                    <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-primary)] overflow-hidden shadow-sm">
                        <button onClick={() => toggleSection('skills')} className="w-full flex justify-between items-center p-6 hover:bg-[var(--bg-surface-secondary)] transition-colors">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-3"><Settings size={18} className="text-rose-700 dark:text-rose-400" /> Core Competencies & Skills</h3>
                            {expandedSection === 'skills' ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <AnimatePresence>
                            {expandedSection === 'skills' && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-6 pt-0 space-y-3">
                                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">Enter your skills separated by commas (e.g. React.js, Python, PostgreSQL, System Design, Agile Leadership).</p>
                                        <textarea placeholder="React.js, Node.js, Python, PostgreSQL, Docker, AWS, Strategic Planning, System Architecture..." value={builderData.skills || ''} onChange={(e) => setBuilderData({ ...builderData, skills: e.target.value })} className="w-full bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-2xl p-4 h-28 text-xs leading-relaxed" />
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
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Live Rendering</span>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => downloadPDF('resume-preview', `${builderData?.personal?.fullName || 'Resume'}_${template}`)} 
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
                            >
                                <FileDown size={14} /> PDF
                            </button>
                            <button 
                                onClick={generateDocx} 
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
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
