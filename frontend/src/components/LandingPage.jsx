import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Zap, Shield, Upload, CheckCircle2, 
    ArrowRight, Star, BarChart3, FileText, Mic, Users, Trophy, Sun, Moon 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const STAGES = [
    "Reading Manuscript...",
    "Evaluating ATS Compatibility...",
    "Identifying Key Skill Gaps...",
    "Compiling Neural Assessment..."
];

export default function LandingPage({ onOpenAuth }) {
    const { theme, toggleTheme } = useTheme();
    const [dragActive, setDragActive] = useState(false);
    const [uploadingStage, setUploadingStage] = useState(0);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [activeFaq, setActiveFaq] = useState(null);

    useEffect(() => {
        if (!uploadedFile) return;
        const interval = setInterval(() => {
            setUploadingStage(prev => {
                if (prev < STAGES.length - 1) {
                    return prev + 1;
                } else {
                    clearInterval(interval);
                    // Open authentication modal with the file ready
                    setTimeout(() => {
                        onOpenAuth('signup', uploadedFile);
                        // Reset upload states
                        setUploadedFile(null);
                        setUploadingStage(0);
                    }, 500);
                    return prev;
                }
            });
        }, 1200);

        return () => clearInterval(interval);
    }, [uploadedFile, onOpenAuth]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (isValidFile(file)) {
                setUploadedFile(file);
            }
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (isValidFile(file)) {
                setUploadedFile(file);
            }
        }
    };

    const isValidFile = (file) => {
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const name = file.name.toLowerCase();
        return allowedExtensions.some(ext => name.endsWith(ext));
    };

    const features = [
        {
            title: "ATS Audit & Score",
            desc: "Receive real-time grading of your resume formatting, layout, structure, and text density.",
            icon: BarChart3,
            color: "text-cyan-500 bg-cyan-500/10"
        },
        {
            title: "Resume Studio",
            desc: "Tailor applications for specific job requirements, draft cover letters, and optimize LinkedIn profiles.",
            icon: FileText,
            color: "text-indigo-500 bg-indigo-500/10"
        },
        {
            title: "Interview Coach",
            desc: "Practice behavioral interviews against a AI model matching the job description with STAR metrics.",
            icon: Mic,
            color: "text-emerald-500 bg-emerald-500/10"
        },
        {
            title: "Resume Roast",
            desc: "Get direct, unfiltered feedback that exposes passive verbs, buzzwords, and weak metric details.",
            icon: Zap,
            color: "text-rose-500 bg-rose-500/10"
        }
    ];

    const stats = [
        { count: "50,000+", label: "Resumes Evaluated", icon: FileText },
        { count: "93.4%", label: "Placement Rate", icon: Trophy },
        { count: "12,000+", label: "Professionals Helped", icon: Users }
    ];

    const testimonials = [
        {
            quote: "ResuLens exposed 6 missing core keywords in my DevOps resume. Three days after tailoring it, I got my first callback from Amazon.",
            author: "Marcus Vance",
            role: "Cloud DevOps Specialist"
        },
        {
            quote: "The AI Mock Interview prep was incredible. It graded my answers using the STAR method and taught me how to present metrics effectively.",
            author: "Clara Zhang",
            role: "Product Manager at Stripe"
        }
    ];

    const faqs = [
        {
            q: "How does the ATS compatibility score work?",
            a: "Our diagnostic engine scans your formatting layout and parses active keywords, comparing them directly against target job domains. It reports formatting issues, spelling, and semantic alignment."
        },
        {
            q: "Can I use ResuLens without MongoDB?",
            a: "Yes! The platform automatically operates in fallback mode storing your local history database in memory/JSON logs if MongoDB is offline."
        },
        {
            q: "Are my uploaded resumes kept confidential?",
            a: "Absolutely. We secure all parsed manuscript data using encrypted channels. We do not store original raw files long-term."
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-app)] font-sans text-[var(--text-primary)] relative overflow-x-hidden selection:bg-cyan-100 selection:text-cyan-900 transition-colors duration-300">
            {/* Ambient Backdrops */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[700px] bg-gradient-to-b from-cyan-500/[0.04] via-transparent to-transparent" />
                <div className="absolute top-12 right-0 w-[600px] h-[600px] bg-cyan-600/[0.03] rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3" />
                <div className="absolute bottom-1/3 left-0 w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[120px] -translate-x-1/2" />
            </div>

            {/* Landing Navigation Header */}
            <header className="fixed top-0 left-0 right-0 z-50 py-6 backdrop-blur-xl border-b border-[var(--border-primary)]/50 bg-[var(--bg-app)]/70">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-cyan-500/10 shrink-0">
                            <Zap size={18} fill="white" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-lg leading-none tracking-tight">ResuLens</span>
                            <span className="text-[8px] font-bold text-cyan-600 uppercase tracking-widest leading-none mt-1">AI Resume Intelligence</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-primary)]/40 transition-all active:scale-95"
                            aria-label="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        <button
                            onClick={() => onOpenAuth('login')}
                            className="px-5 py-2.5 rounded-xl border border-[var(--border-secondary)] hover:bg-[var(--bg-surface-secondary)] transition-all text-xs font-bold text-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => onOpenAuth('signup')}
                            className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 transition-all text-xs font-bold shadow-md shadow-cyan-600/10 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO & UPLOAD SECTION (Fold) */}
            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center pt-8">
                    {/* Left: Text Hook */}
                    <div className="lg:col-span-6 text-left space-y-6">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold tracking-widest uppercase">
                            <Sparkles size={12} /> Beat the Hiring Systems
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-black text-[var(--text-primary)] leading-[1.05] tracking-tight">
                            Audit Your Resume with <span className="text-cyan-600 dark:text-cyan-400">AI</span> in Seconds
                        </h1>
                        <p className="text-base sm:text-lg font-medium text-[var(--text-secondary)] leading-relaxed">
                            ResuLens computes a rigorous ATS score, detects hidden skill gaps, drafts custom cover letters, and optimizes your profile to land elite interviews.
                        </p>
                        
                        <div className="pt-2 flex flex-wrap gap-4">
                            <a
                                href="#upload"
                                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-xl shadow-cyan-600/20 active:scale-[0.97] transition-all text-sm flex items-center gap-2 focus-visible:ring-4 focus-visible:ring-cyan-500/50"
                            >
                                Analyze My Resume Now <ArrowRight size={16} />
                            </a>
                            <button
                                onClick={() => onOpenAuth('guest')}
                                className="px-8 py-4 bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-surface-secondary)] font-bold rounded-2xl shadow-sm active:scale-[0.97] transition-all text-sm focus-visible:ring-4 focus-visible:ring-cyan-500/50"
                            >
                                Explore Guest Demo
                            </button>
                        </div>

                        <div className="flex items-center gap-6 pt-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            <span className="flex items-center gap-1.5"><Shield size={14} className="text-cyan-500" /> Free Analysis</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-cyan-500" /> Instant ATS score</span>
                        </div>
                    </div>

                    {/* Right: Upload Interface (Interactive) */}
                    <div id="upload" className="lg:col-span-6">
                        <div className="bg-[var(--bg-surface)] rounded-[3rem] p-8 md:p-10 border border-[var(--border-primary)] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                            
                            <AnimatePresence mode="wait">
                                {!uploadedFile ? (
                                    <motion.div
                                        key="dropzone"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-left">
                                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Upload Your Resume</h3>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">Get immediate feedback on formatting, keyword density, and metrics.</p>
                                        </div>

                                        <label
                                            onDragEnter={handleDrag}
                                            onDragOver={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDrop={handleDrop}
                                            className={`block w-full border-4 border-dashed rounded-[2.5rem] p-10 text-center cursor-pointer transition-all ${
                                                dragActive 
                                                ? 'border-cyan-500 bg-cyan-500/5 shadow-inner' 
                                                : 'border-[var(--border-secondary)] hover:border-cyan-500 hover:bg-cyan-500/5 hover:shadow-inner'
                                            }`}
                                        >
                                            <input type="file" onChange={handleFileInput} accept=".pdf,.doc,.docx" className="hidden" />
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 bg-cyan-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/10">
                                                    <Upload size={28} />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-lg font-bold text-[var(--text-primary)] block">Drop manuscript here</span>
                                                    <span className="text-xs text-[var(--text-muted)] block">PDF, DOCX, or DOC formats supported (Max 10MB)</span>
                                                </div>
                                            </div>
                                        </label>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="py-12 flex flex-col items-center justify-center text-center space-y-6"
                                    >
                                        {/* Premium Loading Spinner */}
                                        <div className="relative w-20 h-20">
                                            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                                            <div className="absolute inset-0 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                                            <div className="absolute inset-2 bg-[var(--bg-surface)] rounded-full flex items-center justify-center">
                                                <Zap size={20} className="text-cyan-500 animate-pulse" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-lg font-bold text-[var(--text-primary)]">
                                                {STAGES[uploadingStage]}
                                            </h4>
                                            <div className="w-60 h-1.5 bg-[var(--bg-surface-secondary)] rounded-full overflow-hidden mx-auto">
                                                <motion.div
                                                    className="h-full bg-cyan-600"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: `${((uploadingStage + 1) / STAGES.length) * 100}%` }}
                                                    transition={{ duration: 1.2, ease: "easeInOut" }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">
                                                Running Neural Pipeline
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* DEMO PREVIEW SECTION */}
                <section className="pt-24 pb-16">
                    <div className="bg-[var(--bg-surface)] rounded-[3.5rem] border border-[var(--border-primary)] shadow-2xl p-8 md:p-14 text-center max-w-5xl mx-auto space-y-10">
                        <div className="max-w-2xl mx-auto space-y-4">
                            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                                Interactive Analysis Preview
                            </h2>
                            <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">
                                See how the AI evaluates parsed experience. Our scanner extracts grammar style, keywords density, and core metric results.
                            </p>
                        </div>

                        {/* Interactive UI Mock */}
                        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-4xl mx-auto">
                            {/* Score Card */}
                            <div className="p-6 rounded-[2rem] bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] flex flex-col items-center justify-center space-y-4">
                                <div className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">Calculated score</div>
                                <div className="relative w-28 h-28 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" stroke="var(--border-primary)" strokeWidth="8" fill="none" />
                                        <circle cx="50" cy="50" r="40" stroke="#0891b2" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset="45.2" strokeLinecap="round" />
                                    </svg>
                                    <span className="absolute text-2xl font-black text-[var(--text-primary)]">82%</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-wider">Above Average</span>
                            </div>

                            {/* Strengths Card */}
                            <div className="p-6 rounded-[2rem] bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] text-left space-y-4 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Identified Strengths</div>
                                    <ul className="space-y-2">
                                        {["✓ Strong action verbs used", "✓ Clean layout formatting structure", "✓ Valid metric-based indicators"].map((st, i) => (
                                            <li key={i} className="flex gap-2 items-start text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <span className="text-emerald-500">✓</span> {st.replace('✓', '')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Format passes checks</span>
                            </div>

                            {/* Gaps Card */}
                            <div className="p-6 rounded-[2rem] bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] text-left space-y-4 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Detected Gaps</div>
                                    <ul className="space-y-2">
                                        {["✗ Missing AWS/Cloud keyword density", "✗ Missing Docker containerization details", "✗ Weak metrics in senior project block"].map((gap, i) => (
                                            <li key={i} className="flex gap-2 items-start text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <span className="text-rose-500">✗</span> {gap.replace('✗', '')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">3 Critical gaps detected</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => onOpenAuth('signup')}
                                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-xl shadow-cyan-600/20 active:scale-[0.97] transition-all text-sm focus-visible:ring-4 focus-visible:ring-cyan-500/50"
                            >
                                Get Your Full Analysis Report
                            </button>
                        </div>
                    </div>
                </section>

                {/* CORE FEATURES GRID */}
                <section className="py-20 text-center space-y-16">
                    <div className="max-w-xl mx-auto space-y-4">
                        <h2 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                            Core Optimization Tools
                        </h2>
                        <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                            Comprehensive career intelligence suite
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feat, idx) => (
                            <div
                                key={idx}
                                className="card p-8 text-left flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="space-y-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${feat.color}`}>
                                        <feat.icon size={22} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                            {feat.title}
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                            {feat.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* TRUST & STATISTICS SECTION */}
                <section className="py-16 bg-[var(--bg-surface-secondary)]/50 border border-[var(--border-primary)]/40 rounded-[3.5rem] p-12 text-center space-y-16">
                    <div className="grid md:grid-cols-3 gap-8">
                        {stats.map((st, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400">
                                    {st.count}
                                </div>
                                <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                    {st.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {testimonials.map((t, idx) => (
                            <div key={idx} className="bg-[var(--bg-surface)] p-8 rounded-[2rem] border border-[var(--border-primary)] text-left flex flex-col justify-between relative shadow-sm">
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="text-amber-500 fill-amber-500" />)}
                                </div>
                                <p className="text-xs font-medium text-[var(--text-secondary)] italic leading-relaxed mb-6">
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div className="border-t border-[var(--border-primary)] pt-4">
                                    <h5 className="font-bold text-xs text-[var(--text-primary)]">{t.author}</h5>
                                    <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">{t.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FAQ ACCORDION SECTION */}
                <section className="py-20 text-center space-y-12">
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                        Frequently Asked Questions
                    </h2>

                    <div className="max-w-3xl mx-auto space-y-3">
                        {faqs.map((faq, idx) => {
                            const isExpanded = activeFaq === idx;
                            return (
                                <div key={idx} className="border border-[var(--border-primary)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden transition-all duration-300">
                                    <button
                                        onClick={() => setActiveFaq(isExpanded ? null : idx)}
                                        className="w-full flex justify-between items-center p-5 text-xs sm:text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-surface-secondary)]/50 transition-colors"
                                    >
                                        <span>{faq.q}</span>
                                        <ArrowRight size={14} className={`text-[var(--text-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <div className="px-5 pb-5 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-primary)]/50 pt-3 text-left">
                                                    {faq.a}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            {/* Support Footer */}
            <footer className="border-t border-[var(--border-primary)] bg-[var(--bg-surface)] py-8 relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">ResuLens AI</span>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span className="text-xs text-[var(--text-muted)]">support@resulens.ai</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">
                        © {new Date().getFullYear()} ResuLens. Built with ❤️ for professionals.
                    </p>
                </div>
            </footer>
        </div>
    );
}
