import React from 'react';

const Executive = ({ data }) => {
    const personal = data?.personal || {};
    const experience = Array.isArray(data?.experience) ? data.experience : [];
    const education = Array.isArray(data?.education) ? data.education : [];
    const skills = data?.skills || '';

    const contactItems = [
        personal.location,
        personal.phone,
        personal.email,
        personal.website || personal.linkedin
    ].filter(Boolean);

    return (
        <div className="resume-sheet font-serif text-slate-900 bg-white p-10 md:p-12 mx-auto shadow-sm w-full max-w-[850px] min-h-[1100px] leading-normal box-border">
            {/* Header */}
            <header className="text-center pb-4 mb-5 border-t-2 border-b-2 border-slate-900 pt-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-wider uppercase text-slate-900">
                    {personal.fullName || 'YOUR FULL NAME'}
                </h1>
                {contactItems.length > 0 && (
                    <p className="text-[10.5px] font-sans font-medium uppercase tracking-widest text-slate-600 mt-2">
                        {contactItems.join('   ·   ')}
                    </p>
                )}
            </header>

            {/* Executive Summary */}
            {personal.bio && personal.bio.trim() && (
                <section className="mb-5">
                    <h2 className="text-[11.5px] font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                        Executive Summary
                    </h2>
                    <p className="text-[11px] leading-relaxed text-slate-800 text-justify">
                        {personal.bio}
                    </p>
                </section>
            )}

            {/* Core Leadership & Competencies */}
            {skills && skills.trim() && (
                <section className="mb-5">
                    <h2 className="text-[11.5px] font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                        Areas of Expertise & Strategic Core
                    </h2>
                    <div className="text-[11px] font-sans text-slate-800 leading-relaxed">
                        {skills}
                    </div>
                </section>
            )}

            {/* Professional Experience */}
            {experience.some(exp => exp.company || exp.role || exp.details) && (
                <section className="mb-5">
                    <h2 className="text-[11.5px] font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-3">
                        Professional Experience
                    </h2>
                    <div className="space-y-4">
                        {experience.map(exp => {
                            if (!exp.company && !exp.role && !exp.details) return null;
                            const bullets = (exp.details || '')
                                .split('\n')
                                .map(b => b.trim())
                                .filter(Boolean);

                            return (
                                <div key={exp.id || `${exp.company}-${exp.role}`}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-[12px] uppercase tracking-wide text-slate-900">
                                            {exp.company || 'Company'}
                                        </h3>
                                        <span className="text-[11px] font-sans font-semibold text-slate-600 text-right">
                                            {exp.period || ''}
                                        </span>
                                    </div>
                                    <div className="text-[11px] italic font-medium text-slate-700 mb-1.5">
                                        {exp.role || ''}
                                    </div>
                                    {bullets.length > 0 && (
                                        <ul className="text-[11px] text-slate-800 leading-relaxed space-y-1 list-disc pl-4 marker:text-slate-600">
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

            {/* Education & Credentials */}
            {education.some(edu => edu.school || edu.institution || edu.degree) && (
                <section>
                    <h2 className="text-[11.5px] font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
                        Education & Credentials
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
                                        <h3 className="font-bold text-[12px] uppercase tracking-wide text-slate-900">
                                            {institution || 'Institution'}
                                        </h3>
                                        {dates && (
                                            <span className="text-[11px] font-sans font-medium text-slate-600 text-right">
                                                {dates}
                                            </span>
                                        )}
                                    </div>
                                    {degreeAndMajor && (
                                        <div className="text-[11px] text-slate-800 font-sans">
                                            {degreeAndMajor}
                                            {edu.grade && (
                                                <span className="text-slate-600 font-normal">
                                                    {'  ·  '}Honors/Grade: {edu.grade}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {edu.coursework && (
                                        <p className="text-[10.5px] font-sans text-slate-600 leading-tight mt-0.5">
                                            <span className="font-semibold text-slate-700">Coursework:</span> {edu.coursework}
                                        </p>
                                    )}
                                    {edu.achievements && (
                                        <p className="text-[10.5px] font-sans text-slate-600 leading-tight mt-0.5">
                                            <span className="font-semibold text-slate-700">Distinctions:</span> {edu.achievements}
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

export default Executive;
