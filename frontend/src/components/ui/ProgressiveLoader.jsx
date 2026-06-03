import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, CheckCircle, Fingerprint } from 'lucide-react';

const ProgressiveLoader = ({ active }) => {
    const [step, setStep] = useState(0);

    const steps = [
        { label: 'Deconstructing Document Text...', icon: Fingerprint, delay: 0 },
        { label: 'Calibrating Neural Parsing Models...', icon: Brain, delay: 2500 },
        { label: 'Scoring ATS & Market Compatibility...', icon: Sparkles, delay: 5000 },
        { label: 'Formulating Precision Gap Analyses...', icon: CheckCircle, delay: 7500 }
    ];

    useEffect(() => {
        if (!active) {
            setStep(0);
            return;
        }

        const intervals = steps.map((s, index) => {
            if (index === 0) return null;
            return setTimeout(() => {
                setStep(index);
            }, s.delay);
        });

        return () => {
            intervals.forEach(id => id && clearTimeout(id));
        };
    }, [active]);

    if (!active) return null;

    return (
        <div className="w-full max-w-xl mx-auto p-10 bg-[var(--bg-surface)] rounded-[3rem] border border-[var(--border-primary)] shadow-2xl flex flex-col items-center space-y-8 animate-fade-in relative overflow-hidden">
            {/* Decorative Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
            
            {/* Spinning Loader Container */}
            <div className="relative inline-block">
                <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-600 rounded-full animate-spin" />
                {React.createElement(steps[step].icon, {
                    size: 32,
                    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-600 animate-pulse"
                })}
            </div>

            {/* Step Content */}
            <div className="text-center w-full space-y-4">
                <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">
                    Neural Intelligence Audit
                </h3>
                <div className="h-6 overflow-hidden relative w-full">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={step}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest"
                        >
                            {steps[step].label}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            {/* Progressive bar design */}
            <div className="w-full h-2 bg-[var(--bg-surface-secondary)] rounded-full overflow-hidden border border-[var(--border-secondary)]">
                <motion.div 
                    className="h-full bg-cyan-600" 
                    initial={{ width: '0%' }}
                    animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </div>
            
            {/* Progression details */}
            <div className="flex justify-between w-full text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                <span>Phase {step + 1} of {steps.length}</span>
                <span>{Math.round(((step + 1) / steps.length) * 100)}% Complete</span>
            </div>
        </div>
    );
};

export default ProgressiveLoader;
