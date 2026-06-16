import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, EyeOff, Mail, Lock, User, Loader2,
    ArrowRight, CheckCircle2, AlertCircle, X
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

export default function Auth({ isOpen, onClose, onLogin, backendUrl, initialMode = 'login', pendingFile = null }) {
    const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
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

    // Synchronize initial mode changes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError('');
            setSuccessMsg('');
            setEmail('');
            setPassword('');
            setName('');
        }
    }, [isOpen, initialMode]);

    // Initialize Google Sign-In SDK
    useEffect(() => {
        if (!isOpen || !hasGoogleClientId) return;

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
                    width: '380',
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
    }, [isOpen, mode, hasGoogleClientId, clientID]);

    const handleGoogleResponse = async (response) => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${backendUrl}/auth/google`, { credential: response.credential });
            onLogin(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Google Sign-in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isLogin && getPasswordStrength(password).score < 2) {
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
                setTimeout(() => {
                    onLogin(data);
                    onClose();
                }, 800);
            } else {
                onLogin(data);
                onClose();
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
            onClose();
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative w-full max-w-[460px] bg-[var(--bg-surface)] rounded-[3rem] border border-[var(--border-primary)] shadow-2xl p-8 sm:p-10 overflow-auto max-h-[90vh] custom-scrollbar text-left"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-[var(--bg-surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-primary)]/20 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                    aria-label="Close Authentication Screen"
                >
                    <X size={16} />
                </button>

                {/* File Upload Pending Banner */}
                {pendingFile && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-6 font-semibold animate-pulse">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span className="truncate">Resume &ldquo;{pendingFile.name}&rdquo; loaded for analysis</span>
                    </div>
                )}

                {/* Switcher Tabs */}
                <div className="flex rounded-2xl p-1 mb-8 gap-1"
                    style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-primary)' }}>
                    {[['login', 'Sign In'], ['signup', 'Create Account']].map(([m, label]) => (
                        <button key={m} type="button" onClick={() => switchMode(m)}
                            id={`auth-tab-${m}`}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
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
                <div className="mb-7 text-left">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                        {isLogin ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-xs font-semibold mt-1.5 leading-relaxed">
                        {isLogin
                            ? 'Sign in to access your career intelligence dashboard.'
                            : 'Join thousands of professionals who landed their next role.'}
                    </p>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4" id="auth-form">
                    {/* Name - signup only */}
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div key="name-field"
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                                <label htmlFor="auth-name"
                                    className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-[var(--text-muted)]">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                                    <input id="auth-name" type="text" autoComplete="name" required={!isLogin}
                                        value={name} onChange={e => setName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="input-field pl-10 text-xs py-3"
                                        style={{ borderRadius: '14px' }} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Email */}
                    <div>
                        <label htmlFor="auth-email"
                            className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-[var(--text-muted)]">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                            <input id="auth-email" type="email" autoComplete="email" required
                                value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="input-field pl-10 text-xs py-3"
                                style={{ borderRadius: '14px' }} />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="auth-password"
                                className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                Password
                            </label>
                            {isLogin && (
                                <button type="button" id="forgot-password-btn"
                                    className="text-[10px] font-bold hover:underline text-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                                    onClick={() => setError('Password reset via email — coming soon.')}>
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                            <input id="auth-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                required minLength={8}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                placeholder="••••••••"
                                className="input-field pl-10 pr-12 text-xs py-3"
                                style={{ borderRadius: '14px' }} />
                            <button type="button" id="toggle-password-visibility"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 text-[var(--text-muted)] opacity-60"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {/* Password strength - signup only */}
                        <AnimatePresence>
                            {!isLogin && password && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }} className="mt-2.5 space-y-2">
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
                                        <span className="text-[10px] font-bold"
                                            style={{ color: passwordStrength.color || 'var(--text-muted)' }}>
                                            {passwordStrength.label || 'Enter a password'}
                                        </span>
                                    </div>

                                    {/* Requirements */}
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
                                                            <span className="text-[9px] font-semibold text-[var(--text-secondary)]">
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

                    {/* Alert Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div role="alert" aria-live="assertive"
                                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500">
                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                <span className="font-semibold">{error}</span>
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div role="status" aria-live="polite"
                                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                <CheckCircle2 size={14} />
                                <span className="font-semibold">{successMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <button type="submit" id="auth-submit-btn"
                        disabled={loading}
                        className="btn-primary w-full py-3 text-xs relative overflow-hidden focus-visible:ring-4 focus-visible:ring-cyan-500/50"
                        style={{ borderRadius: '14px', marginTop: '4px' }}>
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <span>{isLogin ? 'Sign In to Portal' : 'Create Free Account'}</span>
                                <ArrowRight size={14} />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                    <div className="h-px flex-1 bg-[var(--border-primary)]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">or</span>
                    <div className="h-px flex-1 bg-[var(--border-primary)]" />
                </div>

                {/* Third Party Auth */}
                <div className="space-y-3">
                    {hasGoogleClientId && (
                        <div ref={googleBtnRef} id="google-signin-btn"
                            className="w-full flex justify-center overflow-hidden rounded-full" />
                    )}

                    {/* Guest Login */}
                    <button type="button" id="guest-access-btn"
                        onClick={handleGuestLogin}
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-full font-bold text-[12px] flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-80 text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                    >
                        Continue as Guest
                        <ArrowRight size={13} />
                    </button>
                </div>

                {/* Footer Switcher */}
                <p className="text-center text-[11px] mt-6 text-[var(--text-muted)] font-semibold">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button type="button" id={`switch-to-${isLogin ? 'signup' : 'login'}`}
                        onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                        className="font-bold hover:underline text-[var(--accent-primary)]"
                    >
                        {isLogin ? 'Create one' : 'Sign in'}
                    </button>
                </p>
            </motion.div>
        </div>
    );
}
