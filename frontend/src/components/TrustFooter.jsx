import React, { useState } from 'react';
import { Shield, FileText, AlertCircle, HelpCircle, X } from 'lucide-react';

const TrustModal = ({ isOpen, onClose, title, content }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--bg-app)] border border-[var(--border-primary)] rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
                <div className="p-6 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-surface)] rounded-t-3xl">
                    <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-500/10 rounded-full text-[var(--text-muted)] transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 text-sm text-[var(--text-secondary)] leading-relaxed space-y-4">
                    {content}
                </div>
            </div>
        </div>
    );
};

const TrustFooter = () => {
    const [activeModal, setActiveModal] = useState(null);

    const contentMap = {
        privacy: (
            <>
                <p><strong>Privacy Policy</strong></p>
                <p>Last Updated: {new Date().toLocaleDateString()}</p>
                <p>At ResuLens, your privacy and data security are our highest priority. We do not sell your personal information, resume data, or contact details to third parties.</p>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">1. Data Collection</h3>
                <p>We collect only the information necessary to provide our resume analysis and optimization services. This includes the text extracted from your uploaded resume files and the job descriptions you provide.</p>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">2. Data Security</h3>
                <p>Uploaded files are parsed in memory or temporarily stored securely, and are deleted immediately after the AI analysis completes. We employ enterprise-grade encryption for all data in transit and at rest.</p>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">3. Third-Party AI Models</h3>
                <p>We utilize trusted AI providers (Groq, OpenRouter) to process your text. These providers are strictly prohibited from using your data to train their foundational models under our enterprise agreements.</p>
            </>
        ),
        terms: (
            <>
                <p><strong>Terms of Service</strong></p>
                <p>Last Updated: {new Date().toLocaleDateString()}</p>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">1. Acceptance of Terms</h3>
                <p>By accessing and using ResuLens, you accept and agree to be bound by the terms and provision of this agreement.</p>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">2. Service Usage</h3>
                <p>Our platform is designed to assist you in optimizing your professional resume. You agree not to misuse the service, attempt to bypass rate limits, or use automated scripts to access our API.</p>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">3. Disclaimer of Warranties</h3>
                <p>ResuLens is provided "as is". While we strive for high accuracy, we do not guarantee employment, interviews, or specific ATS scores as a result of using our platform.</p>
            </>
        ),
        disclaimer: (
            <>
                <p><strong>AI Transparency & Disclaimer</strong></p>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-500 font-medium mb-4">
                    ResuLens utilizes Large Language Models (LLMs) to provide feedback and rewrite suggestions.
                </div>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">Review Required</h3>
                <p>While our models are highly tuned to avoid hallucinations and preserve truthful metrics, AI is not flawless. You are strictly advised to review, verify, and edit all AI-generated content before submitting your resume to employers.</p>
                <h3 className="font-bold text-[var(--text-primary)] mt-4">ATS Compatibility</h3>
                <p>Our ATS scoring engine simulates standard parser behaviors. However, there are thousands of proprietary ATS systems in the market, each with unique configurations. Our score is a highly accurate estimate, not a universal guarantee.</p>
            </>
        ),
        support: (
            <>
                <p><strong>Support & Contact</strong></p>
                <p>Need help navigating the platform or encountered an issue?</p>
                <div className="bg-[var(--bg-surface-secondary)] p-4 rounded-xl border border-[var(--border-primary)] mt-4">
                    <h3 className="font-bold text-[var(--text-primary)]">Email Support</h3>
                    <p className="mt-1">Contact our engineering team directly at: <a href="mailto:support@resulens.ai" className="text-cyan-500 font-bold hover:underline">support@resulens.ai</a></p>
                </div>
                <div className="bg-[var(--bg-surface-secondary)] p-4 rounded-xl border border-[var(--border-primary)] mt-4">
                    <h3 className="font-bold text-[var(--text-primary)]">Bug Reports</h3>
                    <p className="mt-1">If you found a bug or UI glitch, please report it via our GitHub repository or contact support.</p>
                </div>
            </>
        )
    };

    const titles = {
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        disclaimer: 'AI Disclaimer',
        support: 'Support & Help'
    };

    return (
        <>
            <footer className="w-full border-t border-[var(--border-primary)] mt-20 bg-[var(--bg-surface)] py-8 md:pl-20">
                <div className="container-custom mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                            <Shield size={16} className="text-cyan-500" />
                            <span className="text-xs font-bold tracking-widest uppercase text-[var(--text-primary)]">ResuLens Enterprise</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-6">
                            <button onClick={() => setActiveModal('privacy')} className="text-xs font-medium text-[var(--text-muted)] hover:text-cyan-500 flex items-center gap-1.5 transition-colors">
                                <FileText size={12} /> Privacy
                            </button>
                            <button onClick={() => setActiveModal('terms')} className="text-xs font-medium text-[var(--text-muted)] hover:text-cyan-500 flex items-center gap-1.5 transition-colors">
                                <FileText size={12} /> Terms
                            </button>
                            <button onClick={() => setActiveModal('disclaimer')} className="text-xs font-medium text-[var(--text-muted)] hover:text-amber-500 flex items-center gap-1.5 transition-colors">
                                <AlertCircle size={12} /> AI Disclaimer
                            </button>
                            <button onClick={() => setActiveModal('support')} className="text-xs font-medium text-[var(--text-muted)] hover:text-blue-500 flex items-center gap-1.5 transition-colors">
                                <HelpCircle size={12} /> Support
                            </button>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-medium">
                            &copy; {new Date().getFullYear()} ResuLens. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
            <TrustModal 
                isOpen={!!activeModal} 
                onClose={() => setActiveModal(null)}
                title={activeModal ? titles[activeModal] : ''}
                content={activeModal ? contentMap[activeModal] : null}
            />
        </>
    );
};

export default TrustFooter;
