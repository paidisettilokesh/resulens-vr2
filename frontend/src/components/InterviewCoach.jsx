import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import {
    HelpCircle, Mic, MicOff, MessageSquare, Volume2, FileText,
    Loader2, Play, CheckCircle, ChevronRight, Trophy, Zap,
    Brain, Star, Award, RotateCcw, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Build the API base URL once — same logic as ResumeContext
const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api';

const InterviewCoach = ({ runFeature, interviewPrep, loading, jobDescription, setJobDescription, selectedRole }) => {
    const { user, logout } = useUser();
    const [step, setStep] = useState('setup'); // setup, session, result
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [evaluations, setEvaluations] = useState({}); // Track multiple evaluations
    const [evaluating, setEvaluating] = useState(false);
    const [evalError, setEvalError] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [sessionStats, setSessionStats] = useState({ answered: 0, totalScore: 0 });


    // Sync userAnswer with selected question's previous attempt
    useEffect(() => {
        if (activeQuestion) {
            setUserAnswer(evaluations[activeQuestion.id]?.answer || '');
        }
    }, [activeQuestion]);

    // --- SPEECH RECOGNITION (STT) ---
    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice features require Chrome or Edge.");
            return;
        }
        const SpeechRecognition = window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setUserAnswer(transcript);
        };
        recognition.start();
        setTimeout(() => recognition.stop(), 15000); // 15s max per burst
    };

    // --- SPEECH SYNTHESIS (TTS) ---
    const speak = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    // --- AUTO-SPEAK ON NEW QUESTION ---
    useEffect(() => {
        if (activeQuestion && step === 'session') {
            speak(activeQuestion.question);
        }
    }, [activeQuestion, step]);

    // --- UNIFIED RENDER ---
    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* HERO SECTION */}
            <div className="text-center relative p-12 rounded-[4rem] bg-cyan-50 dark:bg-cyan-500/10 text-[var(--text-primary)] overflow-hidden shadow-xl border border-cyan-100 dark:border-cyan-500/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-cyan-100 dark:border-cyan-500/20 mb-6 font-bold text-cyan-600 dark:text-cyan-400 shadow-sm">
                        <Brain size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Neural Interview Logic v4.0</span>
                    </div>
                    <h2 className="text-5xl font-bold mb-4 tracking-tighter text-[var(--text-primary)]">AI Interview <span className="text-cyan-600 dark:text-cyan-400">Tactician</span></h2>
                    <p className="text-[var(--text-secondary)] text-lg font-medium max-w-2xl mx-auto italic">"Simulation of elite behavioral and technical panels with real-time audio evaluation."</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* STEP 1: SETUP */}
                {step === 'setup' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="grid lg:grid-cols-2 gap-10 items-stretch">
                        <div className="bg-[var(--bg-surface)] p-12 rounded-[4rem] border border-[var(--border-primary)] shadow-xl flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-full uppercase tracking-widest mb-8 inline-block">Session Parameters</span>
                                <h3 className="text-3xl font-black text-[var(--text-primary)] mb-6">Environment Setup</h3>
                                <p className="text-[var(--text-secondary)] font-medium mb-10 leading-relaxed">Provide the target Job Description to calibrate our AI panel. The tactician will generate questions based strictly on these requirements.</p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-[var(--bg-surface-secondary)] rounded-3xl border border-[var(--border-secondary)]">
                                        <div className="w-12 h-12 bg-[var(--bg-surface)] rounded-2xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm"><ShieldCheck size={24} /></div>
                                        <div>
                                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase block">Mode</span>
                                            <span className="font-black text-[var(--text-primary)]">Advanced Technical Evaluation</span>
                                        </div>
                                    </div>
                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        className="input-field h-52 !bg-[var(--bg-surface-secondary)] !rounded-[2.5rem] !p-8 focus:shadow-2xl transition-all"
                                        placeholder="Paste full Job Description here..."
                                    />
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    await runFeature('interview');
                                    setStep('session');
                                }}
                                disabled={loading || !jobDescription?.trim()}
                                className="mt-10 btn-primary !py-6 !rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Play size={20} /> Initialize Neural Session</>}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { icon: Brain, title: "Algorithmic Precision", desc: "Questions tailored to your JD using deep semantic parsing." },
                                { icon: Mic, title: "Voice Interactive", desc: "Speak your answers to simulate real-world high-pressure calls." },
                                { icon: Award, title: "Intelligent Scoring", desc: "Real-time STAR method analysis of every response." }
                            ].map((feature, i) => (
                                <div key={i} className="bg-[var(--bg-surface)] p-8 rounded-[3rem] border border-[var(--border-primary)] flex items-center gap-8 group">
                                    <div className="w-16 h-16 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-[1.5rem] flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-500 shrink-0">
                                        <feature.icon size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xl text-[var(--text-primary)] mb-1">{feature.title}</h4>
                                        <p className="text-[var(--text-muted)] text-sm font-medium">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: ACTIVE SESSION */}
                {step === 'session' && !interviewPrep && !loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-[var(--text-primary)] mb-3">Session Failed to Load</h3>
                        <p className="text-[var(--text-secondary)] mb-8">The AI could not generate questions. Check your API key or try again.</p>
                        <button onClick={() => setStep('setup')} className="btn-primary !px-10">Return to Setup</button>
                    </motion.div>
                )}

                {step === 'session' && interviewPrep && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        {/* MANAGEMENT CONSOLE */}
                        <div className="bg-[var(--bg-surface)] rounded-[3rem] border border-[var(--border-primary)] shadow-2xl overflow-hidden">
                            <div className="p-10 border-b border-[var(--border-secondary)] bg-[var(--bg-surface-secondary)] flex justify-between items-center">
                                <div>
                                    <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Interview Simulation Grid</h3>
                                    <p className="text-[var(--text-secondary)] font-medium">15 elite-grade questions calibrated for high-stake roles.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="px-6 py-3 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-secondary)] flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Score: {sessionStats.totalScore}</span>
                                    </div>
                                    <button onClick={() => setStep('setup')} className="p-3 bg-cyan-600/10 text-cyan-600 rounded-xl hover:bg-cyan-600 hover:text-white transition-all">
                                        <RotateCcw size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg-surface-secondary)] border-b border-[var(--border-secondary)]">
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-16">No.</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Interview Question</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Your Answer</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-32">Evaluation</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-24">Score</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">AI Feedback</th>
                                            <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-32">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-secondary)]">
                                        {interviewPrep.sections?.flatMap(s => s.questions).map((q, idx) => {
                                            const questionEval = evaluations?.[q.id];
                                            return (
                                                <tr key={q.id} className={`group hover:bg-slate-50 transition-colors ${activeQuestion?.id === q.id ? 'bg-cyan-50/50' : ''}`}>
                                                    <td className="px-8 py-6 align-top">
                                                        <span className="w-8 h-8 rounded-lg bg-[var(--bg-surface-secondary)] flex items-center justify-center font-black text-xs text-[var(--text-primary)]">
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 align-top">
                                                        <p className="font-bold text-[var(--text-primary)] text-sm leading-relaxed max-w-md">{q.question}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-cyan-500/10 text-cyan-600 rounded-md border border-cyan-500/20">{q.difficulty}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 align-top">
                                                        {questionEval?.answer ? (
                                                            <p className="text-xs font-medium text-[var(--text-secondary)] italic line-clamp-3">"{questionEval.answer}"</p>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase italic">Pending...</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 align-top">
                                                        {questionEval?.verdict ? (
                                                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${questionEval.verdict.includes('Strong') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                questionEval.verdict.includes('Satisfactory') ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                                    'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                                }`}>
                                                                {questionEval.verdict}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-8 py-6 align-top">
                                                        {questionEval?.score ? (
                                                            <span className="text-xl font-black text-cyan-600">{questionEval.score}</span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-8 py-6 align-top">
                                                        {questionEval?.feedback ? (
                                                            <p className="text-[10px] font-medium text-[var(--text-secondary)] leading-relaxed max-w-sm">
                                                                {questionEval.feedback.substring(0, 100)}...
                                                            </p>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-8 py-6 align-top text-right">
                                                        <button
                                                            onClick={() => setActiveQuestion(q)}
                                                            className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-700 transition-all shadow-lg active:scale-95"
                                                        >
                                                            {questionEval ? 'Re-Practice' : 'Practice'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PRACTICE MODAL */}
                        <AnimatePresence>
                            {activeQuestion && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        className="bg-[var(--bg-surface)] w-full max-w-4xl rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-[var(--border-primary)] overflow-hidden flex flex-col max-h-[90vh]"
                                    >
                                        <div className="p-8 border-b border-[var(--border-secondary)] bg-[var(--bg-surface-secondary)] flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-600"><Zap size={20} /></div>
                                                <h4 className="font-black text-[var(--text-primary)]">Practicing Question</h4>
                                            </div>
                                            <button onClick={() => setActiveQuestion(null)} className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-rose-500 transition-all">
                                                Close
                                            </button>
                                        </div>

                                        <div className="p-12 overflow-y-auto">
                                            <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-12">"{activeQuestion.question}"</h3>

                                            <div className="relative group">
                                                <textarea
                                                    value={userAnswer}
                                                    onChange={(e) => setUserAnswer(e.target.value)}
                                                    className="w-full h-48 bg-[var(--bg-surface-secondary)] rounded-[2.5rem] border-2 border-[var(--border-secondary)] p-8 font-medium text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-cyan-500 transition-all outline-none"
                                                    placeholder="Focus on the STAR method (Situation, Task, Action, Result)..."
                                                />
                                                <div className="absolute right-6 bottom-6 flex items-center gap-3">
                                                    <button onClick={startListening} className={`p-4 rounded-2xl shadow-xl transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-cyan-600 text-white'}`}>
                                                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {evaluating && (
                                                <div className="mt-8 flex items-center gap-4 text-cyan-600 font-bold">
                                                    <Loader2 className="animate-spin" />
                                                    <span>Neural engine evaluating response...</span>
                                                </div>
                                            )}

                                            {evalError && !evaluating && (
                                                <div className="mt-6 flex items-center gap-3 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-600">
                                                    <AlertTriangle size={18} />
                                                    <p className="text-sm font-bold">{evalError}</p>
                                                </div>
                                            )}

                                            {/* IN-MODAL FEEDBACK IF ALREADY EVALUATED */}
                                            {evaluations?.[activeQuestion.id] && !evaluating && (
                                                <div className="mt-10 p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-2xl font-black text-emerald-600">Score: {evaluations[activeQuestion.id].score}</span>
                                                        <span className="text-xs font-black uppercase text-emerald-500">{evaluations[activeQuestion.id].verdict}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed italic">
                                                        "{evaluations[activeQuestion.id].feedback}"
                                                    </p>
                                                    <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-emerald-500/10">
                                                        <h5 className="text-[10px] font-black uppercase text-cyan-600 mb-3 tracking-widest">Global Model Answer</h5>
                                                        <p className="text-xs font-serif text-[var(--text-primary)] leading-relaxed italic">
                                                            {evaluations[activeQuestion.id].improvedVersion}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-10 border-t border-[var(--border-secondary)] bg-[var(--bg-surface-secondary)] flex gap-4">
                                            <button
                                                onClick={async () => {
                                                    setEvaluating(true);
                                                    setEvalError('');
                                                    try {
                                                        const res = await axios.post(`${API_BASE}/interview/evaluate`, {
                                                            question: activeQuestion.question,
                                                            answer: userAnswer,
                                                            jobRole: selectedRole || 'Professional'
                                                        }, {
                                                            headers: {
                                                                'x-user-id': user?.id || 'guest',
                                                                ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
                                                            }
                                                        });
                                                        setEvaluations(prev => ({
                                                            ...prev,
                                                            [activeQuestion.id]: { ...res.data, answer: userAnswer }
                                                        }));
                                                        setSessionStats(prev => ({
                                                            answered: prev.answered + 1,
                                                            totalScore: prev.totalScore + parseInt(res.data.score || 0)
                                                        }));
                                                    } catch (err) {
                                                        if (err.response?.status === 401) {
                                                            logout();
                                                        }
                                                        setEvalError(err.response?.data?.error || 'Evaluation failed. Please try again.');
                                                    }
                                                    setEvaluating(false);
                                                }}
                                                disabled={evaluating || !userAnswer}
                                                className="btn-primary flex-grow !rounded-2.5xl !py-4 shadow-xl shadow-cyan-500/20"
                                            >
                                                Submit Mission Response
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const allQuestions = interviewPrep.sections.flatMap(s => s.questions);
                                                    const currentIndex = allQuestions.findIndex(q => q.id === activeQuestion.id);
                                                    const nextQ = allQuestions[currentIndex + 1] || allQuestions[0];
                                                    setActiveQuestion(nextQ);
                                                }}
                                                className="px-8 bg-[var(--bg-surface)] border border-[var(--border-secondary)] rounded-2.5xl font-bold uppercase text-[10px] tracking-widest text-cyan-600 hover:bg-cyan-50 transition-all flex items-center gap-2"
                                            >
                                                Next <ChevronRight size={14} />
                                            </button>
                                            <button onClick={() => setActiveQuestion(null)} className="px-8 bg-white border border-[var(--border-secondary)] rounded-2.5xl font-bold uppercase text-[10px] tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                                                Close Grid
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InterviewCoach;

