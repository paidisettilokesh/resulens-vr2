import React from 'react';

const Graduate = ({ data }) => {
    return (
        <div className="resume-sheet font-sans text-slate-900 leading-normal bg-white p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="text-center pb-4 mb-6">
                <h1 className="text-3xl font-bold text-emerald-800 tracking-tight">{data.personal.fullName || 'Your Name'}</h1>
                <p className="text-xs font-medium text-slate-600 mt-2">
                    {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' | ')}
                </p>
            </div>
            
            <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800 border-b-2 border-emerald-200 pb-1 mb-3">Education</h4>
                {data.education.map(edu => (
                    <div key={edu.id} className="mb-3">
                        <div className="flex justify-between items-baseline">
                            <h5 className="font-semibold text-sm text-slate-900">{edu.school}</h5>
                            <span className="text-xs font-medium text-emerald-700">{edu.year}</span>
                        </div>
                        <p className="text-xs text-slate-700 italic">{edu.degree}</p>
                    </div>
                ))}
            </div>

            <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800 border-b-2 border-emerald-200 pb-1 mb-3">Academic & Personal Projects</h4>
                <div className="space-y-4">
                    {data.experience.map(exp => (
                        <div key={exp.id}>
                            <div className="flex justify-between items-baseline">
                                <span className="font-semibold text-sm text-slate-900">{exp.role}</span>
                                <span className="text-xs font-medium text-emerald-700">{exp.period}</span>
                            </div>
                            <p className="text-xs font-medium text-slate-600 mb-1">{exp.company}</p>
                            <div className="text-[11.5px] leading-relaxed text-slate-800 pl-3 border-l-2 border-emerald-200">
                                {exp.details.split('\n').map((bullet, i) => {
                                    if(!bullet.trim()) return null;
                                    return <p key={i} className="mb-1 text-slate-800">• {bullet.replace(/^•\s*/, '')}</p>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {data.personal.bio && (
                <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800 border-b-2 border-emerald-200 pb-1 mb-2">Profile & Objectives</h4>
                    <p className="text-[11.5px] leading-relaxed text-slate-800">{data.personal.bio}</p>
                </div>
            )}

            <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800 border-b-2 border-emerald-200 pb-1 mb-2">Technical & Soft Skills</h4>
                <p className="text-[11.5px] text-slate-800 leading-relaxed font-medium">
                    {data.skills || ''}
                </p>
            </div>
        </div>
    );
};

export default Graduate;
