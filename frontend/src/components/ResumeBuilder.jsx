import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import {
    Loader2, Save, Trash, Plus,
    Briefcase, MapPin, Sparkles,
    Feather, ShieldCheck, Settings,
    FileDown, Zap
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { downloadPDF } from '../utils/helpers';

const BACKEND = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

const ResumeBuilder = ({ builderData, setBuilderData, saveResume, loading }) => {
    const { user, logout } = useUser();
    const [template, setTemplate] = useState('executive');
    const [bioLoading, setBioLoading] = useState(false);
    const [polishingId, setPolishingId] = useState(null); // tracks which exp entry is being polished
    const [bioError, setBioError] = useState('');
    const [polishError, setPolishError] = useState('');

    // --- DOCX GENERATION ---
    const generateDocx = () => {
        let docChildren = [];

        if (template === 'executive' || template === 'professional' || template === 'harvard') {
            docChildren = [
                new Paragraph({
                    text: (builderData.personal.fullName || 'NAME').toUpperCase(),
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 }
                }),
                new Paragraph({
                    text: `${builderData.personal.location} | ${builderData.personal.phone} | ${builderData.personal.email}`,
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
        } else {
            docChildren = [
                new Paragraph({ text: builderData.personal.fullName, heading: HeadingLevel.TITLE }),
                new Paragraph({ text: `${builderData.personal.email} | ${builderData.personal.phone}` }),
                new Paragraph({ text: 'Experience', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                ...builderData.experience.flatMap(exp => [
                    new Paragraph({ text: `${exp.role} at ${exp.company}`, bold: true }),
                    new Paragraph({ text: exp.details })
                ]),
                new Paragraph({ text: 'Skills', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                new Paragraph({ text: builderData.skills })
            ];
        }

        const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `${builderData.personal.fullName || 'Resume'}_${template}.docx`);
        });
    };

    return (
        <div className="grid lg:grid-cols-2 gap-10 py-4 max-h-[85vh]">

            {/* ── LEFT: FORM ───────────────────────────────────────── */}
            <div className="space-y-8 overflow-y-auto pr-6 custom-scrollbar scroll-smooth">

                {/* Header + Template Picker */}
                <div className="p-10 rounded-[3rem] bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full translate-x-20 -translate-y-20 blur-3xl opacity-50" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-4xl font-bold text-[var(--text-primary)] tracking-tighter">Career <span className="text-cyan-600 dark:text-cyan-400">Architect</span></h2>
                                <p className="text-[var(--text-muted)] text-sm font-medium mt-1 uppercase tracking-widest">Formal Resume Builder v2</p>
                            </div>
                            <button onClick={saveResume} disabled={loading} className="p-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-secondary)] rounded-2xl text-cyan-600 dark:text-cyan-400 transition-all border border-[var(--border-secondary)] flex items-center gap-2 group shadow-sm">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                                <span className="text-[10px] font-bold uppercase tracking-widest">Save Session</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.2em] block mb-2">Select Template</span>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { id: 'executive', label: 'Executive', icon: ShieldCheck },
                                    { id: 'harvard', label: 'Harvard', icon: Feather },
                                    { id: 'professional', label: 'Industry', icon: Briefcase },
                                    { id: 'modern', label: 'Modern', icon: Zap }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTemplate(t.id)}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all duration-300 ${template === t.id
                                            ? 'bg-[var(--bg-surface)] border-cyan-600 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 shadow-xl'
                                            : 'bg-[var(--bg-surface-secondary)] border-[var(--border-secondary)] text-[var(--text-muted)] hover:border-cyan-200 hover:text-cyan-600'
                                            }`}
                                    >
                                        <t.icon size={20} />
                                        <span className="text-[9px] font-bold uppercase tracking-tighter">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Identity */}
                <div className="bg-[var(--bg-surface)] p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-sm space-y-8">
                    <div className="flex justify-between items-center pb-6 border-b border-[var(--border-secondary)]">
                        <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-3"><MapPin size={20} className="text-cyan-600" /> Identity &amp; Contact</h3>
                        <button
                            onClick={async () => {
                                setBioError('');
                                setBioLoading(true);
                                try {
                                    const res = await axios.post(`${BACKEND}/api/builder/suggest-bio`, {
                                        name: builderData.personal.fullName,
                                        role: builderData.experience[0]?.role || 'Professional',
                                        skills: builderData.skills,
                                        experienceSummary: builderData.experience.map(e => e.role).join(', ')
                                    }, {
                                        headers: {
                                            'x-user-id': user?.id || 'guest',
                                            ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
                                        }
                                    });
                                    if (res.data.bio) setBuilderData(prev => ({ ...prev, personal: { ...prev.personal, bio: res.data.bio } }));
                                    else setBioError('No suggestion returned.');
                                } catch (e) {
                                    if (e.response?.status === 401) {
                                        logout();
                                    }
                                    setBioError('AI unavailable — check backend.');
                                } finally {
                                    setBioLoading(false);
                                }
                            }}
                            disabled={bioLoading}
                            className="btn-primary !px-6 !py-2.5 !text-[10px] !rounded-2xl"
                        >
                            {bioLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {bioLoading ? 'Generating...' : 'AI Summary'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Full Name</label>
                            <input type="text" placeholder="Johnathan Doe" value={builderData.personal.fullName} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, fullName: e.target.value } })} className="input-field !rounded-2xl !bg-[var(--bg-surface-secondary)]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Email</label>
                            <input type="email" placeholder="j.doe@example.com" value={builderData.personal.email} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, email: e.target.value } })} className="input-field !rounded-2xl !bg-[var(--bg-surface-secondary)]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Phone</label>
                            <input type="text" placeholder="+1 555-000-0000" value={builderData.personal.phone} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, phone: e.target.value } })} className="input-field !rounded-2xl !bg-[var(--bg-surface-secondary)]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Location</label>
                            <input type="text" placeholder="London, United Kingdom" value={builderData.personal.location} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, location: e.target.value } })} className="input-field !rounded-2xl !bg-[var(--bg-surface-secondary)]" />
                        </div>
                    </div>
                    <div className="space-y-2 pt-4">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1 flex items-center justify-between">
                            Executive Summary
                            <span className="text-cyan-600 dark:text-cyan-400 font-bold italic normal-case tracking-normal">Third-person recommended</span>
                        </label>
                        <textarea placeholder="Senior Technology Executive with 12+ years..." value={builderData.personal.bio} onChange={(e) => setBuilderData({ ...builderData, personal: { ...builderData.personal, bio: e.target.value } })} className="input-field !bg-[var(--bg-surface-secondary)] !rounded-[2rem] h-40 !p-8 !leading-relaxed text-sm font-medium" />
                        {bioError && <p className="text-[10px] text-rose-500 font-bold px-2">⚠ {bioError}</p>}
                    </div>
                </div>

                {/* Experience */}
                <div className="bg-[var(--bg-surface)] p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-sm space-y-8">
                    <div className="flex justify-between items-center pb-6 border-b border-[var(--border-secondary)]">
                        <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-3"><Briefcase size={20} className="text-cyan-500" /> Career History</h3>
                        <button onClick={() => setBuilderData({ ...builderData, experience: [...builderData.experience, { id: Date.now(), company: '', role: '', period: '', details: '' }] })} className="w-10 h-10 bg-cyan-600 dark:bg-cyan-500 text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-all shadow-xl"><Plus size={20} /></button>
                    </div>
                    <div className="space-y-8">
                        {builderData.experience.map((exp, index) => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={exp.id} className="p-8 bg-[var(--bg-surface-secondary)] rounded-[2.5rem] relative space-y-6 border border-[var(--border-secondary)] group">
                                <button onClick={() => setBuilderData({ ...builderData, experience: builderData.experience.filter(e => e.id !== exp.id) })} className="absolute top-6 right-6 p-2 bg-[var(--bg-surface)] text-rose-300 hover:text-rose-500 rounded-xl border border-[var(--border-secondary)] opacity-0 group-hover:opacity-100 transition-all shadow-sm"><Trash size={16} /></button>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Company</label>
                                        <input type="text" placeholder="Global Tech Corp" value={exp.company} onChange={(e) => { const n = [...builderData.experience]; n[index].company = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="input-field !bg-white !rounded-xl text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Job Title</label>
                                        <input type="text" placeholder="Director of Engineering" value={exp.role} onChange={(e) => { const n = [...builderData.experience]; n[index].role = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="input-field !bg-white !rounded-xl text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase px-1">Dates</label>
                                    <input type="text" placeholder="Mar 2018 - Present" value={exp.period} onChange={(e) => { const n = [...builderData.experience]; n[index].period = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="input-field !bg-white !rounded-xl text-xs" />
                                </div>
                                <div className="relative space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase px-1">Achievements (bullet points)</label>
                                    <textarea placeholder="• Increased revenue by 22% ($4.5M)..." value={exp.details} onChange={(e) => { const n = [...builderData.experience]; n[index].details = e.target.value; setBuilderData({ ...builderData, experience: n }); }} className="input-field !bg-white !rounded-3xl h-36 !p-6 text-sm" />
                                    <button
                                        onClick={async () => {
                                            setPolishError('');
                                            setPolishingId(exp.id);
                                            try {
                                                const res = await axios.post(`${BACKEND}/api/builder/optimize-experience`, {
                                                    role: exp.role,
                                                    company: exp.company,
                                                    details: exp.details
                                                }, {
                                                    headers: {
                                                        'x-user-id': user?.id || 'guest',
                                                        ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
                                                    }
                                                });
                                                if (res.data.optimized) {
                                                    const n = [...builderData.experience];
                                                    n[index].details = res.data.optimized;
                                                    setBuilderData(prev => ({ ...prev, experience: n }));
                                                } else {
                                                    setPolishError('No result returned.');
                                                }
                                            } catch (e) {
                                                if (e.response?.status === 401) {
                                                    logout();
                                                }
                                                setPolishError('AI Polish failed — check backend.');
                                            } finally {
                                                setPolishingId(null);
                                            }
                                        }}
                                        disabled={polishingId === exp.id}
                                        className="absolute bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition-all border-2 border-white disabled:opacity-60"
                                    >
                                        {polishingId === exp.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                        {polishingId === exp.id ? 'Polishing...' : 'AI Polish'}
                                    </button>
                                    {polishError && polishingId === null && <p className="text-[10px] text-rose-500 font-bold mt-1">⚠ {polishError}</p>}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Skills */}
                <div className="bg-[var(--bg-surface)] p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-3"><Settings size={20} className="text-cyan-600 dark:text-cyan-400" /> Skills</h3>
                    <textarea placeholder="Strategic Planning, AI/ML, Cross-functional Leadership..." value={builderData.skills} onChange={(e) => setBuilderData({ ...builderData, skills: e.target.value })} className="input-field !rounded-[2rem] h-32 !p-8 !leading-relaxed text-sm font-medium !bg-[var(--bg-surface-secondary)]" />
                </div>
            </div>

            {/* ── RIGHT: PREVIEW ───────────────────────────────────── */}
            <div className="relative flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-6 px-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Live Preview: {template}</span>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => downloadPDF('resume-preview', `${builderData.personal.fullName || 'Resume'}_${template}`)} 
                            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-3xl font-bold text-xs hover:opacity-90 transition-all shadow-xl"
                        >
                            <FileDown size={18} /> Export PDF
                        </button>
                        <button 
                            onClick={generateDocx} 
                            className="flex items-center gap-3 bg-cyan-600 dark:bg-cyan-500 text-white px-6 py-4 rounded-3xl font-bold text-xs hover:opacity-90 transition-all shadow-xl"
                        >
                            <FileDown size={18} /> Export DOCX
                        </button>
                    </div>
                </div>

                <div className="w-full bg-[var(--bg-surface-secondary)] p-8 rounded-[4rem] border border-[var(--border-primary)] shadow-inner overflow-auto">
                    <div id="resume-preview" className={`bg-white shadow-2xl mx-auto min-h-[900px] transition-all duration-700 overflow-hidden ${template === 'modern' ? 'p-12' : 'p-16'}`}>

                        {/* ── TEMPLATE 1: EXECUTIVE ── */}
                        {template === 'executive' && (
                            <div className="font-serif text-black leading-snug">
                                <div className="text-center pb-6 mb-8 border-t-4 border-b-4 border-black">
                                    <h1 className="text-3xl font-black uppercase tracking-[0.15em] mt-4 mb-1">
                                        {builderData.personal.fullName || 'YOUR FULL NAME'}
                                    </h1>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-600 mb-4">
                                        {[builderData.personal.location, builderData.personal.phone, builderData.personal.email].filter(Boolean).join('  ·  ')}
                                    </p>
                                </div>
                                {builderData.personal.bio && (
                                    <div className="mb-8">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-2 text-gray-500 border-b border-gray-200 pb-1">Executive Summary</h4>
                                        <p className="text-[11.5px] leading-relaxed text-justify opacity-85 italic px-2">"{builderData.personal.bio}"</p>
                                    </div>
                                )}
                                <div className="mb-8">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 text-gray-500 border-b border-gray-200 pb-1">Career History</h4>
                                    <div className="space-y-6">
                                        {builderData.experience.map(exp => (
                                            <div key={exp.id}>
                                                <div className="flex justify-between items-baseline">
                                                    <h5 className="font-black text-[14px] uppercase tracking-wide">{exp.company}</h5>
                                                    <span className="text-[10px] font-bold text-gray-500">{exp.period}</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-gray-600 italic mb-2">{exp.role}</p>
                                                <p className="text-[11px] leading-relaxed whitespace-pre-line text-justify opacity-80 pl-3 border-l border-gray-300">{exp.details}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200">
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-gray-500">Education</h4>
                                        {builderData.education.map(edu => (
                                            <div key={edu.id} className="mb-3">
                                                <h5 className="text-xs font-black uppercase">{edu.school}</h5>
                                                <p className="text-[10px] font-bold opacity-60">{edu.degree} · {edu.year}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-gray-500">Core Expertise</h4>
                                        <p className="text-[11px] leading-relaxed font-medium opacity-80">{builderData.skills || 'Add competencies above.'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TEMPLATE 2: HARVARD ── */}
                        {template === 'harvard' && (
                            <div className="font-serif text-black leading-snug">
                                <div className="bg-gray-900 text-white -mx-16 -mt-16 px-16 py-10 mb-10">
                                    <h1 className="text-3xl font-black uppercase tracking-[0.1em] mb-1">
                                        {builderData.personal.fullName || 'YOUR FULL NAME'}
                                    </h1>
                                    <div className="flex gap-4 text-[10px] font-bold text-gray-400 mt-2">
                                        {builderData.personal.email && <span>✉ {builderData.personal.email}</span>}
                                        {builderData.personal.phone && <span>✆ {builderData.personal.phone}</span>}
                                        {builderData.personal.location && <span>⊙ {builderData.personal.location}</span>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-[1fr_2.2fr] gap-10">
                                    <div className="space-y-8">
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-3">Education</h4>
                                            {builderData.education.map(edu => (
                                                <div key={edu.id} className="mb-4">
                                                    <h5 className="text-[11px] font-black uppercase">{edu.school}</h5>
                                                    <p className="text-[10px] font-bold text-gray-500">{edu.degree}</p>
                                                    <p className="text-[9px] text-gray-400">{edu.year}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-3">Skills</h4>
                                            <div className="space-y-1">
                                                {(builderData.skills || '').split(',').filter(Boolean).map((s, i) => (
                                                    <p key={i} className="text-[10px] font-bold text-gray-700">· {s.trim()}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {builderData.personal.bio && (
                                            <div className="mb-8">
                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-3">Profile</h4>
                                                <p className="text-[11px] leading-relaxed text-justify italic opacity-80">{builderData.personal.bio}</p>
                                            </div>
                                        )}
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-4">Experience</h4>
                                        <div className="space-y-7">
                                            {builderData.experience.map(exp => (
                                                <div key={exp.id}>
                                                    <div className="flex justify-between items-baseline">
                                                        <h5 className="font-black text-[13px]">{exp.role}</h5>
                                                        <span className="text-[10px] font-bold text-gray-400">{exp.period}</span>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-500 mb-2">{exp.company}</p>
                                                    <p className="text-[11px] leading-relaxed whitespace-pre-line opacity-75">{exp.details}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TEMPLATE 3: INDUSTRY / ATS ── */}
                        {template === 'professional' && (
                            <div className="font-sans text-gray-900 leading-normal text-[12px]">
                                <div className="border-b-2 border-gray-800 pb-4 mb-6">
                                    <h1 className="text-2xl font-bold text-gray-900">{builderData.personal.fullName || 'Your Name'}</h1>
                                    <p className="text-[11px] text-gray-600 mt-1">
                                        {[builderData.personal.email, builderData.personal.phone, builderData.personal.location].filter(Boolean).join(' | ')}
                                    </p>
                                </div>
                                {builderData.personal.bio && (
                                    <div className="mb-5">
                                        <h4 className="text-[11px] font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-gray-700">Professional Summary</h4>
                                        <p className="text-[11px] leading-relaxed text-gray-800">{builderData.personal.bio}</p>
                                    </div>
                                )}
                                <div className="mb-5">
                                    <h4 className="text-[11px] font-bold uppercase border-b border-gray-300 pb-1 mb-3 text-gray-700">Work Experience</h4>
                                    <div className="space-y-5">
                                        {builderData.experience.map(exp => (
                                            <div key={exp.id}>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-[12px]">{exp.role}</span>
                                                    <span className="text-[11px] text-gray-500">{exp.period}</span>
                                                </div>
                                                <p className="text-[11px] font-semibold text-gray-600 mb-1">{exp.company}</p>
                                                <p className="text-[11px] leading-relaxed whitespace-pre-line text-gray-700">{exp.details}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-5">
                                    <h4 className="text-[11px] font-bold uppercase border-b border-gray-300 pb-1 mb-3 text-gray-700">Education</h4>
                                    {builderData.education.map(edu => (
                                        <div key={edu.id} className="flex justify-between mb-2">
                                            <div>
                                                <p className="font-bold text-[12px]">{edu.school}</p>
                                                <p className="text-[11px] text-gray-600">{edu.degree}</p>
                                            </div>
                                            <span className="text-[11px] text-gray-500">{edu.year}</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-gray-700">Skills</h4>
                                    <p className="text-[11px] text-gray-800">{builderData.skills || 'Add your skills above'}</p>
                                </div>
                            </div>
                        )}

                        {/* ── TEMPLATE 4: MODERN (CYAN) ── */}
                        {template === 'modern' && (
                            <div className="font-sans text-slate-900 leading-relaxed">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">
                                            {builderData.personal.fullName || 'Your Name'}
                                        </h1>
                                        <div className="h-1 w-20 bg-cyan-500 mt-3 mb-3 rounded-full" />
                                        <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">Professional Portfolio · 2026</p>
                                    </div>
                                    <div className="text-right text-[10px] font-bold text-slate-400 leading-loose">
                                        {builderData.personal.email}<br />
                                        {builderData.personal.phone}<br />
                                        {builderData.personal.location}
                                    </div>
                                </div>
                                <div className="h-px bg-slate-100 my-6" />
                                <div className="grid grid-cols-[1fr_2fr] gap-10">
                                    <div className="space-y-8">
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-cyan-500 mb-4 border-b border-slate-100 pb-2">Skills</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(builderData.skills || '').split(',').filter(Boolean).map((s, i) => (
                                                    <span key={i} className="px-2 py-1 bg-cyan-50 text-cyan-700 text-[9px] font-bold rounded border border-cyan-100 uppercase">{s.trim()}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-cyan-500 mb-4 border-b border-slate-100 pb-2">Education</h4>
                                            {builderData.education.map(edu => (
                                                <div key={edu.id} className="mb-5">
                                                    <h5 className="text-[11px] font-black text-slate-900">{edu.school}</h5>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{edu.degree}</p>
                                                    <p className="text-[9px] text-slate-300">{edu.year}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        {builderData.personal.bio && (
                                            <div>
                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-cyan-500 mb-3 border-b border-slate-100 pb-2">About</h4>
                                                <p className="text-[11px] leading-relaxed text-slate-600">{builderData.personal.bio}</p>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-cyan-500 mb-4 border-b border-slate-100 pb-2">Experience</h4>
                                            <div className="space-y-7">
                                                {builderData.experience.map(exp => (
                                                    <div key={exp.id} className="relative pl-4 border-l-2 border-cyan-100">
                                                        <div className="flex justify-between items-baseline mb-1">
                                                            <h5 className="font-black text-[13px] text-slate-900">{exp.role}</h5>
                                                            <span className="text-[9px] font-bold text-slate-300">{exp.period}</span>
                                                        </div>
                                                        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-wide mb-2">{exp.company}</p>
                                                        <p className="text-[11px] leading-relaxed text-slate-600 whitespace-pre-line">{exp.details}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Social Proof */}
                <div className="mt-6 flex items-center gap-4 py-3 px-6 bg-white rounded-full border border-slate-100 shadow-sm">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Viewed by <span className="text-slate-900 font-black">4 Local Recruiters</span> for this role last hour.</span>
                </div>
            </div>
        </div>
    );
};

export default ResumeBuilder;
