import React from 'react';

const ModernProfessional = ({ data }) => {
    return (
        <div className="font-sans text-slate-900 leading-relaxed bg-white text-black p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">
                        {data.personal.fullName || 'Your Name'}
                    </h1>
                    <div className="h-1 w-20 bg-blue-600 mt-4 mb-2 rounded-full" />
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{data.experience?.[0]?.role || 'Professional Portfolio'}</p>
                </div>
                <div className="text-right text-[10px] font-bold text-slate-500 leading-relaxed">
                    {data.personal.email && <div>{data.personal.email}</div>}
                    {data.personal.phone && <div>{data.personal.phone}</div>}
                    {data.personal.location && <div>{data.personal.location}</div>}
                </div>
            </div>
            
            <div className="h-px bg-slate-200 my-6" />
            
            <div className="grid grid-cols-[1fr_2.5fr] gap-10">
                <div className="space-y-8">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4 border-b border-slate-200 pb-2">Expertise</h4>
                        <div className="flex flex-col gap-2">
                            {(data.skills || '').split(',').filter(Boolean).map((s, i) => (
                                <span key={i} className="text-[10.5px] font-bold text-slate-700">{s.trim()}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4 border-b border-slate-200 pb-2">Education</h4>
                        {data.education.map(edu => (
                            <div key={edu.id} className="mb-5">
                                <h5 className="text-[11px] font-black text-slate-900">{edu.school}</h5>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">{edu.degree}</p>
                                <p className="text-[9.5px] text-slate-400 mt-1">{edu.year}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-8">
                    {data.personal.bio && (
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3 border-b border-slate-200 pb-2">Profile</h4>
                            <p className="text-[11.5px] leading-relaxed text-slate-700">{data.personal.bio}</p>
                        </div>
                    )}
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4 border-b border-slate-200 pb-2">Experience</h4>
                        <div className="space-y-7">
                            {data.experience.map(exp => (
                                <div key={exp.id} className="relative pl-4 border-l-2 border-blue-100">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h5 className="font-black text-[13px] text-slate-900">{exp.role}</h5>
                                        <span className="text-[10px] font-bold text-blue-600/80">{exp.period}</span>
                                    </div>
                                    <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide mb-2">{exp.company}</p>
                                    <div className="text-[11px] leading-relaxed text-slate-700 marker:text-blue-300">
                                        {exp.details.split('\n').map((bullet, i) => {
                                            if(!bullet.trim()) return null;
                                            return <p key={i} className="mb-1">• {bullet.replace(/^•\s*/, '')}</p>
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModernProfessional;
