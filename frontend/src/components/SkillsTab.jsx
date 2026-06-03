import React, { useState } from 'react';
import {
    BookOpen, Sparkles, Loader2, Target, Zap, Clock,
    ExternalLink, Library, Award, CheckCircle2,
    Code, Globe, TrendingUp, MapPin,
    Trophy, ChevronRight, FileSearch, ArrowRight,
    ShieldAlert, Play, Star, ChevronDown, CheckSquare, Square
} from 'lucide-react';
import { getJobLinks } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

const SkillsTab = ({ runFeature, skillsData, marketData, analysis, loading, selectedRole, location }) => {
    const [activePhase, setActivePhase] = useState('Beginner');
    const [simulatedSkills, setSimulatedSkills] = useState({});

    const jobLinks = getJobLinks(selectedRole, location || 'India');

    // Extract dynamic data from unified backend objects
    const demand = marketData?.marketInsights?.demand || "Steady";
    const growthDirection = marketData?.marketInsights?.growthDirection || "Stable Growth";

    // ── 1. SKILL GAP RADAR SCORES & COORDINATES ──────────────────────────────
    const calculateRadarScores = () => {
        const matched = (analysis?.jobMatchAnalysis?.skillMatch?.matched || []).map(s => s.toLowerCase());
        const missing = (analysis?.jobMatchAnalysis?.skillMatch?.missing || [])
            .concat(skillsData?.roadmap?.map(r => r.skill) || [])
            .map(s => s.toLowerCase());

        const domains = [
            { name: 'Frontend', keywords: ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'sass', 'tailwind', 'next.js', 'frontend', 'ui', 'ux', 'figma'] },
            { name: 'Backend', keywords: ['node', 'express', 'django', 'python', 'java', 'spring', 'go', 'golang', 'ruby', 'rails', 'backend', 'api', 'graphql', 'nest'] },
            { name: 'Database', keywords: ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'nosql', 'db', 'oracle', 'firebase', 'cassandra', 'database', 'prisma'] },
            { name: 'Cloud', keywords: ['aws', 'azure', 'gcp', 'cloud', 's3', 'ec2', 'lambda', 'serverless', 'cloudformation', 'iam'] },
            { name: 'DevOps', keywords: ['docker', 'kubernetes', 'ci/cd', 'jenkins', 'git', 'github', 'terraform', 'ansible', 'actions', 'devops', 'pipelines', 'linux'] },
            { name: 'AI/ML', keywords: ['machine learning', 'ai', 'deep learning', 'tensorflow', 'pytorch', 'python', 'scikit', 'pandas', 'numpy', 'nlp', 'llm', 'langchain'] },
            { name: 'DSA', keywords: ['dsa', 'algorithms', 'data structures', 'problem solving', 'c++', 'c', 'rust'] },
            { name: 'Security', keywords: ['security', 'cybersecurity', 'encryption', 'ssl', 'auth', 'oauth', 'jwt', 'penetration', 'firewall', 'cryptography'] },
        ];

        return domains.map(dom => {
            let matchedCount = 0;
            let missingCount = 0;

            dom.keywords.forEach(kw => {
                if (matched.includes(kw) || matched.some(m => m.includes(kw))) matchedCount++;
                if (missing.includes(kw) || missing.some(m => m.includes(kw))) missingCount++;
            });

            let score = 50; // Baseline
            if (matchedCount > 0) score += matchedCount * 20;
            if (missingCount > 0) score -= missingCount * 15;

            score = Math.max(15, Math.min(95, score));
            return { name: dom.name, score };
        });
    };

    const radarData = calculateRadarScores();
    const cx = 150;
    const cy = 150;
    const r = 90;
    const numPoints = radarData.length;

    const getCoordinates = (index, score) => {
        const angle = (index * (2 * Math.PI)) / numPoints - Math.PI / 2;
        const x = cx + r * (score / 100) * Math.cos(angle);
        const y = cy + r * (score / 100) * Math.sin(angle);
        return { x, y };
    };

    const pointsPath = radarData.map((d, i) => {
        const { x, y } = getCoordinates(i, d.score);
        return `${x},${y}`;
    }).join(' ');

    // ── 2. AI CAREER ROADMAP STAGES ──────────────────────────────────────────
    const experienceScore = analysis?.experienceScore || 45;
    const roadmapStages = [
        { id: 1, name: 'Student / Graduate', minScore: 0, maxScore: 30, skills: 'Foundational Programming, Basic Git, HTML/CSS', hours: '120h', desc: 'Acquire core syntax, software development lifecycle basics, and coding fundamentals.' },
        { id: 2, name: 'Internship Ready', minScore: 31, maxScore: 50, skills: 'Version Control, Basic Databases, Frontend Frameworks', hours: '180h', desc: 'Build portfolio projects, understand REST APIs, and master basic collaboration.' },
        { id: 3, name: 'Junior Developer', minScore: 51, maxScore: 70, skills: 'MVC Architecture, Testing, Intermediate Backend, SQL', hours: '300h', desc: 'Develop core features, write unit tests, and implement stable database models.' },
        { id: 4, name: 'Software Engineer', minScore: 71, maxScore: 85, skills: 'System Design, CI/CD, Cloud Deployment, Performance', hours: '500h', desc: 'Optimize load times, architect scalable systems, and configure cloud pipelines.' },
        { id: 5, name: 'Senior / Lead Architect', minScore: 86, maxScore: 120, skills: 'Distributed Systems, Leadership, Tech Stack Design, Security', hours: '800h', desc: 'Lead engineering teams, set development standards, and design robust architectures.' }
    ];

    let currentStageIndex = 0;
    for (let i = 0; i < roadmapStages.length; i++) {
        if (experienceScore >= roadmapStages[i].minScore && experienceScore <= roadmapStages[i].maxScore) {
            currentStageIndex = i;
            break;
        }
    }
    if (experienceScore > 100) currentStageIndex = 4;

    // ── 3. ATS IMPACT PREDICTOR & SIMULATOR ──────────────────────────────────
    const predictorItems = [];
    (skillsData?.roadmap || []).forEach((item, idx) => {
        let boost = 3;
        if (item.priority === 'High') boost = 8;
        else if (item.priority === 'Medium') boost = 5;

        predictorItems.push({
            id: `skill_${idx}`,
            text: `Learn ${item.skill}`,
            reason: `Bypasses automatic parser filters and adds relevant ${item.priority} keyword.`,
            boost
        });
    });

    const suggestions = analysis?.atsAnalysis?.suggestions || [];
    suggestions.slice(0, 2).forEach((s, idx) => {
        predictorItems.push({
            id: `format_${idx}`,
            text: s,
            reason: "Improves structural compatibility and bullet-point parsing.",
            boost: 4
        });
    });

    // Default simulator tasks if skillsData is not generated yet
    if (predictorItems.length === 0) {
        predictorItems.push(
            { id: 'def_1', text: 'Integrate target role keywords (e.g. Docker, AWS)', reason: 'Fills key technical requirements.', boost: 8 },
            { id: 'def_2', text: 'Quantify impact in professional bullets', reason: 'Increases parsing visibility score.', boost: 6 },
            { id: 'def_3', text: 'Standardize section headers', reason: 'Bypasses layout filtering blocks.', boost: 3 }
        );
    }

    const baseAtsScore = analysis?.atsScore || 65;
    const simulatedPoints = Object.keys(simulatedSkills).reduce((acc, key) => {
        if (simulatedSkills[key]) {
            const item = predictorItems.find(p => p.id === key);
            return acc + (item ? item.boost : 0);
        }
        return acc;
    }, 0);
    const simulatedScore = Math.min(100, baseAtsScore + simulatedPoints);

    const toggleSimulation = (id) => {
        setSimulatedSkills(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // ── 4. CURATED FREE LEARNING HUB MAPPER ──────────────────────────────────
    const getPlatformDetails = (source) => {
        const s = source?.toLowerCase() || '';
        if (s.includes('coursera')) return { name: 'Coursera', url: 'https://www.coursera.org', color: 'text-blue-500 bg-blue-500/10' };
        if (s.includes('udemy')) return { name: 'Udemy', url: 'https://www.udemy.com', color: 'text-purple-500 bg-purple-500/10' };
        if (s.includes('edx')) return { name: 'edX', url: 'https://www.edx.org', color: 'text-red-500 bg-red-500/10' };
        if (s.includes('freecodecamp') || s.includes('camp') || s.includes('free')) return { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org', color: 'text-amber-500 bg-amber-500/10' };
        if (s.includes('odin') || s.includes('project')) return { name: 'The Odin Project', url: 'https://www.theodinproject.com', color: 'text-emerald-500 bg-emerald-500/10' };
        if (s.includes('harvard') || s.includes('cs50')) return { name: 'Harvard CS50', url: 'https://cs50.harvard.edu/x', color: 'text-rose-500 bg-rose-500/10' };
        if (s.includes('microsoft')) return { name: 'Microsoft Learn', url: 'https://learn.microsoft.com', color: 'text-cyan-500 bg-cyan-500/10' };
        if (s.includes('aws')) return { name: 'AWS Skill Builder', url: 'https://aws.amazon.com/training', color: 'text-orange-500 bg-orange-500/10' };
        if (s.includes('google')) return { name: 'Google Skillshop', url: 'https://skillshop.google.com', color: 'text-indigo-500 bg-indigo-500/10' };
        return { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org', color: 'text-cyan-500 bg-cyan-500/10' };
    };

    const getEnhancedCourseDetails = (skill, priority) => {
        const s = skill.toLowerCase();
        let title = `${skill} Foundation Course`;
        let duration = '8 Hours';
        let difficulty = 'Beginner';

        if (s.includes('react')) {
            title = 'React & Redux Certification Course';
            duration = '16 Hours';
            difficulty = 'Intermediate';
        } else if (s.includes('docker')) {
            title = 'Docker & Containerization Essentials';
            duration = '6 Hours';
            difficulty = 'Beginner';
        } else if (s.includes('kubernetes')) {
            title = 'Kubernetes Basics & Microservices Deployment';
            duration = '12 Hours';
            difficulty = 'Intermediate';
        } else if (s.includes('node') || s.includes('express')) {
            title = 'Node.js & Backend Architecture Guide';
            duration = '18 Hours';
            difficulty = 'Intermediate';
        } else if (s.includes('aws') || s.includes('cloud')) {
            title = 'AWS Cloud Practitioner Certification Prep';
            duration = '20 Hours';
            difficulty = 'Beginner';
        } else if (s.includes('python')) {
            title = 'Python for Web Development & Automation';
            duration = '10 Hours';
            difficulty = 'Beginner';
        } else if (s.includes('dsa') || s.includes('algorithm') || s.includes('structures')) {
            title = 'Data Structures & Algorithms Course';
            duration = '40 Hours';
            difficulty = 'Advanced';
        } else if (s.includes('sql') || s.includes('postgres') || s.includes('database')) {
            title = 'Relational Databases & SQL Masterclass';
            duration = '14 Hours';
            difficulty = 'Intermediate';
        }

        if (priority === 'High') difficulty = 'Advanced';

        return { title, duration, difficulty };
    };

    return (
        <div className="space-y-12 animate-soft-fade pb-20">
            {/* HERO HEADER */}
            <div className="text-center relative p-12 rounded-[4rem] bg-gradient-to-r from-cyan-50 to-emerald-50 dark:from-cyan-950/20 dark:to-emerald-950/20 text-[var(--text-primary)] overflow-hidden shadow-xl border border-cyan-100 dark:border-cyan-500/20 mb-12">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-x-20 translate-y-20 blur-3xl" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-cyan-100 dark:border-cyan-500/20 mb-6 font-bold text-cyan-600 dark:text-cyan-400 shadow-sm">
                        <Sparkles size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Personalized Career Intelligence</span>
                    </div>
                    <h2 className="text-5xl font-bold mb-4 tracking-tighter text-[var(--text-primary)]">
                        Learning Path & <span className="text-emerald-600 dark:text-emerald-400 font-serif italic">Market Insights</span>
                    </h2>
                    <p className="text-[var(--text-secondary)] text-lg font-medium max-w-2xl mx-auto italic">
                        Strategic skill-gap analysis, zero-cost education pathways, and hiring market dynamics for{' '}
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold">{selectedRole || 'your target position'}</span>.
                    </p>

                    {!skillsData && (
                        <button
                            onClick={() => runFeature('skills')}
                            disabled={loading}
                            className="mt-10 btn-primary !px-16 !py-5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700 shadow-xl shadow-cyan-100 dark:shadow-none active:scale-95 border-none flex items-center gap-3 mx-auto"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <FileSearch size={20} /> Generate Neural Growth Plan
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {loading && !skillsData && (
                <div className="text-center py-20 flex flex-col items-center justify-center space-y-6">
                    <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-600 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] animate-pulse">Consolidating Growth & Market Data...</p>
                </div>
            )}

            {skillsData && (
                <div className="space-y-12 animate-fade-in">
                    {/* DUAL-ROW RADAR & TIMELINE HIGHLIGHTS */}
                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* FEATURE 1: SKILL GAP RADAR (Left 5 Cols) */}
                        <div className="lg:col-span-5 bg-[var(--bg-surface)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-xl flex flex-col justify-between items-center relative overflow-hidden">
                            <div className="w-full flex justify-between items-center mb-4">
                                <h4 className="text-sm font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Target size={18} /> Skill Gap Radar
                                </h4>
                                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider bg-[var(--bg-surface-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-secondary)]">
                                    Dynamic Domain Audit
                                </span>
                            </div>

                            {/* SVG Radar Chart */}
                            <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                                <svg width="300" height="300" className="overflow-visible">
                                    {/* Grid Lines */}
                                    {[25, 50, 75, 100].map((level, idx) => {
                                        const levelPoints = radarData.map((d, i) => {
                                            const { x, y } = getCoordinates(i, level);
                                            return `${x},${y}`;
                                        }).join(' ');

                                        return (
                                            <polygon
                                                key={idx}
                                                points={levelPoints}
                                                fill="none"
                                                stroke="var(--border-secondary)"
                                                strokeWidth="1"
                                                strokeDasharray={idx === 3 ? "0" : "3,3"}
                                            />
                                        );
                                    })}

                                    {/* Axis Lines */}
                                    {radarData.map((d, i) => {
                                        const outer = getCoordinates(i, 100);
                                        return (
                                            <line
                                                key={i}
                                                x1={cx}
                                                y1={cy}
                                                x2={outer.x}
                                                y2={outer.y}
                                                stroke="var(--border-secondary)"
                                                strokeWidth="1"
                                            />
                                        );
                                    })}

                                    {/* Vertex Labels */}
                                    {radarData.map((d, i) => {
                                        const { x, y } = getCoordinates(i, 115);
                                        return (
                                            <text
                                                key={i}
                                                x={x}
                                                y={y}
                                                textAnchor="middle"
                                                alignmentBaseline="middle"
                                                className="text-[10px] font-black fill-[var(--text-primary)] uppercase tracking-wider"
                                            >
                                                {d.name}
                                            </text>
                                        );
                                    })}

                                    {/* The Filled Active Polygon */}
                                    <polygon
                                        points={pointsPath}
                                        fill="rgba(6, 182, 212, 0.2)"
                                        stroke="rgba(6, 182, 212, 0.7)"
                                        strokeWidth="2.5"
                                        className="transition-all duration-700 ease-out"
                                    />

                                    {/* Score Nodes */}
                                    {radarData.map((d, i) => {
                                        const { x, y } = getCoordinates(i, d.score);
                                        return (
                                            <circle
                                                key={i}
                                                cx={x}
                                                cy={y}
                                                r="4"
                                                fill="var(--bg-surface)"
                                                stroke="rgba(6, 182, 212, 0.8)"
                                                strokeWidth="2"
                                                className="cursor-pointer hover:r-6 transition-all duration-300"
                                            />
                                        );
                                    })}
                                </svg>
                            </div>

                            <p className="text-[10px] text-[var(--text-muted)] font-semibold text-center italic mt-4 max-w-xs leading-relaxed">
                                Strengths are projected outward (100%). Inner vertices identify critical domain gaps requiring roadmap upskilling.
                            </p>
                        </div>

                        {/* FEATURE 2: AI CAREER ROADMAP (Right 7 Cols) */}
                        <div className="lg:col-span-7 bg-[var(--bg-surface)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-xl flex flex-col justify-between relative overflow-hidden">
                            <div className="w-full flex justify-between items-center mb-6">
                                <h4 className="text-sm font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Trophy size={18} /> AI Career Roadmap
                                </h4>
                                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider bg-[var(--bg-surface-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-secondary)]">
                                    Current Experience Track: {experienceScore}%
                                </span>
                            </div>

                            <div className="relative pl-6 border-l-2 border-[var(--border-secondary)] space-y-6 flex-grow">
                                {roadmapStages.map((stage, idx) => {
                                    const isCompleted = idx < currentStageIndex;
                                    const isActive = idx === currentStageIndex;
                                    const isLocked = idx > currentStageIndex;

                                    return (
                                        <div key={stage.id} className="relative group">
                                            {/* Node indicator */}
                                            <div className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-[var(--bg-surface)] flex items-center justify-center transition-all ${
                                                isCompleted 
                                                ? 'bg-emerald-500' 
                                                : isActive 
                                                ? 'bg-cyan-500 animate-pulse scale-110' 
                                                : 'bg-[var(--border-primary)]'
                                            }`} />

                                            <div className={`p-4 rounded-2xl border transition-all ${
                                                isActive 
                                                ? 'bg-cyan-500/5 border-cyan-500/40 ring-1 ring-cyan-500/10' 
                                                : isCompleted
                                                ? 'bg-emerald-500/5 border-emerald-500/10 opacity-80'
                                                : 'bg-[var(--bg-surface-secondary)] border-[var(--border-secondary)] opacity-60'
                                            }`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h5 className="font-black text-sm text-[var(--text-primary)]">
                                                        {stage.name}
                                                    </h5>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                                        isCompleted 
                                                        ? 'text-emerald-600 bg-emerald-500/10' 
                                                        : isActive 
                                                        ? 'text-cyan-600 bg-cyan-500/10' 
                                                        : 'text-[var(--text-muted)] bg-[var(--border-primary)]'
                                                    }`}>
                                                        {isCompleted ? '✓ Completed' : isActive ? '● Active' : '🔒 Locked'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2 font-medium">
                                                    {stage.desc}
                                                </p>
                                                {isActive && (
                                                    <div className="pt-2 border-t border-cyan-500/15 grid grid-cols-2 gap-4 text-[10px]">
                                                        <div>
                                                            <span className="font-bold text-cyan-600 dark:text-cyan-400 block uppercase tracking-wider">Required skills:</span>
                                                            <span className="text-[var(--text-primary)] font-semibold">{stage.skills}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-bold text-cyan-600 dark:text-cyan-400 block uppercase tracking-wider">Estimated prep time:</span>
                                                            <span className="text-[var(--text-primary)] font-semibold">{stage.hours} to next rank</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ATS PREDICTOR & LEARNING PLAN SPLIT */}
                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                        {/* FEATURE 3: ATS IMPACT PREDICTOR (Left 4 Cols) */}
                        <div className="lg:col-span-4 bg-[var(--bg-surface)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-xl space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <TrendingUp size={18} /> ATS Impact Predictor
                                </h4>
                            </div>

                            {/* Simulated score widget */}
                            <div className="bg-[var(--bg-surface-secondary)] p-6 rounded-2xl border border-[var(--border-secondary)] text-center space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Simulated ATS Score</span>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-4xl font-black text-[var(--text-primary)]">{simulatedScore}%</span>
                                    {simulatedPoints > 0 && (
                                        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">+{simulatedPoints} Points</span>
                                    )}
                                </div>
                                <div className="w-full h-2 bg-[var(--border-primary)] rounded-full overflow-hidden border border-[var(--border-secondary)]">
                                    <div className="h-full bg-cyan-600 transition-all duration-500" style={{ width: `${simulatedScore}%` }} />
                                </div>
                                <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-wider block">
                                    Baseline: {baseAtsScore}% | Simulated gains: +{simulatedPoints}
                                </span>
                            </div>

                            <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed italic border-l border-cyan-500/20 pl-3">
                                Check specific action boxes below to simulate how upskilling and formatting corrections boost your score on ATS parsers.
                            </p>

                            <div className="space-y-3">
                                {predictorItems.map((item) => {
                                    const isChecked = !!simulatedSkills[item.id];
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => toggleSimulation(item.id)}
                                            className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                                                isChecked
                                                ? 'bg-cyan-500/5 border-cyan-500/30'
                                                : 'bg-[var(--bg-surface-secondary)] border-[var(--border-secondary)] hover:border-cyan-500/20'
                                            }`}
                                        >
                                            <div className="mt-0.5 shrink-0 text-cyan-600">
                                                {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="text-[11px] font-black text-[var(--text-primary)] leading-tight">{item.text}</span>
                                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                                                        +{item.boost} PTS
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-[var(--text-muted)] font-medium leading-normal mt-1">{item.reason}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* FEATURE 4: CURATED FREE LEARNING HUB (Right 8 Cols) */}
                        <div className="lg:col-span-8 space-y-6">
                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                                <BookOpen size={18} className="text-cyan-500" />
                                Curated Free Learning Hub
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-6">
                                {skillsData.roadmap?.map((item, idx) => {
                                    const platform = getPlatformDetails(item.learningSource);
                                    const course = getEnhancedCourseDetails(item.skill, item.priority);
                                    let boost = 3;
                                    if (item.priority === 'High') boost = 8;
                                    else if (item.priority === 'Medium') boost = 5;

                                    return (
                                        <div
                                            key={idx}
                                            className="bg-[var(--bg-surface)] p-6 rounded-[2rem] border border-[var(--border-primary)] shadow-sm hover:shadow-xl hover:border-cyan-200 transition-all flex flex-col justify-between group relative overflow-hidden"
                                        >
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start gap-2">
                                                    <a 
                                                        href={platform.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${platform.color}`}
                                                    >
                                                        {platform.name}
                                                    </a>
                                                    <span className="px-2.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                                                        +{boost} ATS Impact
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block mb-0.5">
                                                        Focus: {item.skill}
                                                    </span>
                                                    <h5 className="font-black text-base text-[var(--text-primary)] leading-tight mb-2 group-hover:text-cyan-600 transition-colors">
                                                        {course.title}
                                                    </h5>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-[10px] pb-4 border-b border-[var(--border-secondary)]">
                                                    <div>
                                                        <span className="text-[9px] text-[var(--text-muted)] font-black uppercase block tracking-wider">Duration:</span>
                                                        <span className="font-bold text-[var(--text-primary)]">{course.duration}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-[var(--text-muted)] font-black uppercase block tracking-wider">Level:</span>
                                                        <span className="font-bold text-[var(--text-primary)]">{course.difficulty}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-black uppercase tracking-widest block">
                                                        Practice validation
                                                    </span>
                                                    <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-normal italic">
                                                        "{item.projectIdea}"
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-6">
                                                <a
                                                    href={item.sourceUrl || platform.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 shadow-md uppercase tracking-wider"
                                                >
                                                    <ExternalLink size={12} /> Start Learning
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Fallback empty state prompt */}
                                {(skillsData.roadmap || []).length === 0 && (
                                    <div className="sm:col-span-2 text-center p-12 bg-[var(--bg-surface-secondary)] border border-dashed border-[var(--border-primary)] rounded-[2rem]">
                                        <Trophy size={40} className="mx-auto text-cyan-600 mb-4 opacity-40" />
                                        <h5 className="font-bold text-sm text-[var(--text-primary)]">Curriculum Generation Ready</h5>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-1">Please launch the Neural Growth Plan above to populate free learning recommendations.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* OPPORTUNITIES & SIDEBAR GEOGRAPHY */}
                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                        {/* REGIONAL DIAGNOSTICS */}
                        <div className="lg:col-span-5 bg-[var(--bg-surface-secondary)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-xl space-y-6">
                            <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em] pb-4 border-b border-[var(--border-secondary)] flex items-center gap-2">
                                <Globe size={18} className="text-cyan-600" />
                                Regional Diagnostics
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-primary)] space-y-2 shadow-sm">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Target Geography</span>
                                    <div className="flex items-center gap-2 font-black text-cyan-600 dark:text-cyan-400">
                                        <MapPin size={16} />
                                        <span>{location || 'Global / Remote'}</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-primary)] space-y-2 shadow-sm">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Hiring Pulse</span>
                                    <div className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400">
                                        <TrendingUp size={16} />
                                        <span>{demand} Demand</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[var(--text-secondary)] text-xs font-semibold leading-relaxed italic">
                                Analysis for {location || 'global remote'} shows a {demand.toLowerCase() === 'high' ? 'highly competitive' : 'steady'} hiring market. Role sustainability indicator: {growthDirection.toLowerCase()}.
                            </p>
                        </div>

                        {/* LIVE HIRING PORTS */}
                        <div className="lg:col-span-7 bg-gradient-to-br from-cyan-600 to-cyan-700 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                                <Zap size={140} />
                            </div>
                            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 h-full">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-cyan-100 uppercase tracking-widest block">
                                        Hiring Channels
                                    </span>
                                    <h4 className="text-2xl font-black tracking-tight">Active Opportunity Links</h4>
                                    <p className="text-xs text-cyan-50 font-medium opacity-85 leading-relaxed italic max-w-sm">
                                        "Connecting your profile to active hiring portals configured for {selectedRole} tracks in {location}."
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 shrink-0 w-full sm:w-auto">
                                    {jobLinks.slice(0, 4).map((link, i) => (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all text-center flex flex-col items-center justify-center gap-1 group/item"
                                        >
                                            <span className="text-[9px] font-black uppercase text-cyan-100 tracking-wider">
                                                {link.platform}
                                            </span>
                                            <ArrowRight size={12} className="text-white group-hover/item:translate-x-1 transition-transform" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default SkillsTab;
