import React from 'react';

const Technical = ({ data }) => {
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
            <header className="pb-3 mb-5 border-b-2 border-indigo-700">
                <div className="flex flex-col md:flex-row md:justify-between md:items-baseline gap-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-slate-900">
                        {personal.fullName || 'ENGINEER NAME'}
                    </h1>
                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                        {experience[0]?.role || 'Software Engineer'}
                    </span>
                </div>
                {contactItems.length > 0 && (
                    <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                        {contactItems.join('  ·  ')}
                    </p>
                )}
            </header>

            {/* Technical Skills / Competencies */}
            {skills && skills.trim() && (
                <section className="mb-4">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-200 pb-0.5 mb-2">
                        Technical Skills Matrix
                    </h2>
                    <div className="text-[11px] text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                        {skills}
                    </div>
                </section>
            )}

            {/* Professional Summary */}
            {personal.bio && personal.bio.trim() && (
                <section className="mb-4">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-200 pb-0.5 mb-1.5">
                        Technical Profile
                    </h2>
                    <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
                        {personal.bio}
                    </p>
                </section>
            )}

            {/* Engineering Experience */}
            {experience.some(exp => exp.company || exp.role || exp.details) && (
                <section className="mb-4">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-200 pb-0.5 mb-2">
                        Engineering Experience
                    </h2>
                    <div className="space-y-3.5">
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
                                            {exp.role || 'Role'}{' '}
                                            {exp.company && <span className="font-semibold text-indigo-700">@ {exp.company}</span>}
                                        </h3>
                                        <span className="text-[11px] font-medium text-slate-600 text-right">
                                            {exp.period || ''}
                                        </span>
                                    </div>
                                    {bullets.length > 0 && (
                                        <ul className="text-[11px] text-slate-700 leading-relaxed space-y-0.5 list-disc pl-4 mt-1 marker:text-indigo-600">
                                            {bullets.map((bullet, i) => (
                                                <li key={i} className="pl-0.5">
                                                    {bullet.replace(/^[•\-\*»]\s*/, '')}
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
                <section>
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-200 pb-0.5 mb-2">
                        Education & Academic Credentials
                    </h2>
                    <div className="space-y-3">
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
                                            <span className="text-[11px] font-medium text-slate-600 text-right">
                                                {dates}
                                            </span>
                                        )}
                                    </div>
                                    {degreeAndMajor && (
                                        <div className="text-[11px] font-medium text-slate-800">
                                            {degreeAndMajor}
                                            {edu.grade && (
                                                <span className="text-slate-600 font-normal">
                                                    {'  ·  '}CGPA/GPA: {edu.grade}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {edu.coursework && (
                                        <p className="text-[10.5px] text-slate-600 leading-tight mt-0.5">
                                            <span className="font-semibold text-slate-700">Relevant CS Coursework:</span> {edu.coursework}
                                        </p>
                                    )}
                                    {edu.achievements && (
                                        <p className="text-[10.5px] text-slate-600 leading-tight mt-0.5">
                                            <span className="font-semibold text-slate-700">Honors & Competitions:</span> {edu.achievements}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Technical;
