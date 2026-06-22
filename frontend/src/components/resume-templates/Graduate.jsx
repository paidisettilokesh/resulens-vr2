import React from 'react';

const Graduate = ({ data }) => {
    return (
        <div className="font-sans text-gray-900 leading-normal bg-white text-black p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="text-center pb-4 mb-6">
                <h1 className="text-3xl font-black text-emerald-800 tracking-tight">{data.personal.fullName || 'Your Name'}</h1>
                <p className="text-[11px] font-bold text-gray-600 mt-2">
                    {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' | ')}
                </p>
            </div>
            
            <div className="mb-6">
                <h4 className="text-[12px] font-black uppercase text-emerald-800 border-b-2 border-emerald-100 pb-1 mb-3">Education</h4>
                {data.education.map(edu => (
                    <div key={edu.id} className="mb-3">
                        <div className="flex justify-between items-baseline">
                            <h5 className="font-bold text-[13px] text-gray-900">{edu.school}</h5>
                            <span className="text-[11px] font-bold text-emerald-700">{edu.year}</span>
                        </div>
                        <p className="text-[12px] text-gray-800 italic">{edu.degree}</p>
                    </div>
                ))}
            </div>

            <div className="mb-6">
                <h4 className="text-[12px] font-black uppercase text-emerald-800 border-b-2 border-emerald-100 pb-1 mb-3">Academic & Personal Projects</h4>
                <div className="space-y-4">
                    {data.experience.map(exp => (
                        <div key={exp.id}>
                            <div className="flex justify-between items-baseline">
                                <span className="font-bold text-[13px] text-gray-900">{exp.role}</span>
                                <span className="text-[11px] font-bold text-emerald-700">{exp.period}</span>
                            </div>
                            <p className="text-[11px] font-semibold text-gray-600 mb-1">{exp.company}</p>
                            <div className="text-[11.5px] leading-relaxed text-gray-800 pl-3 border-l-2 border-emerald-100">
                                {exp.details.split('\n').map((bullet, i) => {
                                    if(!bullet.trim()) return null;
                                    return <p key={i} className="mb-1">• {bullet.replace(/^•\s*/, '')}</p>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {data.personal.bio && (
                <div className="mb-6">
                    <h4 className="text-[12px] font-black uppercase text-emerald-800 border-b-2 border-emerald-100 pb-1 mb-2">Profile & Objectives</h4>
                    <p className="text-[11.5px] leading-relaxed text-gray-800">{data.personal.bio}</p>
                </div>
            )}

            <div>
                <h4 className="text-[12px] font-black uppercase text-emerald-800 border-b-2 border-emerald-100 pb-1 mb-2">Technical & Soft Skills</h4>
                <p className="text-[11.5px] text-gray-800 leading-relaxed font-medium">
                    {data.skills || 'Add your skills above'}
                </p>
            </div>
        </div>
    );
};

export default Graduate;
