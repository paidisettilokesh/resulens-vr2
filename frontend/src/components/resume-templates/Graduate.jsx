import React from 'react';

const Graduate = ({ data }) => {
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
            <header className="text-center pb-3 mb-5 border-b-2 border-emerald-800">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                    {personal.fullName || 'YOUR NAME'}
                </h1>
                {contactItems.length > 0 && (
                    <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                        {contactItems.join('   |   ')}
                    </p>
                )}
            </header>

            {/* Profile / Career Objective */}
            {personal.bio && personal.bio.trim() && (
                <section className="mb-4">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-900 border-b border-emerald-300 pb-0.5 mb-1.5">
                        Career Objective & Profile
                    </h2>
                    <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
                        {personal.bio}
                    </p>
                </section>
            )}

            {/* Education — Prominent for College Students & Freshers */}
            {education.some(edu => edu.school || edu.institution || edu.degree) && (
                <section className="mb-4">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-900 border-b border-emerald-300 pb-0.5 mb-2">
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
                                            {institution || 'University / College'}
                                        </h3>
                                        {dates && (
                                            <span className="text-[11px] font-semibold text-emerald-800 text-right">
                                                {dates}
                                            </span>
                                        )}
                                    </div>
                                    {degreeAndMajor && (
                                        <div className="text-[11px] font-medium text-slate-800">
                                            {degreeAndMajor}
                                            {edu.grade && (
                                                <span className="text-emerald-800 font-semibold">
                                                    {'  ·  '}CGPA / Grade: {edu.grade}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {edu.coursework && (
                                        <p className="text-[10.5px] text-slate-700 leading-tight mt-1">
                                            <span className="font-semibold text-slate-800">Relevant Coursework:</span> {edu.coursework}
                                        </p>
                                    )}
                                    {edu.achievements && (
                                        <p className="text-[10.5px] text-slate-700 leading-tight mt-0.5">
                                            <span className="font-semibold text-slate-800">Academic Achievements:</span> {edu.achievements}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Academic Projects & Practical Experience */}
            {experience.some(exp => exp.company || exp.role || exp.details) && (
                <section className="mb-4">
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-900 border-b border-emerald-300 pb-0.5 mb-2">
                        Projects & Professional Experience
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
                                            {exp.role || 'Project / Role'}
                                        </h3>
                                        <span className="text-[11px] font-semibold text-emerald-800 text-right">
                                            {exp.period || ''}
                                        </span>
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-700 italic mb-1">
                                        {exp.company || ''}
                                    </div>
                                    {bullets.length > 0 && (
                                        <ul className="text-[11px] text-slate-700 leading-relaxed space-y-0.5 list-disc pl-4 marker:text-emerald-700">
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

            {/* Technical & Soft Skills */}
            {skills && skills.trim() && (
                <section>
                    <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-900 border-b border-emerald-300 pb-0.5 mb-1.5">
                        Technical Competencies & Skills
                    </h2>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                        {skills}
                    </p>
                </section>
            )}
        </div>
    );
};

export default Graduate;
