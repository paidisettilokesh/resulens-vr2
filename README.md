# 🔍 ResuLens — AI Resume Intelligence

> **Production-grade AI career intelligence platform** — Resume analysis, ATS scoring, interview coaching, market insights, and more. Built for real-world use and recruiter-panel evaluation.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18-blue)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI-Groq%20%7C%20OpenRouter-purple)](https://groq.com)

---

## 🚀 What is ResuLens?

**ResuLens** is an AI-powered resume intelligence platform that gives job seekers an unfair advantage. Upload your resume and get a deep-dive analysis covering ATS compatibility, skill gaps, salary benchmarks, market demand, and interview readiness — all in seconds, powered by LLMs.

---

## ✨ Features

| Module | Description | Status |
|---|---|---|
| **ATS Analyzer** | Full ATS score, keyword matching, competency matrix | ✅ Live |
| **Resume Rewriter** | Impact-driven bullet rewrites with before/after comparison | ✅ Live |
| **Interview Coach** | 15 categorized questions, voice input, AI evaluation with STAR scoring | ✅ Live |
| **Cover Letter** | AI-generated tone-adaptive cover letters | ✅ Live |
| **JD Tailoring** | Keyword gap analysis against any job description | ✅ Live |
| **LinkedIn Optimizer** | Headline, About, and experience rewrites | ✅ Live |
| **Learning Path & Market Insights** | Consolidated skill gap radar, timeline roadmap, ATS predictor, and free courses | ✅ Live |
| **Resume Roast** | Honest recruiter-style brutal critique | ✅ Live |
| **Resume Builder** | Structure-first resume builder from scratch | ✅ Live |
| **History Vault** | Persistent AI session history | ✅ Live |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Framer Motion** for animations
- **Lucide React** for icons
- **Tailwind CSS** for utility styling
- **Context API** for global state (`UserContext`, `ResumeContext`, `ThemeContext`)

### Backend
- **Node.js + Express** (ESModule)
- **MongoDB + Mongoose** (with JSON file fallback)
- **Multer** for file uploads
- **pdf-parse** + **mammoth** for resume text extraction

### AI Layer
- **Groq** (Primary) — Llama 3.3 70B, ~1–3s response time
- **OpenRouter** (Fallback) — Gemini Flash, Gemma 3, Qwen
- Smart dual-provider routing with automatic failover

---

## ⚡ Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn
- A free [Groq API key](https://console.groq.com) (recommended)
- Optional: MongoDB instance — app runs with JSON fallback if not configured

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/resulens.git
cd resulens

# Install all dependencies at once
npm run install:all
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # then fill in your keys
```

Edit `.env`:
```env
PORT=5000
GROQ_API_KEY=gsk_your_key_here
OPENROUTER_API_KEY=sk-or-your_key_here
MONGODB_URI=mongodb://localhost:27017/resulens
```

Start the backend:
```bash
npm start
# or for development with auto-reload:
# On Windows Powershell: npm run dev
# On Linux/macOS: npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 📁 Project Structure

```
resulens/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── models/                    # Mongoose schemas
│   ├── routes/                    # API route handlers
│   │   ├── analyze.js             # /api/analyze
│   │   ├── interview.js           # /api/interview/{generate,evaluate}
│   │   ├── rewrite.js             # /api/rewrite
│   │   ├── market.js              # /api/market
│   │   ├── skills.js              # /api/skills
│   │   ├── roast.js               # /api/roast
│   │   ├── coverLetter.js         # /api/cover-letter
│   │   ├── linkedin.js            # /api/linkedin
│   │   ├── tailor.js              # /api/tailor
│   │   ├── userResumes.js         # /api/user-resumes
│   │   ├── savedResumes.js        # /api/resumes
│   │   └── auth.js                # /api/auth
│   ├── utils/
│   │   ├── aiService.js           # AI routing (Groq + OpenRouter)
│   │   ├── extractText.js         # PDF/DOCX text extraction
│   │   ├── historyManager.js      # MongoDB + JSON history
│   │   └── upload.js              # Multer config
│   └── server.js                  # Express app entry point
│
└── frontend/
    └── src/
        ├── components/            # Page-level components
        ├── context/               # React Context providers
        │   ├── ResumeContext.jsx  # Global resume + API state
        │   ├── UserContext.jsx    # Auth state
        │   └── ThemeContext.jsx   # Light/dark mode toggle
        ├── utils/                 # Helper functions (helpers.js)
        └── App.jsx                # Root router component
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analyze` | Full resume analysis (ATS + competency) |
| POST | `/api/rewrite` | ATS-optimized bullet rewriting |
| POST | `/api/interview/generate` | Generate 15 interview questions |
| POST | `/api/interview/evaluate` | Evaluate a candidate's answer (STAR scoring) |
| POST | `/api/cover-letter` | Generate a tailored cover letter |
| POST | `/api/tailor` | Match resume to a job description |
| POST | `/api/skills` | Skill gap detection + learning roadmap |
| POST | `/api/market` | 2026 job market intelligence |
| POST | `/api/roast` | Brutally honest resume critique |
| POST | `/api/linkedin` | LinkedIn profile optimization |
| GET  | `/api/history` | Fetch analysis history |
| DELETE | `/api/history` | Clear history |
| POST | `/api/user-resumes/save` | Save structured resume builder details |
| GET  | `/api/user-resumes/latest` | Retrieve latest resume builder configuration |
| GET  | `/api/resumes` | Fetch all saved resumes |
| POST | `/api/resumes` | Save a new resume configuration |
| DELETE | `/api/resumes/:id` | Delete a saved resume configuration |
| POST | `/api/builder/suggest-bio` | Get automated professional bio suggestions |
| POST | `/api/builder/optimize-experience` | Optimize experience sections dynamically |
| GET  | `/` | Health check — returns service + provider status |

---

## 🧠 AI Architecture

```
Request → handleResumeRequest()
           ├── callGroq()        [Primary: Llama 3.3 70B, ~1-3s]
           │     └── Failover: gemma2-9b → llama-3.1-8b → llama3-70b
           └── callOpenRouter()  [Fallback: Gemini Flash Lite, Gemma 3, Qwen]
                 └── Full fallback chain if Groq unavailable
```

All prompts are optimized for:
- Minimal token usage (1,200–1,800 chars of resume context)
- `max_tokens: 1500` cap for fast, concise JSON responses
- `temperature: 0.1` for deterministic, structured output
- Strict JSON-only output format to eliminate parsing failures

---

## 🔒 Security

- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- CORS restricted to configured origins
- Environment variables for all secrets (never hardcoded)
- Error messages sanitized in production mode

---

## 🚧 Known Limitations

- MongoDB is optional — the app runs in JSON fallback mode without it
- Voice features in Interview Coach require Chrome or Edge (Web Speech API)
- Free-tier AI models have rate limits; Groq is recommended for heavy use
- PDF parsing may lose formatting for heavily styled resumes

---

## 🤝 Contributing

PRs are welcome. Please open an issue first to discuss what you'd like to change.

```bash
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for job seekers, career changers, and engineers who want their resume to speak for itself.*
