import React from 'react';

const ModernProfessional = ({ data }) => {
    const personal = data?.personal || {};
    const experience = Array.isArray(data?.experience) ? data.experience : [];
    const education = Array.isArray(data?.education) ? data.education : [];
    const skills = data?.skills || '';

    const contactItems = [
        personal.email,
        personal.phone,
        personal.location,
        personal.website || personal.linkedin
    ].filter(Boolean);

    return (
        <div className="resume-sheet font-sans text-slate-900 bg-white p-10 md:p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px] leading-normal box-border">
            {/* Header */}
            <header className="pb-4 mb-5 border-b border-slate-200">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                            {personal.fullName || 'YOUR NAME'}
                        </h1>
                        <p className="text-xs font-semibold text-sky-800 tracking-wide mt-1 uppercase">
                            {experience[0]?.role || 'Professional Resume'}
                        </p>
                    </div>
                    {contactItems.length > 0 && (
                        <div className="text-[11px] text-slate-600 font-medium md:text-right leading-relaxed">
                            {contactItems.map((item, idx) => (
                                <span key={idx} className="inline-block">
                                    {item}
                                    {idx < contactItems.length - 1 && <span className="mx-2 text-slate-400">·</span>}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Profile Summary */}
            {personal.bio && personal.bio.trim() && (
                <section className="mb-5">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 pb-1 mb-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-700 inline-block"></span>
                        Professional Summary
                    </h2>
                    <p className="text-[11px] text-slate-700 leading-relaxed text-justify pl-4 border-l border-slate-200">
                        {personal.bio}
                    </p>
                </section>
            )}

            {/* Work Experience */}
            {experience.some(exp => exp.company || exp.role || exp.details) && (
                <section className="mb-5">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 pb-1 mb-2.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-700 inline-block"></span>
                        Experience
                    </h2>
                    <div className="space-y-4 pl-4 border-l border-slate-200">
                        {experience.map(exp => {
                            if (!exp.company && !exp.role && !exp.details) return null;
                            const bullets = (exp.details || '')
                                .split('\n')
                                .map(b => b.trim())
                                .filter(Boolean);

                            return (
                                <div key={exp.id || `${exp.company}-${exp.role}`}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[12px] text-slate-900">
                                            {exp.role || 'Role'}
                                        </h3>
                                        <span className="text-[11px] font-semibold text-slate-600 text-right">
                                            {exp.period || ''}
                                        </span>
                                    </div>
                                    <div className="text-[11px] font-medium text-sky-800 mb-1">
                                        {exp.company || ''}
                                    </div>
                                    {bullets.length > 0 && (
                                        <ul className="text-[11px] text-slate-700 leading-relaxed space-y-1 list-disc pl-4 marker:text-slate-400">
                                            {bullets.map((bullet, i) => (
                                                <li key={i} className="pl-0.5">
                                                    {bullet.replace(/^[•\-\*]\s*/, '')}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Education */}
            {education.some(edu => edu.school || edu.institution || edu.degree) && (
                <section className="mb-5">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 pb-1 mb-2.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-700 inline-block"></span>
                        Education
                    </h2>
                    <div className="space-y-3 pl-4 border-l border-slate-200">
                        {education.map(edu => {
                            const institution = edu.school || edu.institution;
                            if (!institution && !edu.degree) return null;

                            const dates = edu.startDate && (edu.endDate || edu.year)
                                ? `${edu.startDate} – ${edu.endDate || edu.year}`
                                : (edu.endDate || edu.year || edu.startDate || '');

                            const degreeAndMajor = [
                                edu.degree,
                                edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : null
                            ].filter(Boolean).join(' ');

                            return (
                                <div key={edu.id || institution}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[12px] text-slate-900">
                                            {institution || 'Institution'}
                                        </h3>
                                        {dates && (
                                            <span className="text-[11px] font-semibold text-slate-600 text-right">
                                                {dates}
                                            </span>
                                        )}
                                    </div>
                                    {degreeAndMajor && (
                                        <div className="text-[11px] font-medium text-sky-800">
                                            {degreeAndMajor}
                                            {edu.grade && (
                                                <span className="text-slate-600 font-normal">
                                                    {'  ·  '}CGPA/Grade: {edu.grade}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {edu.coursework && (
                                        <p className="text-[10.5px] text-slate-600 leading-tight mt-0.5">
                                            <span className="font-semibold text-slate-700">Coursework:</span> {edu.coursework}
                                        </p>
                                    )}
                                    {edu.achievements && (
                                        <p className="text-[10.5px] text-slate-600 leading-tight mt-0.5">
                                            <span className="font-semibold text-slate-700">Honors:</span> {edu.achievements}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Core Competencies */}
            {skills && skills.trim() && (
                <section>
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 pb-1 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-700 inline-block"></span>
                        Key Competencies
                    </h2>
                    <div className="pl-4 border-l border-slate-200">
                        <div className="flex flex-wrap gap-1.5">
                            {skills.split(',').filter(Boolean).map((s, idx) => (
                                <span
                                    key={idx}
                                    className="text-[10.5px] font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                >
                                    {s.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default ModernProfessional;
