import React from 'react';

const Executive = ({ data }) => {
    return (
        <div className="resume-sheet font-serif leading-snug bg-white text-slate-900 p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="text-center pb-6 mb-8 border-t-4 border-b-4 border-slate-900">
                <h1 className="text-3xl font-bold uppercase tracking-wider mt-4 mb-2 text-slate-900">
                    {data.personal.fullName || 'YOUR FULL NAME'}
                </h1>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-700 mb-4">
                    {[data.personal.location, data.personal.phone, data.personal.email].filter(Boolean).join('  ·  ')}
                </p>
            </div>
            {data.personal.bio && (
                <div className="mb-8">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-900 border-b border-slate-300 pb-1">Executive Summary</h4>
                    <p className="text-[12px] leading-relaxed text-justify italic px-2 text-slate-800">"{data.personal.bio}"</p>
                </div>
            )}
            <div className="mb-8">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-900 border-b border-slate-300 pb-1">Career History</h4>
                <div className="space-y-6">
                    {data.experience.map(exp => (
                        <div key={exp.id}>
                            <div className="flex justify-between items-baseline">
                                <h5 className="font-bold text-sm uppercase tracking-wide text-slate-900">{exp.company}</h5>
                                <span className="text-xs font-semibold text-slate-600">{exp.period}</span>
                            </div>
                            <p className="text-[12px] font-semibold text-slate-700 italic mb-2">{exp.role}</p>
                            <div className="text-[11.5px] leading-relaxed text-justify pl-3 border-l-2 border-slate-300 text-slate-800">
                                {exp.details.split('\n').map((bullet, i) => {
                                    if(!bullet.trim()) return null;
                                    return <p key={i} className="mb-1 text-slate-800">• {bullet.replace(/^•\s*/, '')}</p>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300">
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-900">Education</h4>
                    {data.education.map(edu => (
                        <div key={edu.id} className="mb-4">
                            <h5 className="text-xs font-bold uppercase text-slate-900">{edu.school}</h5>
                            <p className="text-xs font-medium text-slate-600">{edu.degree} · {edu.year}</p>
                        </div>
                    ))}
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-900">Core Expertise</h4>
                    <p className="text-[11.5px] leading-relaxed font-medium text-slate-800">{data.skills || ''}</p>
                </div>
            </div>
        </div>
    );
};

export default Executive;
