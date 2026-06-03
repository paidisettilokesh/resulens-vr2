import crypto from 'crypto';

const ROLE_SKILLS = {
    "Software Engineer": ["java", "python", "javascript", "c++", "c#", "git", "sql", "data structures", "algorithms", "software development", "agile"],
    "Frontend Developer": ["javascript", "typescript", "react", "vue", "angular", "html", "css", "tailwind", "sass", "webpack", "vite", "next.js", "git"],
    "Backend Developer": ["node.js", "express", "python", "django", "go", "java", "spring boot", "sql", "postgresql", "mongodb", "redis", "docker", "kubernetes", "aws", "rest api", "graphql", "microservices", "git"],
    "Full Stack Developer": ["javascript", "typescript", "react", "node.js", "express", "sql", "mongodb", "html", "css", "git", "aws", "docker", "rest api", "next.js"],
    "DevOps Engineer": ["docker", "kubernetes", "jenkins", "terraform", "ansible", "aws", "azure", "gcp", "linux", "bash", "python", "ci/cd", "git", "monitoring", "prometheus"],
    "Data Scientist": ["python", "r", "sql", "machine learning", "deep learning", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "statistics", "data analysis", "tableau"],
    "Machine Learning Engineer": ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision", "sql", "git", "docker"],
    "Data Analyst": ["sql", "excel", "python", "r", "tableau", "power bi", "data analysis", "statistics", "data visualization", "pandas"],
    "Product Manager": ["product management", "agile", "scrum", "roadmap", "user research", "jira", "analytics", "strategy", "metrics", "market research"],
    "UI/UX Designer": ["figma", "sketch", "adobe xd", "ui design", "ux research", "wireframing", "prototyping", "user flows", "typography", "interaction design"],
    "Cybersecurity Analyst": ["security", "network security", "firewalls", "siem", "penetration testing", "vulnerability assessment", "incident response", "cryptography", "linux"],
    "Cloud Architect": ["aws", "azure", "gcp", "cloud architecture", "kubernetes", "docker", "terraform", "networking", "security", "devops"],
    "Business Analyst": ["sql", "business analysis", "requirements gathering", "agile", "scrum", "excel", "process mapping", "jira", "tableau"],
    "QA Engineer": ["testing", "automation", "selenium", "jest", "cypress", "qa", "test cases", "jira", "javascript", "python", "git"],
    "Mobile Developer (iOS/Android)": ["swift", "kotlin", "java", "objective-c", "react native", "flutter", "ios", "android", "git", "mobile development"],
    "Blockchain Developer": ["solidity", "ethereum", "smart contracts", "rust", "go", "cryptography", "web3", "git", "blockchain"]
};

const GENERAL_TECH_SKILLS = [
    "javascript", "python", "java", "c++", "c#", "typescript", "php", "ruby", "go", "rust", "swift", "kotlin", "sql", "nosql",
    "html", "css", "react", "node.js", "aws", "docker", "git", "kubernetes", "cloud", "agile", "scrum", "linux"
];

const SOFT_SKILLS = [
    "communication", "leadership", "teamwork", "collaboration", "problem solving", "critical thinking", 
    "time management", "adaptability", "creativity", "interpersonal", "agile", "scrum", "project management",
    "optimization", "scalability", "testing", "ci/cd", "git", "analytics"
];

const SECTIONS = {
    experience: /(?:experience|work history|employment history|professional experience|career history)/i,
    education: /(?:education|academic background|studies|qualifications)/i,
    skills: /(?:skills|technical skills|technologies|expertise|competencies)/i,
    projects: /(?:projects|personal projects|academic projects)/i,
    summary: /(?:summary|about me|professional summary|objective)/i
};

