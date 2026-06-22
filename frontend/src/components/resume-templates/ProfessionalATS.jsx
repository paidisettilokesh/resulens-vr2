import React from 'react';

const ProfessionalATS = ({ data }) => {
    return (
        <div className="font-sans text-gray-900 leading-normal text-[12px] bg-white text-black p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px]">
            <div className="text-center pb-4 mb-4 border-b-2 border-gray-800">
                <h1 className="text-3xl font-bold uppercase tracking-wide text-black">{data.personal.fullName || 'Your Name'}</h1>
                <p className="text-[11px] text-gray-700 mt-2 font-medium">
                    {[data.personal.email, data.personal.phone, data.personal.location, data.personal.linkedin].filter(Boolean).join(' | ')}
                </p>
            </div>
            
            {data.personal.bio && (
                <div className="mb-4">
                    <h4 className="text-[12px] font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-black tracking-wider">Professional Summary</h4>
                    <p className="text-[11px] leading-relaxed text-black text-justify">{data.personal.bio}</p>
                </div>
            )}

            <div className="mb-4">
                <h4 className="text-[12px] font-bold uppercase border-b border-gray-300 pb-1 mb-3 text-black tracking-wider">Work Experience</h4>
                <div className="space-y-4">
                    {data.experience.map(exp => (
                        <div key={exp.id}>
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-[13px] text-black">{exp.role}</span>
                                <span className="text-[11px] text-gray-800 font-medium">{exp.period}</span>
                            </div>
                            <p className="text-[11px] font-semibold text-gray-800 mb-1">{exp.company}</p>
                            <div className="text-[11px] leading-relaxed text-black pl-3 marker:text-gray-500">
                                {exp.details.split('\n').map((bullet, i) => {
                                    if(!bullet.trim()) return null;
                                    return <p key={i} className="mb-1">• {bullet.replace(/^•\s*/, '')}</p>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <h4 className="text-[12px] font-bold uppercase border-b border-gray-300 pb-1 mb-3 text-black tracking-wider">Education</h4>
                {data.education.map(edu => (
                    <div key={edu.id} className="flex justify-between mb-2">
                        <div>
                            <p className="font-bold text-[12px] text-black">{edu.school}</p>
                            <p className="text-[11px] text-gray-800">{edu.degree}</p>
                        </div>
                        <span className="text-[11px] text-gray-800 font-medium">{edu.year}</span>
                    </div>
                ))}
            </div>

            <div>
                <h4 className="text-[12px] font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-black tracking-wider">Core Skills</h4>
                <p className="text-[11px] text-black leading-relaxed">
                    {data.skills || 'Add your skills above'}
                </p>
            </div>
        </div>
    );
};

export default ProfessionalATS;
