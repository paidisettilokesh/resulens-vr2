import React from 'react';

const ProfessionalATS = ({ data }) => {
    return (
        <div className="resume-sheet font-sans text-slate-900 leading-normal text-[12px] bg-white p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="text-center pb-4 mb-4 border-b-2 border-slate-900">
                <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900">{data.personal.fullName || 'Your Name'}</h1>
                <p className="text-xs text-slate-700 mt-2 font-medium">
                    {[data.personal.email, data.personal.phone, data.personal.location, data.personal.linkedin].filter(Boolean).join(' | ')}
                </p>
            </div>
            
            {data.personal.bio && (
                <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase border-b border-slate-300 pb-1 mb-2 text-slate-900 tracking-wider">Professional Summary</h4>
                    <p className="text-[11px] leading-relaxed text-slate-800 text-justify">{data.personal.bio}</p>
                </div>
            )}

            <div className="mb-4">
                <h4 className="text-xs font-bold uppercase border-b border-slate-300 pb-1 mb-3 text-slate-900 tracking-wider">Work Experience</h4>
                <div className="space-y-4">
                    {data.experience.map(exp => (
                        <div key={exp.id}>
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-sm text-slate-900">{exp.role}</span>
                                <span className="text-xs text-slate-700 font-medium">{exp.period}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 mb-1">{exp.company}</p>
                            <div className="text-[11px] leading-relaxed text-slate-800 pl-3">
                                {exp.details.split('\n').map((bullet, i) => {
                                    if(!bullet.trim()) return null;
                                    return <p key={i} className="mb-1 text-slate-800">• {bullet.replace(/^•\s*/, '')}</p>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <h4 className="text-xs font-bold uppercase border-b border-slate-300 pb-1 mb-3 text-slate-900 tracking-wider">Education</h4>
                {data.education.map(edu => (
                    <div key={edu.id} className="flex justify-between mb-2">
                        <div>
                            <p className="font-bold text-xs text-slate-900">{edu.school}</p>
                            <p className="text-xs text-slate-700">{edu.degree}</p>
                        </div>
                        <span className="text-xs text-slate-700 font-medium">{edu.year}</span>
                    </div>
                ))}
            </div>

            <div>
                <h4 className="text-xs font-bold uppercase border-b border-slate-300 pb-1 mb-2 text-slate-900 tracking-wider">Core Skills</h4>
                <p className="text-[11px] text-slate-800 leading-relaxed">
                    {data.skills || ''}
                </p>
            </div>
        </div>
    );
};

export default ProfessionalATS;