// Word boundary check that safely handles special chars like c++, c#, node.js
const hasWord = (text, word) => {
    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:\\s|^)${escaped}(?:\\s|[,.;:!?()]|$)`, 'i');
    return regex.test(text);
};

const findSectionText = (text, sectionName) => {
    const sectionRegex = SECTIONS[sectionName];
    if (!sectionRegex) return "";
    const match = text.match(sectionRegex);
    if (!match) return "";
    const startIndex = match.index + match[0].length;
    let endIndex = text.length;
    for (const name of Object.keys(SECTIONS)) {
        if (name === sectionName) continue;
        const nextMatch = text.match(SECTIONS[name]);
        if (nextMatch && nextMatch.index > startIndex && nextMatch.index < endIndex) {
            endIndex = nextMatch.index;
        }
    }
    return text.substring(startIndex, endIndex).trim();
};

export const calculateAtsScore = (resumeText, jobRole = "") => {
    if (!resumeText) {
        return {
            atsScore: 0,
            jobMatchScore: 0,
            atsScoreBreakdown: {
                skillsMatch: 0,
                skillsMatchMax: 40,
                keywordMatch: 0,
                keywordMatchMax: 20,
                experienceMatch: 0,
                experienceMatchMax: 20,
                educationMatch: 0,
                educationMatchMax: 10,
                formattingMatch: 0,
                formattingMatchMax: 10,
                total: 0
            }
        };
    }

    const cleanText = resumeText.toLowerCase();

    // 1. Technical Skills Match (Max 40 points)
    let targetSkills = GENERAL_TECH_SKILLS;
    if (jobRole) {
        // Case-insensitive lookup of role
        const matchedKey = Object.keys(ROLE_SKILLS).find(key => key.toLowerCase() === jobRole.toLowerCase());
        if (matchedKey) {
            targetSkills = ROLE_SKILLS[matchedKey];
        }
    }

    let matchedSkillsCount = 0;
    targetSkills.forEach(skill => {
        if (hasWord(cleanText, skill)) {
            matchedSkillsCount++;
        }
    });

    const skillsMatchScore = Math.round((matchedSkillsCount / Math.max(targetSkills.length, 1)) * 40);

    // 2. Keyword Match / Soft Skills (Max 20 points)
    let matchedKeywordsCount = 0;
    SOFT_SKILLS.forEach(kw => {
        if (hasWord(cleanText, kw)) {
            matchedKeywordsCount++;
        }
    });

    const keywordMatchScore = Math.round((matchedKeywordsCount / SOFT_SKILLS.length) * 20);

    // 3. Experience Match (Max 20 points)
    let experienceScore = 0;
    const expText = findSectionText(resumeText, 'experience') || resumeText;
    const expClean = expText.toLowerCase();

    // Find seniority keywords in experience text
    const seniorKeywords = ["senior", "lead", "principal", "manager", "architect", "director", "head"];
    const hasSeniority = seniorKeywords.some(kw => hasWord(expClean, kw));

    // Scan for years of experience
    const expRegex = /(?:(\d+)\+?\s*(?:year|yr)s?\b(?:\s*of\s*experience)?)/gi;
    let maxYears = 0;
    let match;
    while ((match = expRegex.exec(resumeText)) !== null) {
        const years = parseInt(match[1]);
        if (years > maxYears) maxYears = years;
    }

    if (maxYears > 0) {
        experienceScore = maxYears >= 5 ? 15 : (maxYears >= 3 ? 12 : (maxYears >= 1 ? 9 : 6));
    } else {
        // Fallback to text length of experience section
        experienceScore = expText.length > 800 ? 15 : (expText.length > 300 ? 10 : 5);
    }

    if (hasSeniority) {
        experienceScore += 5; // Add seniority weight
    }

    experienceScore = Math.min(experienceScore, 20);

    // 4. Education Match (Max 10 points)
    let educationScore = 0;
    const eduText = findSectionText(resumeText, 'education') || resumeText;
    const eduClean = eduText.toLowerCase();

    if (hasWord(eduClean, "phd") || hasWord(eduClean, "doctorate") || hasWord(eduClean, "doctor of philosophy")) {
        educationScore = 10;
    } else if (hasWord(eduClean, "master") || hasWord(eduClean, "m.s.") || hasWord(eduClean, "m.tech") || hasWord(eduClean, "mba") || hasWord(eduClean, "m.b.a.")) {
        educationScore = 9;
    } else if (hasWord(eduClean, "bachelor") || hasWord(eduClean, "b.s.") || hasWord(eduClean, "b.tech") || hasWord(eduClean, "b.e.") || hasWord(eduClean, "undergraduate")) {
        educationScore = 8;
    } else if (hasWord(eduClean, "associate") || hasWord(eduClean, "diploma")) {
        educationScore = 6;
    } else if (hasWord(eduClean, "university") || hasWord(eduClean, "college") || hasWord(eduClean, "school") || hasWord(eduClean, "education")) {
        educationScore = 5;
    }

    // 5. Formatting & Completeness (Max 10 points)
    let formattingScore = 0;
    Object.keys(SECTIONS).forEach(secName => {
        if (SECTIONS[secName].test(resumeText)) {
            formattingScore += 2;
        }
    });

    const total = skillsMatchScore + keywordMatchScore + experienceScore + educationScore + formattingScore;

    // Calculate jobMatchScore programmatically using matched skills & keyword weight (Max 60 points) normalized to 100%
    const jobMatchScore = Math.round(((skillsMatchScore + keywordMatchScore + experienceScore) / 80) * 100);

    return {
        atsScore: Math.min(total, 100),
        jobMatchScore: Math.min(jobMatchScore, 100),
        atsScoreBreakdown: {
            skillsMatch: skillsMatchScore,
            skillsMatchMax: 40,
            keywordMatch: keywordMatchScore,
            keywordMatchMax: 20,
            experienceMatch: experienceScore,
            experienceMatchMax: 20,
            educationMatch: educationScore,
            educationMatchMax: 10,
            formattingMatch: formattingScore,
            formattingMatchMax: 10,
            total: Math.min(total, 100)
        }
    };
};
