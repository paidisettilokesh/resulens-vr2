import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Zap, Shield, HelpCircle, X, ChevronRight, ChevronLeft, 
    BookOpen, Check, Play, FileText, Mic, BarChart3, Mail, Heart
} from 'lucide-react';

const UserGuideModal = ({ isOpen, onClose, user }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [activeFaq, setActiveFaq] = useState(null);

    if (!isOpen) return null;

    const slides = [
        // Slide 1: Welcome
        {
            title: "Welcome to ResuLens",
            subtitle: "Your AI-Powered Career Intelligence Partner",
            icon: Sparkles,
            content: (
                <div className="space-y-6 text-left">
                    <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                        ResuLens is an elite, senior-grade diagnostic and optimization engine built to transform your resume into a high-impact document optimized for competitive job markets.
                    </p>
                    <div className="p-6 rounded-[2rem] bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                            <Zap size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-[var(--text-primary)]">Why ResuLens?</h4>
                            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                                Most applicant tracking systems (ATS) auto-filter resumes using parsed keywords and layout scores. ResuLens helps you audit, rewrite, tailor, and prepare for interviews so you beat the system and land your next role.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] flex items-center gap-3">
                            <Shield className="text-cyan-500 shrink-0" size={18} />
                            <span className="text-xs font-semibold text-[var(--text-primary)]">Data Secured</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] flex items-center gap-3">
                            <BookOpen className="text-cyan-500 shrink-0" size={18} />
                            <span className="text-xs font-semibold text-[var(--text-primary)]">ATS Optimizations</span>
                        </div>
                    </div>
                </div>
            )
        },
        // Slide 2: Features
        {
            title: "Explore Core Features",
            subtitle: "Maximize your application impact with these modules",
            icon: BookOpen,
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {[
                        {
                            title: "ATS Resume Auditor",
                            desc: "Upload your resume to receive a comprehensive score, structure evaluation, formatting critiques, and exact keyword recommendations matching target roles.",
                            icon: BarChart3,
                            color: "text-cyan-500 bg-cyan-500/10"
                        },
                        {
                            title: "Resume Studio",
                            desc: "Access AI-powered rewriters to polish bullet points, generate custom cover letters, tailor resume text to specific job descriptions, and write optimized LinkedIn profile copy.",
                            icon: FileText,
                            color: "text-indigo-500 bg-indigo-500/10"
                        },
                        {
                            title: "Interview Coach",
                            desc: "Practice with custom interview prep questions based on your resume and a target job description, featuring interactive answer feedback using the STAR framework.",
                            icon: Mic,
                            color: "text-emerald-500 bg-emerald-500/10"
                        },
                        {
                            title: "Resume Roast",
                            desc: "Need some tough love? The Roast module serves up brutal, raw, and constructive AI feedback to expose weak statements, clichés, and style mistakes instantly.",
                            icon: Zap,
                            color: "text-rose-500 bg-rose-500/10"
                        },
                        {
                            title: "Market Insights",
                            desc: "Assess market trends, typical salary bands, and job demand statistics in real time. Gain recommendations on high-value skills and matching upskilling courses.",
                            icon: Shield,
                            color: "text-amber-500 bg-amber-500/10"
                        }
                    ].map((feat, idx) => (
                        <div key={idx} className="p-5 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-[1.8rem] flex gap-4 items-start">
                            <div className={`p-3 rounded-xl shrink-0 ${feat.color}`}>
                                <feat.icon size={18} />
                            </div>
                            <div className="space-y-1 text-left">
                                <h4 className="font-bold text-xs text-[var(--text-primary)]">{feat.title}</h4>
                                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )
        },
        // Slide 3: Getting Started
        {
            title: "Getting Started",
            subtitle: "Follow these 4 simple steps to begin",
            icon: Play,
            content: (
                <div className="space-y-4">
                    {[
                        { step: "1", title: "Select a Target Role & Upload", desc: "Choose your target domain track (or type a custom one) and select a PDF/DOCX resume. Hit 'Execute Neural Analysis' to score your resume." },
                        { step: "2", title: "Inspect the Analyzer Breakdown", desc: "Dive into your scoring metrics, keyword density matches, spelling/grammar reviews, and actionable formatting/layout recommendations." },
                        { step: "3", title: "Refine in Resume Studio", desc: "Copy and paste the job description you want to apply to. Run features like Cover Letter, Tailor, or Bullet Rewrite to instantly align your application." },
                        { step: "4", title: "Practice & Upskill", desc: "Run Mock Interviews under the Coach tab, check Roast feedback, and review recommended training courses to address critical skill gaps." }
                    ].map((step, idx) => (
                        <div key={idx} className="flex gap-4 items-start p-4 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-2xl">
                            <div className="w-7 h-7 bg-cyan-600 text-white font-bold rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5">
                                {step.step}
                            </div>
                            <div className="text-left space-y-0.5">
                                <h4 className="font-bold text-xs text-[var(--text-primary)]">{step.title}</h4>
                                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )
        },
        // Slide 4: AI & Best Practices
        {
            title: "AI & Best Practices",
            subtitle: "Get the most out of our advanced intelligence platform",
            icon: Zap,
            content: (
                <div className="space-y-5 text-left">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        ResuLens operates on state-of-the-art LLMs (Groq & OpenRouter). The AI does not just scan for letters; it comprehends the semantics of your achievements.
                    </p>
                    <div className="space-y-3">
                        <h4 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">Top Best Practices:</h4>
                        <ul className="space-y-2.5">
                            {[
                                "Always use metric-driven achievements: Instead of 'Helped design products', write 'Designed 4 products leading to 25% revenue increase'.",
                                "Provide exact job descriptions: The AI matches keywords, tone, and skills directly against the target JD. The more detailed the JD, the cleaner the output.",
                                "Avoid scanned/image resumes: ResuLens parses texts directly from documents. If your resume is an exported image PDF, OCR parser limits will lower the score.",
                                "Use active action verbs: Start statements with strong verbs (e.g. Spearheaded, Synthesized, Restructured) and avoid passive tone."
                            ].map((tip, idx) => (
                                <li key={idx} className="flex gap-3 items-start text-xs text-[var(--text-secondary)]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )
        },
        // Slide 5: FAQ
        {
            title: "Frequently Asked Questions",
            subtitle: "Answers to common queries",
            icon: HelpCircle,
            content: (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar text-left">
                    {[
                        {
                            q: "Is my resume data safe?",
                            a: "Yes. All resume content uploaded is parsed securely and processed through standard encrypted API endpoints. We do not store your files on persistent file hosts long-term; they are stored locally or parsed dynamically."
                        },
                        {
                            q: "How is the ATS Score calculated?",
                            a: "We compute scores using four components: Keyword Match (how closely your skills match standard career tracks), Format and Layout (proper sections, font scanability), Content Depth (metric impact, action verbs), and Spelling/Grammar checks."
                        },
                        {
                            q: "What file types can I upload?",
                            a: "We natively support PDF, DOCX, and DOC files. Text-based DOCX files are highly recommended for the most accurate formatting structure analysis."
                        },
                        {
                            q: "Do I need a MongoDB connection?",
                            a: "No. The backend operates perfectly fine without MongoDB, falling back automatically to local JSON file structures to store dashboard history."
                        }
                    ].map((faq, idx) => {
                        const isExpanded = activeFaq === idx;
                        return (
                            <div key={idx} className="border border-[var(--border-primary)] bg-[var(--bg-surface-secondary)] rounded-2xl overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => setActiveFaq(isExpanded ? null : idx)}
                                    className="w-full flex justify-between items-center p-4 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--border-primary)]/10 transition-colors"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronRight size={14} className={`text-[var(--text-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="px-4 pb-4 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-primary)]/50 pt-2">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )
        },
        // Slide 6: Support & Complete
        {
            title: "You're All Set!",
            subtitle: "Start optimizing your career today",
            icon: Heart,
            content: (
                <div className="space-y-6 text-left">
                    <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                        You have unlocked all access to the ResuLens intelligence suite. Optimize your resumes, design tailored cover letters, and master your upcoming interviews with our coaching tools.
                    </p>
                    <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                        <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                            <Mail size={16} className="text-indigo-500" /> Need Help or Have Feedback?
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            Our support staff is ready to assist you. You can connect with our global support and community channels below:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <a href="mailto:support@resulens.ai" className="p-3 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl text-xs font-bold text-center block hover:text-cyan-500 hover:border-cyan-500 transition-all">
                                support@resulens.ai
                            </a>
                            <a href="https://discord.gg/resulens" target="_blank" rel="noreferrer" className="p-3 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-xl text-xs font-bold text-center block hover:text-cyan-500 hover:border-cyan-500 transition-all">
                                Join our Discord
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium pt-2">
                        <span>ResuLens Engine v2.0.0</span>
                        <span>Open source MIT license</span>
                    </div>
                </div>
            )
        }
    ];

    const currentSlideData = slides[currentSlide];
    const SlideIcon = currentSlideData.icon;

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const handleComplete = () => {
        const userId = user?.id || 'guest';
        localStorage.setItem(`resulens_onboarding_completed_${userId}`, 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative w-full max-w-4xl bg-[var(--bg-surface)] rounded-[3rem] border border-[var(--border-primary)] shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[620px]"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-[var(--bg-surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-primary)]/20 transition-all active:scale-95 z-55"
                    aria-label="Close Guide"
                >
                    <X size={16} />
                </button>

                {/* Sidebar Navigation */}
                <div className="w-full md:w-[280px] bg-[var(--bg-surface-secondary)] border-b md:border-b-0 md:border-r border-[var(--border-primary)] p-8 flex flex-col justify-between shrink-0">
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-cyan-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg">
                                <BookOpen size={16} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-sm text-[var(--text-primary)] tracking-tight">Onboarding Tour</h3>
                                <p className="text-[9px] font-bold text-cyan-600 uppercase tracking-wider">Features & Guide</p>
                            </div>
                        </div>

                        {/* Slide Indicators */}
                        <div className="hidden md:flex flex-col gap-2.5">
                            {slides.map((slide, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlide(idx)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left group ${
                                        currentSlide === idx 
                                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/15' 
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-primary)]/20'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${
                                        currentSlide === idx ? 'bg-white/20 text-white' : 'bg-[var(--border-primary)] text-[var(--text-muted)] group-hover:bg-[var(--border-primary)]/40'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                    <span>{slide.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Progress Bar for Mobile & Footer indicator */}
                    <div className="pt-6 border-t border-[var(--border-primary)] mt-6 md:mt-0 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            Slide {currentSlide + 1} of {slides.length}
                        </span>
                        <div className="flex gap-1">
                            {slides.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        currentSlide === idx ? 'w-5 bg-cyan-600' : 'w-1.5 bg-[var(--border-primary)]'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Slide Content Area */}
                <div className="flex-grow p-8 md:p-12 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-6 md:space-y-8 flex-grow overflow-hidden flex flex-col justify-center">
                        <div className="space-y-2 text-left shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl shrink-0">
                                    <SlideIcon size={22} />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                                    {currentSlideData.title}
                                </h2>
                            </div>
                            <p className="text-xs md:text-sm font-semibold text-[var(--text-muted)] pl-1">
                                {currentSlideData.subtitle}
                            </p>
                        </div>

                        {/* Content Animation */}
                        <div className="flex-grow overflow-hidden relative flex flex-col justify-start pt-2">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentSlide}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full flex-grow overflow-auto h-full pr-1 custom-scrollbar"
                                >
                                    {currentSlideData.content}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-6 border-t border-[var(--border-primary)] flex justify-between items-center shrink-0 gap-4 mt-6 md:mt-0">
                        <button
                            onClick={handleComplete}
                            className="text-xs font-bold text-[var(--text-muted)] hover:text-rose-500 transition-colors py-2"
                        >
                            Skip Tour
                        </button>

                        <div className="flex items-center gap-3">
                            {currentSlide > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-1.5 px-5 py-3 rounded-2xl text-xs font-bold bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--border-primary)]/10 transition-all active:scale-95"
                                >
                                    <ChevronLeft size={14} /> Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-1.5 px-6 py-3 rounded-2xl text-xs font-bold bg-cyan-600 text-white shadow-xl shadow-cyan-600/15 hover:bg-cyan-700 transition-all active:scale-95"
                            >
                                <span>{currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}</span>
                                {currentSlide === slides.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default UserGuideModal;
