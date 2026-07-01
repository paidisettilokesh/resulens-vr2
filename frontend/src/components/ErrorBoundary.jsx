import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service here
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <div className="max-w-md w-full bg-[var(--glass-bg)] border border-rose-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        {/* Decorative glows */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
                        
                        <div className="relative z-10 space-y-6">
                            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
                                <AlertTriangle size={32} />
                            </div>
                            
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Application Fault</h1>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    ResuLens encountered an unexpected error while rendering this view. Our team has been notified.
                                </p>
                            </div>

                            {process.env.NODE_ENV !== 'production' && this.state.error && (
                                <div className="text-left bg-[var(--bg-surface-secondary)] p-4 rounded-xl border border-[var(--border-primary)] overflow-auto max-h-48 text-[10px] font-mono text-[var(--text-muted)]">
                                    <div className="font-bold text-rose-400 mb-2">{this.state.error.toString()}</div>
                                    <div>{this.state.errorInfo?.componentStack}</div>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    this.setState({ hasError: false });
                                    window.location.reload();
                                }}
                                className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> Recover Session
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
