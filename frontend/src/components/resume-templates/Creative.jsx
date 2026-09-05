import React from 'react';

const Creative = ({ data }) => {
    return (
        <div className="resume-sheet font-sans bg-white p-0 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px] flex">
            {/* Sidebar */}
            <div className="w-1/3 bg-slate-900 text-white p-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
                    {data.personal.fullName || 'Your Name'}
                </h1>
                <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-8">
                    {data.experience?.[0]?.role || 'Creative Professional'}
                </p>

                <div className="space-y-8">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-700 pb-2">Contact</h4>
                        <div className="text-xs space-y-2 text-slate-200">
                            {data.personal.email && <p className="text-slate-200">{data.personal.email}</p>}
                            {data.personal.phone && <p className="text-slate-200">{data.personal.phone}</p>}
                            {data.personal.location && <p className="text-slate-200">{data.personal.location}</p>}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-700 pb-2">Expertise</h4>
                        <div className="flex flex-col gap-2">
                            {(data.skills || '').split(',').filter(Boolean).map((s, i) => (
                                <span key={i} className="text-xs font-medium text-teal-300">{s.trim()}</span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-700 pb-2">Education</h4>
                        {data.education.map(edu => (
                            <div key={edu.id} className="mb-4">
                                <h5 className="text-xs font-semibold text-white leading-tight">{edu.school}</h5>
                                <p className="text-xs text-teal-400 mt-1">{edu.degree}</p>
                                <p className="text-xs text-slate-400 mt-1">{edu.year}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-2/3 p-10 bg-white text-slate-900">
                {data.personal.bio && (
                    <div className="mb-8">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-teal-500 inline-block"></span> Profile
                        </h4>
                        <p className="text-[11.5px] leading-relaxed text-slate-800">{data.personal.bio}</p>
                    </div>
                )}

                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-5 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-teal-500 inline-block"></span> Experience
                    </h4>
                    <div className="space-y-6">
                        {data.experience.map(exp => (
                            <div key={exp.id} className="relative">
                                <div className="absolute left-[-28px] top-1 w-2 h-2 rounded-full bg-slate-400"></div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <h5 className="font-bold text-sm text-slate-900">{exp.role}</h5>
                                    <span className="text-xs font-medium text-slate-600">{exp.period}</span>
                                </div>
                                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">{exp.company}</p>
                                <div className="text-[11px] leading-relaxed text-slate-800">
                                    {exp.details.split('\n').map((bullet, i) => {
                                        if(!bullet.trim()) return null;
                                        return <p key={i} className="mb-1 text-slate-800">• {bullet.replace(/^•\s*/, '')}</p>
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Creative;
