import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, EyeOff, Mail, Lock, User, Loader2,
    ArrowRight, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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

export default function Auth({ isOpen, onClose, onLogin, backendUrl, initialMode = 'login', pendingFile = null, resetToken = null }) {
    const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot-password' | 'reset-password'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [passwordFocused, setPasswordFocused] = useState(false);
    const googleBtnRef = useRef(null);
    const { theme } = useTheme();

    const isLogin = mode === 'login';
    const isSignup = mode === 'signup';
    const isForgot = mode === 'forgot-password';
    const isReset = mode === 'reset-password';
    const passwordStrength = getPasswordStrength(password);
    const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '301466670902-h42rg1ghcnhoo109dam60hjkd4020gq5.apps.googleusercontent.com';
    const hasGoogleClientId = clientID.trim() !== '' && clientID !== 'your_google_client_id_here';

    // Synchronize initial mode changes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError('');
            setSuccessMsg('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setName('');
        }
    }, [isOpen, initialMode]);

    // Stable callback reference for the Google SDK — must not change between renders
    const handleGoogleResponse = useCallback(async (response) => {
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
    }, [backendUrl, onLogin, onClose]);

    // Initialize / re-render the Google Sign-In button whenever the modal opens,
    // the active tab (mode) changes, or the theme toggles between light and dark.
    useEffect(() => {
        if (!isOpen || !hasGoogleClientId) return;

        // Choose the Google button color scheme to match the ResuLens theme.
        // 'filled_black' satisfies Google brand guidelines for dark surfaces;
        // 'outline' works for light surfaces.
        const googleTheme = theme === 'dark' ? 'filled_black' : 'outline';

        const renderGoogleButton = () => {
            if (!window.google?.accounts?.id) return;

            window.google.accounts.id.initialize({
                client_id: clientID,
                callback: handleGoogleResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            // Use requestAnimationFrame to guarantee the ref container is mounted
            // in the DOM before calling renderButton — prevents the button from
            // silently disappearing after a login ↔ signup tab switch.
            requestAnimationFrame(() => {
                if (googleBtnRef.current) {
                    // Clear any previously rendered button iframe first
                    googleBtnRef.current.innerHTML = '';
                    window.google.accounts.id.renderButton(googleBtnRef.current, {
                        theme: googleTheme,
                        size: 'large',
                        width: '380',
                        text: 'continue_with',
                        shape: 'pill',
                        logo_alignment: 'left',
                    });
                }
            });
        };

        if (window.google?.accounts?.id) {
            renderGoogleButton();
        } else {
            // Load the GSI script once; subsequent calls will find it already loaded.
            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (existingScript) {
                // Script tag exists but may still be loading — wait for it
                existingScript.addEventListener('load', renderGoogleButton, { once: true });
            } else {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = renderGoogleButton;
                document.body.appendChild(script);
            }
        }
    }, [isOpen, mode, hasGoogleClientId, clientID, theme, handleGoogleResponse]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        // Email validation for login, signup, and forgot-password
        if (!isReset) {
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                setError('Please enter a valid email address.');
                return;
            }
            if (email.length > 254) {
                setError('Email address is too long.');
                return;
            }
        }

        // Password validation for signup and reset
        if (isSignup || isReset) {
            if (!password || password.length < 8) {
                setError('Password must be at least 8 characters long.');
                return;
            }
            if (getPasswordStrength(password).score < 2) {
                setError('Please choose a stronger password.');
                return;
            }
        }

        // Specific checks for password reset mode
        if (isReset) {
            if (password !== confirmPassword) {
                setError('Passwords do not match. Please ensure both passwords match.');
                return;
            }
            if (!resetToken) {
                setError('Password reset token is missing or invalid. Please request a new link.');
                return;
            }
        }
        
        setLoading(true);
        
        try {
            if (isForgot) {
                const res = await axios.post(`${backendUrl}/auth/forgot-password`, { email: email.trim() });
                setSuccessMsg(res.data?.message || 'If an account matches that email address, password reset instructions have been sent.');
                setTimeout(() => {
                    setMode('login');
                    setSuccessMsg('');
                }, 4000);
            } else if (isReset) {
                const res = await axios.post(`${backendUrl}/auth/reset-password`, { token: resetToken, password });
                setSuccessMsg(res.data?.message || 'Your password has been reset successfully. You can now log in.');
                setTimeout(() => {
                    setMode('login');
                    setSuccessMsg('');
                    setPassword('');
                    setConfirmPassword('');
                }, 3000);
            } else {
                const endpoint = isLogin ? '/auth/login' : '/auth/signup';
                const payload = isLogin ? { email: email.trim(), password } : { email: email.trim(), password, name: name.trim() };
                const { data } = await axios.post(`${backendUrl}${endpoint}`, payload);
                if (isSignup) {
                    setSuccessMsg('Account created! Signing you in...');
                    setTimeout(() => {
                        onLogin(data);
                        onClose();
                    }, 800);
                } else {
                    onLogin(data);
                    onClose();
                }
            }
        } catch (err) {
            const rawMsg = err.response?.data?.error;
            // Prevent leaking internal errors like SMTP/database connection strings
            if (rawMsg && !rawMsg.toLowerCase().includes('connect') && !rawMsg.toLowerCase().includes('sql') && !rawMsg.toLowerCase().includes('mongo') && !rawMsg.toLowerCase().includes('smtp')) {
                if (isSignup && rawMsg.toLowerCase().includes('already exists')) {
                    setError('An account with this email already exists.');
                    setTimeout(() => { setMode('login'); setError(''); }, 1800);
                } else {
                    setError(rawMsg);
                }
            } else {
                setError('We could not process your request right now. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };


    const switchMode = (newMode) => {
        setMode(newMode);
        setError('');
        setSuccessMsg('');
        setPassword('');
        setConfirmPassword('');
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
                    className="absolute top-6 right-6 p-2 rounded-xl bg-[var(--bg-surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-primary)]/20 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Close Authentication Screen"
                >
                    <X size={16} aria-hidden="true" />
                </button>

                {/* File Upload Pending Banner */}
                {pendingFile && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-6 font-semibold animate-pulse">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span className="truncate">Resume &ldquo;{pendingFile.name}&rdquo; loaded for analysis</span>
                    </div>
                )}

                {/* Switcher Tabs (Only for login/signup) */}
                {(isLogin || isSignup) && (
                    <div className="flex rounded-2xl p-1 mb-8 gap-1"
                        style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-primary)' }}>
                        {[['login', 'Sign In'], ['signup', 'Create Account']].map(([m, label]) => (
                            <button key={m} type="button" onClick={() => switchMode(m)}
                                id={`auth-tab-${m}`}
                                aria-current={mode === m ? 'true' : undefined}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-cyan-700 dark:focus-visible:ring-cyan-400 min-h-[44px]"
                                style={{
                                    background: mode === m ? 'var(--bg-surface)' : 'transparent',
                                    color: mode === m ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                }}>
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Header */}
                <div className="mb-7 text-left">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                        {isLogin ? 'Welcome back' : isSignup ? 'Create your account' : isForgot ? 'Reset Password' : 'Set New Password'}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-xs font-semibold mt-1.5 leading-relaxed">
                        {isLogin ? 'Sign in to access your career intelligence dashboard.' : 
                         isSignup ? 'Join thousands of professionals who landed their next role.' : 
                         isForgot ? 'Enter your email to receive a password reset link.' : 
                         'Enter your new strong password below.'}
                    </p>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4" id="auth-form">
                    {/* Name - signup only */}
                    <AnimatePresence>
                        {isSignup && (
                            <motion.div key="name-field"
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                                <label htmlFor="auth-name"
                                    className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-[var(--text-muted)]">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                                    <input id="auth-name" type="text" autoComplete="name" required={isSignup}
                                        value={name} onChange={e => setName(e.target.value)}
                                        aria-invalid={!!error && isSignup}
                                        placeholder="Jane Doe"
                                        className="input-field pl-10 text-xs py-3 min-h-[44px]"
                                        style={{ borderRadius: '14px' }} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Email */}
                    {!isReset && (
                        <div>
                            <label htmlFor="auth-email"
                                className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-[var(--text-muted)]">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                                <input id="auth-email" type="email" autoComplete="email" required
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    aria-invalid={!!error}
                                    placeholder="you@company.com"
                                    className="input-field pl-10 text-xs py-3 min-h-[44px]"
                                    style={{ borderRadius: '14px' }} />
                            </div>
                        </div>
                    )}

                    {/* Password */}
                    {!isForgot && (
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="auth-password"
                                    className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    Password
                                </label>
                                {isLogin && (
                                    <button type="button" id="forgot-password-btn"
                                        className="text-xs font-bold hover:underline text-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                                        onClick={() => switchMode('forgot-password')}>
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                        <div className="relative">
                            <Lock size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                            <input id="auth-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                required minLength={8}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                aria-invalid={!!error && !isForgot}
                                aria-describedby={isSignup || isReset ? "password-requirements" : undefined}
                                placeholder="••••••••"
                                className="input-field pl-10 pr-12 text-xs py-3 min-h-[44px]"
                                style={{ borderRadius: '14px' }} />
                            <button type="button" id="toggle-password-visibility"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 text-[var(--text-muted)] opacity-80 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>
                        </div>

                            {/* Confirm Password - Reset mode only */}
                            {isReset && (
                                <div className="mt-3">
                                    <label htmlFor="auth-confirm-password"
                                        className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-[var(--text-muted)]">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                                        <input id="auth-confirm-password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required minLength={8}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            aria-invalid={!!error && isReset}
                                            placeholder="••••••••"
                                            className="input-field pl-10 pr-12 text-xs py-3 min-h-[44px]"
                                            style={{ borderRadius: '14px' }} />
                                        <button type="button" id="toggle-confirm-password-visibility"
                                            onClick={() => setShowConfirmPassword(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 text-[var(--text-muted)] opacity-80 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                                            {showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-[11px] text-rose-500 font-semibold mt-1.5 flex items-center gap-1.5">
                                            <AlertCircle size={12} /> Passwords do not match
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Password strength - signup and reset only */}
                            <AnimatePresence>
                                {(isSignup || isReset) && password && (
                                    <motion.div id="password-requirements" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
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
                                        <span className="text-xs font-bold"
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
                                                            <CheckCircle2 size={13}
                                                                style={{ color: passed ? '#22c55e' : 'var(--text-muted)', flexShrink: 0 }} />
                                                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
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
                    )}

                    {/* Alert Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div role="alert" aria-live="assertive"
                                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                <span className="font-semibold">{error}</span>
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div role="status" aria-live="polite"
                                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2.5 p-3.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 size={14} />
                                <span className="font-semibold">{successMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <button type="submit" id="auth-submit-btn"
                        disabled={loading}
                        className="btn-primary w-full py-3 text-xs relative overflow-hidden focus-visible:ring-4 focus-visible:ring-cyan-700 min-h-[44px]"
                        style={{ borderRadius: '14px', marginTop: '4px' }}>
                        {loading ? (
                            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                        ) : (
                            <>
                                <span>{isLogin ? 'Sign In to Portal' : isSignup ? 'Create Free Account' : isForgot ? 'Send Reset Link' : 'Reset Password'}</span>
                                <ArrowRight size={14} aria-hidden="true" />
                            </>
                        )}
                    </button>
                </form>

                {/* Third Party Auth (Only for login/signup) */}
                {(isLogin || isSignup) && hasGoogleClientId && (
                    <>
                        {/* Divider */}
                        <div className="flex items-center gap-3 my-5">
                            <div className="h-px flex-1 bg-[var(--border-primary)]" />
                            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">or</span>
                            <div className="h-px flex-1 bg-[var(--border-primary)]" />
                        </div>

                        <div className="space-y-3">
                            <div ref={googleBtnRef} id="google-signin-btn"
                                className="w-full flex justify-center overflow-hidden rounded-full" />
                        </div>
                    </>
                )}

                {/* Footer Switcher */}
                <p className="text-center text-[11px] mt-6 text-[var(--text-muted)] font-semibold">
                    {isForgot || isReset ? "Remember your password? " : isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button type="button" id={`switch-to-${isLogin ? 'signup' : 'login'}`}
                        onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                        className="font-bold hover:underline text-[var(--accent-primary)]"
                    >
                        {isForgot || isReset ? 'Back to Sign In' : isLogin ? 'Create one' : 'Sign in'}
                    </button>
                </p>
            </motion.div>
        </div>
    );
}
