import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, EyeOff, Mail, Lock, User, Loader2,
    ShieldCheck, Zap, BarChart3, Mic, FileText,
    ArrowRight, CheckCircle2, AlertCircle, Chrome
} from 'lucide-react';

// ── Password Strength Engine ─────────────────────────────────────────────────
const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
        { label: '', color: '' },
        { label: 'Very Weak', color: '#ef4444' },
        { label: 'Weak', color: '#f97316' },
        { label: 'Fair', color: '#eab308' },
        { label: 'Strong', color: '#22c55e' },
        { label: 'Very Strong', color: '#06b6d4' },
    ];
    return { score, ...levels[Math.min(score, 5)] };
};

const PASSWORD_RULES = [
    { test: (p) => p.length >= 8, label: 'At least 8 characters' },
    { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
    { test: (p) => /[0-9]/.test(p), label: 'One number' },
    { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
];

// ── Feature Highlights for the Left Panel ────────────────────────────────────
const FEATURES = [
    { icon: BarChart3, title: 'ATS Score Analysis', desc: 'Know exactly how recruiters see your resume.' },
    { icon: FileText, title: 'AI Resume Rewriter', desc: 'Impact-driven rewrites in seconds.' },
    { icon: Mic, title: 'Interview Coach', desc: 'Practice with STAR-scored AI feedback.' },
    { icon: Zap, title: 'Market Intelligence', desc: 'Real-time salary & demand insights.' },
];

// ── Main Auth Component ───────────────────────────────────────────────────────
export default function Auth({ onLogin, backendUrl }) {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [passwordFocused, setPasswordFocused] = useState(false);
    const googleBtnRef = useRef(null);

    const isLogin = mode === 'login';
    const passwordStrength = getPasswordStrength(password);
    const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const hasGoogleClientId = clientID.trim() !== '' && clientID !== 'your_google_client_id_here';

    // Initialize Google Sign-In SDK
    useEffect(() => {
        if (!hasGoogleClientId) return;

        const init = () => {
            if (!window.google?.accounts?.id) return;
            window.google.accounts.id.initialize({
                client_id: clientID,
                callback: handleGoogleResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
            });
            if (googleBtnRef.current) {
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline',
                    size: 'large',
                    width: '340',
                    text: 'continue_with',
                    shape: 'pill',
                });
            }
        };

        if (window.google?.accounts?.id) {
            init();
        } else {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = init;
            document.body.appendChild(script);
        }
    }, [mode, hasGoogleClientId, clientID]);

    const handleGoogleResponse = async (response) => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${backendUrl}/auth/google`, { credential: response.credential });
            onLogin(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Google Sign-in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const triggerMockGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const mockPayload = {
                sub: 'google_demo_123456789',
                email: 'demo.developer@resulens.ai',
                name: 'Demo Professional',
                picture: 'https://api.dicebear.com/7.x/adventurer/svg?seed=resulens'
            };
            const jsonStr = JSON.stringify(mockPayload);
            const base64Payload = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
                (_, p1) => String.fromCharCode(parseInt(p1, 16))
            )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const mockCredential = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.bW9ja19zaWduYXR1cmU`;
            const res = await axios.post(`${backendUrl}/auth/google`, { credential: mockCredential });
            onLogin(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Demo sign-in failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isLogin && !getPasswordStrength(password).score >= 2) {
            setError('Please choose a stronger password.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/signup';
            const payload = isLogin ? { email, password } : { email, password, name };
            const { data } = await axios.post(`${backendUrl}${endpoint}`, payload);
            if (!isLogin) {
                setSuccessMsg('Account created! Signing you in...');
                setTimeout(() => onLogin(data), 800);
            } else {
                onLogin(data);
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Authentication failed. Please try again.';
            if (!isLogin && msg.toLowerCase().includes('already exists')) {
                setError('An account with this email already exists.');
                setTimeout(() => { setMode('login'); setError(''); }, 1800);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.post(`${backendUrl}/auth/guest`);
            onLogin(data);
        } catch {
            setError('Failed to start a guest session. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setError('');
        setSuccessMsg('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex bg-[var(--bg-app)]">

            {/* ── LEFT PANEL — Brand & Features ─────────────────────────────── */}
            <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #0c1a2e 40%, #0a2540 100%)'
                }}>

                {/* Ambient glow orbs */}
                <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #0891b2 0%, transparent 70%)' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
                    style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }} />

                {/* Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }}>
                            <Zap size={22} fill="white" className="text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">ResuLens</span>
                    </div>
                    <p className="text-xs font-bold tracking-[0.3em] uppercase mt-1"
                        style={{ color: '#22d3ee', opacity: 0.7 }}>
                        AI Career Intelligence
                    </p>
                </div>

                {/* Hero text */}
                <div className="relative z-10 my-auto">
                    <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-5">
                        Engineer Your<br />
                        <span style={{
                            background: 'linear-gradient(90deg, #22d3ee, #0891b2)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Career Edge
                        </span>
                    </h1>
                    <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-sm">
                        The AI platform that turns your resume into a precision instrument — scoring, rewriting, and coaching you to your next role.
                    </p>

                    {/* Feature list */}
                    <div className="space-y-4">
                        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                            <motion.div
                                key={title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i, duration: 0.5 }}
                                className="flex items-start gap-4"
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.15)' }}>
                                    <Icon size={16} style={{ color: '#22d3ee' }} />
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{title}</p>
                                    <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Trust badges */}
                <div className="relative z-10 flex items-center gap-6">
                    {['256-bit Encrypted', 'SOC 2 Ready', 'GDPR Compliant'].map((badge) => (
                        <div key={badge} className="flex items-center gap-1.5">
                            <ShieldCheck size={12} style={{ color: '#22d3ee', opacity: 0.6 }} />
                            <span className="text-[10px] font-bold tracking-wider uppercase"
                                style={{ color: 'rgba(148, 163, 184, 0.5)' }}>
                                {badge}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT PANEL — Auth Form ──────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-auto">

                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }}>
                        <Zap size={16} fill="white" className="text-white" />
                    </div>
                    <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">ResuLens</span>
                </div>

                <div className="w-full max-w-[420px]">

                    {/* Mode Switcher Tabs */}
                    <div className="flex rounded-2xl p-1 mb-8 gap-1"
                        style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-primary)' }}>
                        {[['login', 'Sign In'], ['signup', 'Create Account']].map(([m, label]) => (
                            <button key={m} type="button" onClick={() => switchMode(m)}
                                id={`auth-tab-${m}`}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                                style={{
                                    background: mode === m ? 'var(--bg-surface)' : 'transparent',
                                    color: mode === m ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Header */}
                    <AnimatePresence mode="wait">
                        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                            className="mb-7">
                            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                                {isLogin ? 'Welcome back' : 'Create your account'}
                            </h2>
                            <p className="text-[var(--text-muted)] text-sm mt-1">
                                {isLogin
                                    ? 'Sign in to access your career intelligence dashboard.'
                                    : 'Join thousands of professionals who landed their next role.'}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* ── Form ── */}
                    <form onSubmit={handleSubmit} noValidate className="space-y-4" id="auth-form">

                        {/* Name — signup only */}
                        <AnimatePresence>
                            {!isLogin && (
                                <motion.div key="name-field"
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                                    <label htmlFor="auth-name"
                                        className="block text-[11px] font-bold uppercase tracking-widest mb-1.5"
                                        style={{ color: 'var(--text-muted)' }}>
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                            style={{ color: 'var(--text-muted)' }} />
                                        <input id="auth-name" type="text" autoComplete="name" required={!isLogin}
                                            value={name} onChange={e => setName(e.target.value)}
                                            placeholder="Jane Doe"
                                            className="input-field pl-10 text-sm py-3"
                                            style={{ borderRadius: '14px' }} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email */}
                        <div>
                            <label htmlFor="auth-email"
                                className="block text-[11px] font-bold uppercase tracking-widest mb-1.5"
                                style={{ color: 'var(--text-muted)' }}>
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--text-muted)' }} />
                                <input id="auth-email" type="email" autoComplete="email" required
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="input-field pl-10 text-sm py-3"
                                    style={{ borderRadius: '14px' }} />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="auth-password"
                                    className="block text-[11px] font-bold uppercase tracking-widest"
                                    style={{ color: 'var(--text-muted)' }}>
                                    Password
                                </label>
                                {isLogin && (
                                    <button type="button" id="forgot-password-btn"
                                        className="text-[11px] font-semibold hover:underline"
                                        style={{ color: 'var(--accent-primary)' }}
                                        onClick={() => setError('Password reset via email — coming soon.')}>
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--text-muted)' }} />
                                <input id="auth-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    required minLength={8}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                    placeholder="••••••••"
                                    className="input-field pl-10 pr-12 text-sm py-3"
                                    style={{ borderRadius: '14px' }} />
                                <button type="button" id="toggle-password-visibility"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100"
                                    style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            {/* Password strength meter — signup only */}
                            <AnimatePresence>
                                {!isLogin && password && (
                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }} className="mt-2.5 space-y-2">
                                        {/* Strength bar */}
                                        <div className="flex gap-1 h-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className="flex-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        background: i <= passwordStrength.score
                                                            ? passwordStrength.color
                                                            : 'var(--border-primary)'
                                                    }} />
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold"
                                                style={{ color: passwordStrength.color || 'var(--text-muted)' }}>
                                                {passwordStrength.label || 'Enter a password'}
                                            </span>
                                        </div>

                                        {/* Requirements checklist */}
                                        <AnimatePresence>
                                            {(passwordFocused || passwordStrength.score < 4) && (
                                                <motion.div initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                                                    {PASSWORD_RULES.map(({ test, label }) => {
                                                        const passed = test(password);
                                                        return (
                                                            <div key={label} className="flex items-center gap-1.5">
                                                                <CheckCircle2 size={11}
                                                                    style={{ color: passed ? '#22c55e' : 'var(--text-muted)', flexShrink: 0 }} />
                                                                <span className="text-[10px] font-medium"
                                                                    style={{ color: passed ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                                                                    {label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Error / Success Messages */}
                        <AnimatePresence>
                            {error && (
                                <motion.div role="alert" aria-live="assertive"
                                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm"
                                    style={{
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        color: '#ef4444'
                                    }}>
                                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                                    <span className="font-medium text-[13px]">{error}</span>
                                </motion.div>
                            )}
                            {successMsg && (
                                <motion.div role="status" aria-live="polite"
                                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm"
                                    style={{
                                        background: 'rgba(34,197,94,0.08)',
                                        border: '1px solid rgba(34,197,94,0.2)',
                                        color: '#22c55e'
                                    }}>
                                    <CheckCircle2 size={15} />
                                    <span className="font-medium text-[13px]">{successMsg}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <button type="submit" id="auth-submit-btn"
                            disabled={loading}
                            className="btn-primary w-full py-3.5 text-sm relative overflow-hidden"
                            style={{ borderRadius: '14px', marginTop: '4px' }}>
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* ── Divider ── */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="h-px flex-1" style={{ background: 'var(--border-primary)' }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: 'var(--text-muted)' }}>or</span>
                        <div className="h-px flex-1" style={{ background: 'var(--border-primary)' }} />
                    </div>

                    {/* ── Google Button ── */}
                    <div className="space-y-3">
                        {hasGoogleClientId ? (
                            <div ref={googleBtnRef} id="google-signin-btn"
                                className="w-full flex justify-center overflow-hidden rounded-full" />
                        ) : (
                            <button type="button" id="google-demo-btn"
                                onClick={triggerMockGoogleLogin}
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-full font-semibold text-[13px] flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98]"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-primary)',
                                    color: 'var(--text-secondary)',
                                }}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                Continue with Google
                                <span className="text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider"
                                    style={{ background: 'rgba(8,145,178,0.1)', color: 'var(--accent-primary)' }}>
                                    Demo
                                </span>
                            </button>
                        )}

                        {/* Guest Access */}
                        <button type="button" id="guest-access-btn"
                            onClick={handleGuestLogin}
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-full font-semibold text-[13px] flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-80"
                            style={{ color: 'var(--text-muted)' }}>
                            Explore as Guest
                            <ArrowRight size={13} />
                        </button>
                    </div>

                    {/* ── Footer ── */}
                    <p className="text-center text-[12px] mt-7" style={{ color: 'var(--text-muted)' }}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button type="button" id={`switch-to-${isLogin ? 'signup' : 'login'}`}
                            onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                            className="font-bold hover:underline"
                            style={{ color: 'var(--accent-primary)' }}>
                            {isLogin ? 'Create one' : 'Sign in'}
                        </button>
                    </p>

                    <p className="text-center text-[10px] mt-4 leading-relaxed" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        By continuing, you agree to our{' '}
                        <span className="underline cursor-pointer">Terms of Service</span>{' '}
                        and{' '}
                        <span className="underline cursor-pointer">Privacy Policy</span>.
                    </p>
                </div>
            </div>
        </div>
    );
}
