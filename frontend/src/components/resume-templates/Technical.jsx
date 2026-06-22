import React from 'react';

const Technical = ({ data }) => {
    return (
        <div className="font-mono text-slate-800 leading-normal bg-white text-black p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="border-b-4 border-indigo-600 pb-4 mb-6">
                <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">
                    {data.personal.fullName || 'developer_name'}
                </h1>
                <p className="text-[11px] font-bold text-indigo-600 mt-1 uppercase tracking-widest">
                    {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' | ')}
                </p>
            </div>

            <div className="mb-6">
                <h4 className="text-[12px] font-bold uppercase bg-slate-100 px-2 py-1 mb-3 text-slate-900 inline-block">{'<Technical_Skills />'}</h4>
                <div className="text-[11px] text-slate-800 leading-relaxed pl-2 border-l-2 border-indigo-200">
                    {data.skills || 'Add your skills above'}
                </div>
            </div>

            <div className="mb-6">
                <h4 className="text-[12px] font-bold uppercase bg-slate-100 px-2 py-1 mb-3 text-slate-900 inline-block">{'<Experience />'}</h4>
                <div className="space-y-6">
                    {data.experience.map(exp => (
                        <div key={exp.id}>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="font-black text-[13px] text-slate-900">{exp.role} <span className="text-indigo-600 font-normal">@ {exp.company}</span></span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{exp.period}</span>
                            </div>
                            <div className="text-[11px] leading-relaxed text-slate-700 pl-4 mt-2">
                                {exp.details.split('\n').map((bullet, i) => {
                                    if(!bullet.trim()) return null;
                                    return <div key={i} className="mb-1 flex gap-2"><span className="text-indigo-400">»</span> <span className="flex-1">{bullet.replace(/^•\s*/, '')}</span></div>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {data.personal.bio && (
                <div className="mb-6">
                    <h4 className="text-[12px] font-bold uppercase bg-slate-100 px-2 py-1 mb-3 text-slate-900 inline-block">{'<About />'}</h4>
                    <p className="text-[11px] leading-relaxed text-slate-800 pl-2 border-l-2 border-indigo-200">{data.personal.bio}</p>
                </div>
            )}

            <div className="mb-6">
                <h4 className="text-[12px] font-bold uppercase bg-slate-100 px-2 py-1 mb-3 text-slate-900 inline-block">{'<Education />'}</h4>
                {data.education.map(edu => (
                    <div key={edu.id} className="flex justify-between mb-2 pl-2 border-l-2 border-indigo-200">
                        <div>
                            <p className="font-bold text-[12px] text-slate-900">{edu.school}</p>
                            <p className="text-[11px] text-slate-700">{edu.degree}</p>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded h-fit">{edu.year}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Technical;
