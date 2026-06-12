import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, Activity, Server, Shield, TrendingUp, CheckCircle,
    AlertTriangle, RefreshCw, Search, ShieldAlert, Cpu, HardDrive, Clock, Key,
    Lock, Unlock, Eye, X, Trash2, ShieldCheck, Play, Pause, Ban, Terminal, HelpCircle
} from 'lucide-react';

// Client-side lightweight User Agent parser
const parseUserAgent = (ua) => {
    if (!ua) return 'Unknown Device';
    let browser = 'Browser';
    let os = 'OS';
    
    if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} (${os})`;
};

export default function AdminDashboard({ user, backendUrl }) {
    // Security & Re-Auth states
    const [isUnlocked, setIsUnlocked] = useState(() => {
        // Persist unlock state during browser session for convenience
        const unlockedAt = sessionStorage.getItem('admin_unlocked_at');
        if (unlockedAt) {
            const timeDiff = Date.now() - parseInt(unlockedAt, 10);
            return timeDiff < 15 * 60 * 1000; // 15 mins session expiry
        }
        return false;
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Dashboard data states
    const [analytics, setAnalytics] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [systemLogs, setSystemLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI tabs and controls
    const [dashboardTab, setDashboardTab] = useState('overview'); // 'overview' | 'users' | 'audit' | 'system'
    const [activeDrill, setActiveDrill] = useState(null); // 'accounts' | 'active' | 'logins' | 'status' | null
    
    // Pagination, Filter, Search, Sort & Profile states
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [verificationFilter, setVerificationFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt-desc');
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 8;
    
    const [activeDaysConfig, setActiveDaysConfig] = useState(30); // 7 | 30 | 90 days active
    const [actionLoading, setActionLoading] = useState(null); // stores userId or actionId during async execution

    const fetchAdminData = async () => {
        if (!isUnlocked) return;
        setLoading(true);
        setError('');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };
            const analyticsRes = await axios.get(`${backendUrl}/admin/analytics`, config);
            setAnalytics(analyticsRes.data);

            const usersRes = await axios.get(`${backendUrl}/admin/users`, config);
            setUsersList(usersRes.data);

            const auditRes = await axios.get(`${backendUrl}/admin/audit-logs`, config);
            setAuditLogs(auditRes.data);

            const sysRes = await axios.get(`${backendUrl}/admin/system/logs`, config);
            setSystemLogs(sysRes.data.logs || []);
        } catch (err) {
            console.error("Failed to load admin data:", err);
            setError(err.response?.data?.error || "Unauthorized or connection to admin routes failed.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isUnlocked) {
            fetchAdminData();
        }
    }, [backendUrl, isUnlocked]);

    // Handle Password Re-Authentication
    const handleReAuthenticate = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };
            await axios.post(`${backendUrl}/admin/verify-password`, { password: confirmPassword }, config);
            sessionStorage.setItem('admin_unlocked_at', Date.now().toString());
            setIsUnlocked(true);
        } catch (err) {
            setAuthError(err.response?.data?.error || "Invalid password. Re-authentication failed.");
        } finally {
            setAuthLoading(false);
        }
    };

    // Lock panel
    const handleLock = () => {
        sessionStorage.removeItem('admin_unlocked_at');
        setIsUnlocked(false);
        setConfirmPassword('');
    };

    // User administrative modifications
    const handleRoleChange = async (targetUserId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        setActionLoading(targetUserId);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };
            await axios.put(`${backendUrl}/admin/users/${targetUserId}/role`, { role: newRole }, config);
            
            // Reload logs and tables
            fetchAdminData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update role.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleStatusChange = async (targetUserId, newStatus) => {
        setActionLoading(`${targetUserId}-status`);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };
            await axios.put(`${backendUrl}/admin/users/${targetUserId}/status`, { status: newStatus }, config);
            
            // Reload logs and tables
            fetchAdminData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update account status.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUserDelete = async (targetUserId) => {
        if (!confirm("⚠️ WARNING: Are you absolutely sure you want to permanently delete this account? This action is irreversible.")) {
            return;
        }
        setActionLoading(`${targetUserId}-delete`);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };
            await axios.delete(`${backendUrl}/admin/users/${targetUserId}`, config);
            
            // Reload logs and tables
            fetchAdminData();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete user account.");
        } finally {
            setActionLoading(null);
        }
    };

    // ── GATED RENDER: Screen locked ──────────────────────────────────────────
    if (!isUnlocked) {
        return (
            <div className="max-w-md mx-auto my-16 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative glows */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />

                <div className="text-center space-y-6 relative z-10">
                    <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400 animate-pulse">
                        <Lock size={28} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-[var(--text-primary)]">Admin Session Locked</h2>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-4">
                            You are entering a high-clearance administrative environment containing user records and system diagnostics. Please verify your password to continue.
                        </p>
                    </div>

                    <form onSubmit={handleReAuthenticate} className="space-y-4 pt-2">
                        <input
                            type="password"
                            required
                            placeholder="Re-enter your account password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="input-field py-3 text-center text-sm rounded-xl border-[var(--border-primary)] shadow-inner"
                        />

                        {authError && (
                            <div className="text-xs font-bold text-rose-500 flex items-center justify-center gap-1">
                                <AlertTriangle size={12} /> {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                        >
                            {authLoading ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <>
                                    <Unlock size={14} /> Verify Credentials
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <RefreshCw className="w-10 h-10 animate-spin text-cyan-500" />
                <p className="text-sm font-semibold tracking-wider text-[var(--text-secondary)] uppercase">Decrypting System telemetry...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center space-y-4 my-10 animate-fade-in">
                <ShieldAlert className="w-16 h-16 mx-auto text-rose-500" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Admin Verification Fault</h3>
                <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                <button onClick={handleLock} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all duration-200">
                    Return to Authentication
                </button>
            </div>
        );
    }

    // ── FILTER & PAGINATION ENGINE (User directory) ─────────────────────────
    const filteredUsers = usersList.filter(u => {
        const matchesSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        
        let matchesStatus = true;
        if (statusFilter !== 'all') {
            const userStatus = u.status || 'active';
            matchesStatus = userStatus === statusFilter;
        }

        let matchesVerification = true;
        const isUserVerified = !(u.email && u.email.startsWith('guest'));
        if (verificationFilter === 'verified') {
            matchesVerification = isUserVerified;
        } else if (verificationFilter === 'unverified') {
            matchesVerification = !isUserVerified;
        }

        return matchesSearch && matchesRole && matchesStatus && matchesVerification;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (sortBy === 'name-asc') {
            return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'name-desc') {
            return (b.name || '').localeCompare(a.name || '');
        }
        if (sortBy === 'createdAt-asc') {
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === 'createdAt-desc') {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === 'loginCount-desc') {
            return (b.loginCount || 0) - (a.loginCount || 0);
        }
        if (sortBy === 'loginCount-asc') {
            return (a.loginCount || 0) - (b.loginCount || 0);
        }
        if (sortBy === 'lastLoginAt-desc') {
            return new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0);
        }
        if (sortBy === 'lastLoginAt-asc') {
            return new Date(a.lastLoginAt || 0) - new Date(b.lastLoginAt || 0);
        }
        return 0;
    });

    const totalPages = Math.ceil(sortedUsers.length / usersPerPage) || 1;
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);

    // Filter Active Users Drill Lists
    const activeRangeMs = activeDaysConfig * 24 * 60 * 60 * 1000;
    const activeUsersList = usersList.filter(u => 
        u.lastLoginAt && (Date.now() - Date.parse(u.lastLoginAt)) <= activeRangeMs
    );

    // Filter Login History entries from Audit logs
    const loginHistoryLogs = auditLogs.filter(log => 
        ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_SUSPENDED', 'LOGIN_INACTIVE', 'LOGIN_SUCCESS_GOOGLE', 'LOGIN_GUEST'].includes(log.action)
    );

    // Chart scaling
    const growthTrend = analytics?.users?.growthTrend || [];
    const maxGrowth = Math.max(...growthTrend.map(d => d.registrations), 5);

    const activityTrend = analytics?.usage?.activityTrend || [];
    const maxActivity = Math.max(...activityTrend.map(d => d.actions), 5);

    const featureUsage = analytics?.usage?.featureUsage || {};
    const totalFeatureActions = Object.values(featureUsage).reduce((a, b) => a + b, 0) || 1;

    return (
        <div className="space-y-8 animate-fade-in relative">

            {/* Lock session action */}
            <div className="absolute -top-3 right-0 z-20">
                <button
                    onClick={handleLock}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-xl border border-rose-500/20 transition-all duration-200 shadow-sm"
                >
                    <Lock size={12} /> Lock Admin Panel
                </button>
            </div>

            {/* Header & Sub-tab Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-primary)] pb-6 pt-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-cyan-500/10 rounded-xl text-cyan-600 dark:text-cyan-400">
                            <Shield size={20} />
                        </span>
                        <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                            ResuLens Control Center
                        </h1>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            {user.role} mode
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
                        Auditing platform registrations, login credentials, server telemetry, and role updates.
                    </p>
                </div>
                
                {/* Sub Tab buttons */}
                <div className="flex bg-[var(--bg-surface-secondary)] p-1 rounded-xl border border-[var(--border-primary)] shadow-sm">
                    {[
                        ['overview', 'Overview', Activity],
                        ['users', 'User Directory', Users],
                        ['audit', 'Audit Logs', ShieldCheck],
                        ['system', 'System Logs', Terminal]
                    ].map(([t, label, Icon]) => (
                        <button
                            key={t}
                            onClick={() => setDashboardTab(t)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                dashboardTab === t
                                    ? 'bg-[var(--bg-surface)] text-cyan-600 dark:text-cyan-400 shadow-sm border border-[var(--border-secondary)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tab 1: Overview ─────────────────────────────────────────────── */}
            {dashboardTab === 'overview' && (
                <div className="space-y-8">
                    
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Accounts */}
                        <div
                            onClick={() => {
                                setDashboardTab('users');
                                setRoleFilter('all');
                                setStatusFilter('all');
                                setVerificationFilter('all');
                                setSearchQuery('');
                                setCurrentPage(1);
                            }}
                            className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:border-cyan-500/30 active:scale-[0.99] cursor-pointer transition-all duration-200 group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-cyan-500">Total Accounts</p>
                                    <h3 className="text-3xl font-black text-[var(--text-primary)] mt-1">{analytics?.users?.total || 0}</h3>
                                    <p className="text-[10px] text-cyan-500 font-semibold mt-1">Navigate to Directory →</p>
                                </div>
                                <span className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-cyan-500/20">
                                    <Users size={18} />
                                </span>
                            </div>
                        </div>

                        {/* Active Users */}
                        <div
                            onClick={() => {
                                setDashboardTab('users');
                                setRoleFilter('all');
                                setStatusFilter('active');
                                setVerificationFilter('all');
                                setSearchQuery('');
                                setCurrentPage(1);
                            }}
                            className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:border-emerald-500/30 active:scale-[0.99] cursor-pointer transition-all duration-200 group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-emerald-500">Active (30D)</p>
                                    <h3 className="text-3xl font-black text-[var(--text-primary)] mt-1">{analytics?.users?.active30Days || 0}</h3>
                                    <p className="text-[10px] text-emerald-500 font-semibold mt-1">Filter active directory →</p>
                                </div>
                                <span className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500/20">
                                    <Activity size={18} />
                                </span>
                            </div>
                        </div>

                        {/* Total Logins */}
                        <div
                            onClick={() => {
                                setDashboardTab('audit');
                            }}
                            className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:border-purple-500/30 active:scale-[0.99] cursor-pointer transition-all duration-200 group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-purple-500">Total Logins</p>
                                    <h3 className="text-3xl font-black text-[var(--text-primary)] mt-1">{analytics?.users?.totalLogins || 0}</h3>
                                    <p className="text-[10px] text-purple-500 font-semibold mt-1">Navigate to Audit Logs →</p>
                                </div>
                                <span className="p-3 bg-cyan-500/10 rounded-xl text-cyan-500 group-hover:bg-purple-500/20">
                                    <TrendingUp size={18} />
                                </span>
                            </div>
                        </div>

                        {/* System Link Status */}
                        <div
                            onClick={() => {
                                setDashboardTab('system');
                            }}
                            className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:scale-[1.02] hover:border-emerald-500/35 active:scale-[0.99] cursor-pointer transition-all duration-200 group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-emerald-500">System Link Status</p>
                                    <h3 className="text-sm font-black text-emerald-500 mt-3.5 flex items-center gap-1.5">
                                        <CheckCircle size={14} /> Active Mode
                                    </h3>
                                    <p className="text-[10px] text-emerald-500 font-semibold mt-2.5">Navigate to System Logs →</p>
                                </div>
                                <span className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500/20">
                                    <Server size={18} />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Graphs Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 1. Account Growth Graph */}
                        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                <TrendingUp size={16} className="text-cyan-500" /> New Account Growth (Last 7 Days)
                            </h3>
                            <div className="h-56 w-full flex items-end justify-between relative pt-6 px-4">
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-4">
                                    <div className="w-full border-t border-[var(--border-primary)] opacity-40" />
                                    <div className="w-full border-t border-[var(--border-primary)] opacity-40" />
                                    <div className="w-full border-t border-[var(--border-primary)] opacity-40" />
                                </div>
                                
                                {growthTrend.map((d, i) => {
                                    const heightPercent = `${Math.max(5, (d.registrations / maxGrowth) * 100)}%`;
                                    return (
                                        <div key={i} className="flex flex-col items-center flex-1 z-10 group">
                                            <div className="text-[10px] font-bold text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-1.5">
                                                {d.registrations}
                                            </div>
                                            <div
                                                style={{ height: heightPercent }}
                                                className="w-8 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg transition-all duration-500 hover:opacity-90"
                                            />
                                            <span className="text-[9px] font-semibold text-[var(--text-muted)] mt-2">
                                                {d.date}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Platform Actions Volume */}
                        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                <Activity size={16} className="text-purple-500" /> User Activity Volume (Last 7 Days)
                            </h3>
                            <div className="h-56 w-full flex items-end justify-between relative pt-6 px-4">
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-4">
                                    <div className="w-full border-t border-[var(--border-primary)] opacity-40" />
                                    <div className="w-full border-t border-[var(--border-primary)] opacity-40" />
                                    <div className="w-full border-t border-[var(--border-primary)] opacity-40" />
                                </div>
                                
                                {activityTrend.map((d, i) => {
                                    const heightPercent = `${Math.max(5, (d.actions / maxActivity) * 100)}%`;
                                    return (
                                        <div key={i} className="flex flex-col items-center flex-1 z-10 group">
                                            <div className="text-[10px] font-bold text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-1.5">
                                                {d.actions}
                                            </div>
                                            <div
                                                style={{ height: heightPercent }}
                                                className="w-8 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all duration-500 hover:opacity-90"
                                            />
                                            <span className="text-[9px] font-semibold text-[var(--text-muted)] mt-2">
                                                {d.date}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Engagement audit */}
                    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-5">
                            Core AI Modules Engagement
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { key: 'atsAnalysis', name: 'ATS Resume Analysis', color: 'bg-cyan-500', desc: 'Main resume evaluation' },
                                { key: 'rewrite', name: 'Resume Bullet Rewriter', color: 'bg-purple-500', desc: 'SaaS impact metric rewrites' },
                                { key: 'interview', name: 'Interview Coach Prep', color: 'bg-blue-500', desc: 'STAR-based response coaching' },
                                { key: 'coverLetter', name: 'Cover Letter Maker', color: 'bg-emerald-500', desc: 'AI custom job description matches' },
                                { key: 'roast', name: 'Resume Roast Critiques', color: 'bg-rose-500', desc: 'Recruiter-mode critiques' },
                                { key: 'skills', name: 'Learning Path Gap Checker', color: 'bg-amber-500', desc: 'Skill radar map generators' }
                            ].map(({ key, name, color, desc }) => {
                                const count = featureUsage[key] || 0;
                                const pct = Math.round((count / totalFeatureActions) * 100);
                                return (
                                    <div key={key} className="bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 space-y-3 shadow-inner">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-xs font-bold text-[var(--text-primary)]">{name}</h4>
                                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{desc}</p>
                                            </div>
                                            <span className="text-xs font-mono font-black text-[var(--text-secondary)]">{count}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold text-[var(--text-muted)]">
                                                <span>Usage Level</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-[var(--border-primary)] rounded-full overflow-hidden">
                                                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}

            {/* ── Tab 2: User Directory & Control Center ───────────────────────── */}
            {dashboardTab === 'users' && (
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--border-primary)] pb-4">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Users size={16} className="text-cyan-500" /> Platform Directory Controls
                        </h3>
                    </div>

                    {/* Filter, Sort and search parameters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="relative sm:col-span-2">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="input-field pl-10 py-2 text-xs rounded-xl border-[var(--border-primary)]"
                            />
                        </div>
                        
                        <div>
                            <select
                                value={roleFilter}
                                onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                className="input-field py-2 text-xs rounded-xl border-[var(--border-primary)]"
                            >
                                <option value="all">All Roles</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="founder">Founder</option>
                            </select>
                        </div>

                        <div>
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="input-field py-2 text-xs rounded-xl border-[var(--border-primary)]"
                            >
                                <option value="all">All States</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <select
                                value={verificationFilter}
                                onChange={e => { setVerificationFilter(e.target.value); setCurrentPage(1); }}
                                className="input-field py-2 text-xs rounded-xl border-[var(--border-primary)]"
                            >
                                <option value="all">All Verifications</option>
                                <option value="verified">Verified Profile</option>
                                <option value="unverified">Guest Account</option>
                            </select>
                        </div>

                        <div>
                            <select
                                value={sortBy}
                                onChange={e => { setSortBy(e.target.value); }}
                                className="input-field py-2 text-xs rounded-xl border-[var(--border-primary)]"
                            >
                                <option value="createdAt-desc">Newest First</option>
                                <option value="createdAt-asc">Oldest First</option>
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                                <option value="loginCount-desc">Most Logins</option>
                                <option value="lastLoginAt-desc">Recent Login</option>
                            </select>
                        </div>
                    </div>

                    {/* Table directory */}
                    <div className="overflow-x-auto border border-[var(--border-primary)]/50 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--bg-surface-secondary)] border-b border-[var(--border-primary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                    <th className="py-3 pl-4">Account Profile</th>
                                    <th className="py-3">Verification</th>
                                    <th className="py-3">Role Tier</th>
                                    <th className="py-3">Billing</th>
                                    <th className="py-3">Activity Status</th>
                                    <th className="py-3">State</th>
                                    <th className="py-3">Timestamps</th>
                                    <th className="py-3 text-center">Controls</th>
                                    <th className="py-3 pr-4 text-center">Removal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-primary)]/40 text-xs">
                                {currentUsers.length > 0 ? (
                                    currentUsers.map((u) => {
                                        const userStatus = u.status || 'active';
                                        const isUserVerified = !(u.email && u.email.startsWith('guest'));
                                        return (
                                            <tr key={u._id} className="hover:bg-slate-500/[0.02] transition-colors">
                                                <td className="py-4 pl-4 font-semibold text-[var(--text-primary)]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold text-[10px]">
                                                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                                        </div>
                                                        <div>
                                                            <div>{u.name}</div>
                                                            <div className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-max ${
                                                        isUserVerified ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                    }`}>
                                                        <ShieldCheck size={10} />
                                                        {isUserVerified ? 'Verified' : 'Guest'}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        u.role === 'founder' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                        u.role === 'admin' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                                        'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                    }`}>
                                                        {u.role || 'user'}
                                                    </span>
                                                </td>
                                                <td className="py-4 font-semibold text-[var(--text-secondary)] capitalize">
                                                    {u.plan || 'free'}
                                                </td>
                                                <td className="py-4">
                                                    <span className="flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                                                        {(() => {
                                                            if (!u.lastLoginAt) return <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Idle</>;
                                                            const diff = Date.now() - Date.parse(u.lastLoginAt);
                                                            if (diff < 7 * 24 * 60 * 60 * 1000) return <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active</>;
                                                            if (diff < 30 * 24 * 60 * 60 * 1000) return <><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Recent</>;
                                                            return <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Idle</>;
                                                        })()}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        userStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                        userStatus === 'suspended' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                        'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                    }`}>
                                                        {userStatus}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-[var(--text-muted)] text-[10px]">
                                                    <div>Reg: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</div>
                                                    <div className="mt-0.5">Last: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</div>
                                                </td>
                                                <td className="py-4 text-center space-y-1 md:space-y-0 md:space-x-1.5 flex items-center justify-center">
                                                    {/* View Profile */}
                                                    <button
                                                        onClick={() => setSelectedUserProfile(u)}
                                                        className="p-1 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white rounded-lg border border-cyan-500/20 transition-all duration-200"
                                                        title="View Full Profile Details"
                                                    >
                                                        <Eye size={12} />
                                                    </button>
                                                    {user.role === 'founder' ? (
                                                        u.role === 'founder' ? (
                                                            <span className="text-[10px] font-bold text-amber-500">SYSTEM OWNER</span>
                                                        ) : (
                                                            <>
                                                                {/* Promote/Demote */}
                                                                <button
                                                                    onClick={() => handleRoleChange(u._id, u.role || 'user')}
                                                                    disabled={actionLoading === u._id}
                                                                    className={`px-2 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all duration-200 border ${
                                                                        u.role === 'admin'
                                                                            ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20'
                                                                            : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20'
                                                                    }`}
                                                                >
                                                                    {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                                                                </button>

                                                                {/* Suspend / Reactivate */}
                                                                {userStatus === 'suspended' ? (
                                                                    <button
                                                                        onClick={() => handleStatusChange(u._id, 'active')}
                                                                        disabled={actionLoading === `${u._id}-status`}
                                                                        className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 font-bold text-[9px] uppercase tracking-wider"
                                                                    >
                                                                        Activate
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleStatusChange(u._id, 'suspended')}
                                                                        disabled={actionLoading === `${u._id}-status`}
                                                                        className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 font-bold text-[9px] uppercase tracking-wider"
                                                                    >
                                                                        Suspend
                                                                    </button>
                                                                )}
                                                            </>
                                                        )
                                                    ) : (
                                                        <span className="text-[9px] font-medium text-[var(--text-muted)] italic">Access Restricted</span>
                                                    )}
                                                </td>
                                                <td className="py-4 pr-4 text-center">
                                                    {user.role === 'founder' && u.role !== 'founder' ? (
                                                        <button
                                                            onClick={() => handleUserDelete(u._id)}
                                                            disabled={actionLoading === `${u._id}-delete`}
                                                            className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-500/20 transition-all duration-200"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] font-medium text-[var(--text-muted)] italic">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="py-8 text-center text-[var(--text-muted)] font-medium">No accounts matched the filtering options.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Navigation */}
                    <div className="flex justify-between items-center text-xs font-semibold pt-4">
                        <span className="text-[var(--text-muted)]">Showing page {currentPage} of {totalPages} ({sortedUsers.length} total entries)</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3.5 py-1.5 border border-[var(--border-primary)] rounded-lg hover:bg-[var(--bg-surface-secondary)] disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3.5 py-1.5 border border-[var(--border-primary)] rounded-lg hover:bg-[var(--bg-surface-secondary)] disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab 3: Security Audit Logs ──────────────────────────────────── */}
            {(dashboardTab === 'audit' || activeDrill === 'logins') && (
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--border-primary)] pb-4">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <ShieldCheck size={16} className="text-purple-500" /> Platform Security & Access Audits
                        </h3>
                        {activeDrill === 'logins' && (
                            <button onClick={() => setActiveDrill(null)} className="text-xs font-bold text-cyan-500 flex items-center gap-1">
                                <X size={14} /> Close Drilldown
                            </button>
                        )}
                    </div>

                    {/* Filter to show logins or administrative updates */}
                    <div className="overflow-x-auto border border-[var(--border-primary)]/50 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--bg-surface-secondary)] border-b border-[var(--border-primary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                    <th className="py-3.5 pl-4">Timestamp</th>
                                    <th className="py-3.5">Trigger Account</th>
                                    <th className="py-3.5">Action Event</th>
                                    <th className="py-3.5">Target Scope</th>
                                    <th className="py-3.5">IP Address</th>
                                    <th className="py-3.5">Agent Details</th>
                                    <th className="py-3.5 pr-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-primary)]/40 text-xs font-medium">
                                {(activeDrill === 'logins' ? loginHistoryLogs : auditLogs).length > 0 ? (
                                    (activeDrill === 'logins' ? loginHistoryLogs : auditLogs).map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-500/[0.02] transition-colors">
                                            <td className="py-4 pl-4 text-[var(--text-muted)] whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="py-4 font-semibold text-[var(--text-primary)]">
                                                {log.userEmail || 'system / visitor'}
                                            </td>
                                            <td className="py-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                    log.action.includes('SUCCESS') || log.action === 'ADMIN_UNLOCKED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                    log.action.includes('FAILED') || log.action.includes('SUSPENDED') ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                    'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                                }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-4 text-[var(--text-secondary)]">
                                                {log.targetUserEmail || '-'}
                                            </td>
                                            <td className="py-4 font-mono text-[10px] text-[var(--text-muted)]">
                                                {log.ipAddress || '::1'}
                                            </td>
                                            <td className="py-4 text-[var(--text-muted)] max-w-xs truncate" title={log.userAgent}>
                                                {parseUserAgent(log.userAgent)}
                                            </td>
                                            <td className="py-4 pr-4 font-mono text-[10px] text-[var(--text-secondary)] max-w-xs truncate">
                                                {log.details ? JSON.stringify(log.details) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-[var(--text-muted)]">No audit log entries recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Tab 4: System Console Combined logs ─────────────────────────── */}
            {(dashboardTab === 'system' || activeDrill === 'status') && (
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--border-primary)] pb-4">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Terminal size={16} className="text-emerald-500" /> Winston Log Console (Last 50 Entries)
                        </h3>
                        {activeDrill === 'status' && (
                            <button onClick={() => setActiveDrill(null)} className="text-xs font-bold text-cyan-500 flex items-center gap-1">
                                <X size={14} /> Close Drilldown
                            </button>
                        )}
                    </div>

                    <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-inner space-y-3">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b border-slate-800 pb-2.5">
                            <span>Diagnostic Output Stream</span>
                            <span className="flex items-center gap-1.5"><Play size={8} fill="currentColor" className="text-emerald-400" /> Live Feed</span>
                        </div>
                        <div className="font-mono text-[10px] leading-relaxed text-slate-300 max-h-[350px] overflow-y-auto space-y-1.5 scrollbar-thin">
                            {systemLogs.length > 0 ? (
                                systemLogs.map((logLine, idx) => (
                                    <div key={idx} className="hover:bg-slate-900/40 py-0.5 border-l border-transparent hover:border-slate-800 pl-2">
                                        {logLine}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-600 font-bold">Log stream is currently empty or file cannot be resolved.</div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Diagnostic Report */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 text-xs space-y-2.5">
                            <h4 className="font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-2 flex items-center gap-1.5">
                                <Server size={13} className="text-cyan-500" /> Telemetry Status
                            </h4>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)] font-medium">Uptime:</span>
                                <span className="font-mono font-bold text-[var(--text-primary)]">
                                    {Math.floor(analytics?.system?.uptime / 3600)}h {Math.floor((analytics?.system?.uptime % 3600) / 60)}m
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)] font-medium">Memory RSS:</span>
                                <span className="font-mono font-bold text-[var(--text-primary)]">{Math.round(analytics?.system?.memory?.rss / (1024 * 1024))} MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)] font-medium">Node.js Engine:</span>
                                <span className="font-mono font-bold text-[var(--text-primary)]">{analytics?.system?.nodeVersion}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)] font-medium">Database Node:</span>
                                <span className="font-mono font-bold text-[var(--text-primary)]">
                                    {analytics?.system?.mongoConnected ? 'MongoDB (Atlas)' : 'JSON File Fallback'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-2xl p-4 text-xs space-y-2.5">
                            <h4 className="font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-2 flex items-center gap-1.5">
                                <Key size={13} className="text-purple-500" /> Environment Keys
                            </h4>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)] font-medium">Groq API key:</span>
                                <span className={`font-bold uppercase text-[9px] px-1.5 rounded ${
                                    analytics?.system?.providers?.groq ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                    {analytics?.system?.providers?.groq ? 'Configured' : 'Missing'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)] font-medium">OpenRouter key:</span>
                                <span className={`font-bold uppercase text-[9px] px-1.5 rounded ${
                                    analytics?.system?.providers?.openRouter ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                    {analytics?.system?.providers?.openRouter ? 'Configured' : 'Missing'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-secondary)] font-medium">JWT session key:</span>
                                <span className="font-mono font-bold text-[var(--text-primary)]">ACTIVE</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DRILLDOWN VIEW: Active Users Configuration ──────────────────── */}
            {activeDrill === 'active' && (
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--border-primary)] pb-4">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Activity size={16} className="text-emerald-500" /> Active Engagement Configuration
                        </h3>
                        <button onClick={() => setActiveDrill(null)} className="text-xs font-bold text-cyan-500 flex items-center gap-1">
                            <X size={14} /> Close Drilldown
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
                        <span className="text-xs font-bold text-[var(--text-secondary)]">Active Range Threshold:</span>
                        <div className="flex gap-2">
                            {[7, 30, 90].map(days => (
                                <button
                                    key={days}
                                    onClick={() => setActiveDaysConfig(days)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                        activeDaysConfig === days
                                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:opacity-85'
                                    }`}
                                >
                                    Last {days} Days
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-[var(--border-primary)]/50 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--bg-surface-secondary)] border-b border-[var(--border-primary)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                    <th className="py-3 pl-4">Active User</th>
                                    <th className="py-3">Role</th>
                                    <th className="py-3">Logins count</th>
                                    <th className="py-3">Plan</th>
                                    <th className="py-3 pr-4 text-right">Last Login Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-primary)]/40 text-xs">
                                {activeUsersList.length > 0 ? (
                                    activeUsersList.map((u) => (
                                        <tr key={u._id} className="hover:bg-slate-500/[0.02] transition-colors">
                                            <td className="py-4 pl-4 font-semibold text-[var(--text-primary)]">
                                                <div>{u.name}</div>
                                                <div className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">{u.email}</div>
                                            </td>
                                            <td className="py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    u.role === 'founder' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    u.role === 'admin' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                                    'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                }`}>
                                                    {u.role || 'user'}
                                                </span>
                                            </td>
                                            <td className="py-4 font-semibold text-[var(--text-secondary)] pl-4">{u.loginCount || 0}</td>
                                            <td className="py-4 uppercase font-bold text-[var(--text-secondary)]">{u.plan || 'free'}</td>
                                            <td className="py-4 pr-4 text-right text-[var(--text-muted)] font-medium">
                                                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-[var(--text-muted)]">No users were active during this period.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── USER PROFILE VIEW OVERLAY MODAL ────────────────────────────── */}
            {selectedUserProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl p-6 shadow-2xl max-w-lg w-full relative overflow-hidden space-y-6">
                        {/* Decorative glows */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
                        
                        <div className="flex justify-between items-start border-b border-[var(--border-primary)] pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-500 font-black text-lg">
                                    {selectedUserProfile.name ? selectedUserProfile.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-[var(--text-primary)]">{selectedUserProfile.name}</h3>
                                    <p className="text-xs text-[var(--text-secondary)] font-medium">{selectedUserProfile.email}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedUserProfile(null)} 
                                className="p-1 hover:bg-[var(--bg-surface-secondary)] rounded-lg text-[var(--text-secondary)] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-xl p-3">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Role Tier</span>
                                <div className="font-bold text-[var(--text-primary)] capitalize">{selectedUserProfile.role || 'user'}</div>
                            </div>
                            <div className="space-y-1 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-xl p-3">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Plan Billing</span>
                                <div className="font-bold text-[var(--text-primary)] uppercase">{selectedUserProfile.plan || 'free'}</div>
                            </div>
                            <div className="space-y-1 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-xl p-3">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Account State</span>
                                <div className="font-bold text-[var(--text-primary)] capitalize">{selectedUserProfile.status || 'active'}</div>
                            </div>
                            <div className="space-y-1 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-xl p-3">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Verification Status</span>
                                <div className="font-bold text-[var(--text-primary)]">
                                    {selectedUserProfile.email && selectedUserProfile.email.startsWith('guest') ? 'Guest Account' : 'Verified Profile'}
                                </div>
                            </div>
                            <div className="space-y-1 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-xl p-3">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Login Count</span>
                                <div className="font-bold text-[var(--text-primary)]">{selectedUserProfile.loginCount || 0} logins</div>
                            </div>
                            <div className="space-y-1 bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-xl p-3">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Activity Status</span>
                                <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                                    {(() => {
                                        if (!selectedUserProfile.lastLoginAt) return <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Idle</>;
                                        const diff = Date.now() - Date.parse(selectedUserProfile.lastLoginAt);
                                        if (diff < 7 * 24 * 60 * 60 * 1000) return <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active</>;
                                        if (diff < 30 * 24 * 60 * 60 * 1000) return <><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Recent</>;
                                        return <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Idle</>;
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs bg-[var(--bg-surface-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)] font-medium">Registered On:</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                    {selectedUserProfile.createdAt ? new Date(selectedUserProfile.createdAt).toLocaleString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)] font-medium">Last Session:</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                    {selectedUserProfile.lastLoginAt ? new Date(selectedUserProfile.lastLoginAt).toLocaleString() : 'Never'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)] font-medium">ID Scope:</span>
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">{selectedUserProfile._id}</span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={() => setSelectedUserProfile(null)} 
                                className="px-5 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl text-xs font-bold transition-all duration-200"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
