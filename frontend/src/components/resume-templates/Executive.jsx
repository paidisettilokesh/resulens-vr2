import React from 'react';

const Executive = ({ data }) => {
    return (
        <div className="font-serif text-black leading-snug bg-white text-black p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="text-center pb-6 mb-8 border-t-4 border-b-4 border-black">
                <h1 className="text-3xl font-black uppercase tracking-[0.15em] mt-4 mb-2">
                    {data.personal.fullName || 'YOUR FULL NAME'}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-700 mb-4">
                    {[data.personal.location, data.personal.phone, data.personal.email].filter(Boolean).join('  ·  ')}
                </p>
            </div>
            {data.personal.bio && (
                <div className="mb-8">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-gray-800 border-b border-gray-300 pb-1">Executive Summary</h4>
                    <p className="text-[12px] leading-relaxed text-justify opacity-90 italic px-2">"{data.personal.bio}"</p>
                </div>
            )}
            <div className="mb-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-gray-800 border-b border-gray-300 pb-1">Career History</h4>
                <div className="space-y-6">
                    {data.experience.map(exp => (
                        <div key={exp.id}>
                            <div className="flex justify-between items-baseline">
                                <h5 className="font-black text-[14px] uppercase tracking-wide text-black">{exp.company}</h5>
                                <span className="text-[11px] font-bold text-gray-600">{exp.period}</span>
                            </div>
                            <p className="text-[12px] font-bold text-gray-800 italic mb-2">{exp.role}</p>
                            <div className="text-[11.5px] leading-relaxed text-justify opacity-90 pl-3 border-l border-gray-400">
                                {exp.details.split('\n').map((bullet, i) => {
                                    if(!bullet.trim()) return null;
                                    return <p key={i} className="mb-1">• {bullet.replace(/^•\s*/, '')}</p>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-300">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-gray-800">Education</h4>
                    {data.education.map(edu => (
                        <div key={edu.id} className="mb-4">
                            <h5 className="text-[11.5px] font-black uppercase">{edu.school}</h5>
                            <p className="text-[11px] font-bold opacity-80">{edu.degree} · {edu.year}</p>
                        </div>
                    ))}
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-gray-800">Core Expertise</h4>
                    <p className="text-[11.5px] leading-relaxed font-medium opacity-90">{data.skills || 'Add competencies above.'}</p>
                </div>
            </div>
        </div>
    );
};

export default Executive;
