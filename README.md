# SimuCFO — AI-Powered Financial Intelligence

**SimuCFO** is an open-source virtual CFO that ingests financial PDFs, extracts 32 structured metrics, runs 10,000 Monte Carlo simulations, and answers natural-language financial questions. Built for the **Universal Fin-E 2025 Hackathon**.

> 🏗️ **Status**: Active development. See [`docs/REVIEW_AND_PLAN.md`](docs/REVIEW_AND_PLAN.md) for the current sprint roadmap.

---

## Architecture

```
Frontend (React + Vite + Tailwind v4)    Backend (Express + Supabase)
┌─────────────────────────────┐          ┌──────────────────────────────┐
│  Landing Page               │  POST    │  Upload Controller           │
│  Product Page (Upload+Ask)  │  /upload │  → Supabase storage          │
│  Processing (Step Tracker)  │ ───────> │  → pdfProcessor.py (Python)  │
│  Results Dashboard          │          │  → montecarlo.py (Python)    │
└─────────────────────────────┘          │  → Return JSON + Plot        │
                                         └──────────────────────────────┘
                                                   │
                          ┌────────────────────────┼────────────────────┐
                          │                        │                    │
                          ▼                        ▼                    ▼
              ┌───────────────────┐  ┌────────────────────┐  ┌──────────────────┐
              │ data-scripts/     │  │ ml-simulator/      │  │ config/          │
              │ ├ extractors/     │  │ ├ monte_carlo_     │  │ ├ supabase.js    │
              │ │  └ pdfProcessor │  │ │  simulations.py  │  └──────────────────┘
              │ ├ schema.json     │  │ ├ montecarlo.py    │
              │ ├ inputs/ (PDFs)  │  │ ├ nlp.py           │
              │ └ output/ (CSV)   │  │ ├ llm_interpreter  │
              └───────────────────┘  │ └ *.json / *.png   │
                                     └────────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **Backboard API key** (sign up at [backboard.ai](https://backboard.ai))
- **Supabase project** (for file storage)

### 1. Clone & Install

```bash
git clone https://github.com/anubhav-kayal/SimuCFO.git
cd SimuCFO

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Python (root venv)
cd .. && python3 -m venv venv
source venv/bin/activate
pip install -r data-scripts/requirements.txt
```

### 2. Configure

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase + Backboard credentials

# Backboard API key for Python extractors
export BACKBOARD_API_KEY="your_key_here"
```

### 3. Run

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**, upload a financial PDF, and ask a question.

---

## Repo Structure

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `frontend/` | React 19, Vite 7, Tailwind v4 | Landing page, upload flow, results dashboard |
| `backend/` | Express 5, Supabase, Multer | File upload API, orchestrates Python pipeline |
| `data-scripts/` | Python 3, pdfplumber, backboard-sdk (Py) | PDF ingestion, metric extraction, schema |
| `ml-simulator/` | Python 3, numpy, scipy | Monte Carlo engine, NLP parsing, LLM interpretation |

### Key Files

| File | Purpose |
|------|---------|
| `data-scripts/extractors/pdfProcessor.py` | Unified PDF extractor with OCR, structured tables, retry |
| `data-scripts/schema.json` | Canonical 32-metric schema with aliases |
| `ml-simulator/monte_carlo_simulations.py` | MC engine: distributions, simulations, visualization |
| `ml-simulator/montecarlo.py` | Integration layer: NLP → MC → LLM interpretation |
| `ml-simulator/nlp.py` | Backboard API-based NLP intent extraction |
| `ml-simulator/nlp_pipeline.py` | Rule-based NLP parser (fallback) |
| `backend/controllers/uploadController.js` | Orchestrates upload → extract → simulate → respond |
| `frontend/src/context/ThemeContext.tsx` | Dark/light mode with system preference detection |

---

## Pipeline Flow

```
1. User uploads PDF(s) + question via the Product page
2. Backend stores PDFs in Supabase, downloads to data-scripts/inputs/
3. pdfProcessor.py:
   a. Extracts tables with headers preserved (not raw text blobs)
   b. Falls back to OCR (pytesseract) for scanned PDFs
   c. Sends structured data to Backboard AI
   d. Parses AI response into 32 schema-aligned metrics
   e. Saves CSV to data-scripts/output/
4. montecarlo.py:
   a. Loads CSV & derives historical distributions
   b. Runs 10,000 Monte Carlo simulations
   c. Routes question intent to appropriate analysis
   d. Generates LLM-interpreted answer via Backboard
5. Backend assembles JSON + plot + interpretation → frontend
```

---

## API

### `POST /upload`

Upload PDF files with a financial question.

**Request:** `multipart/form-data`
- `pdfFile` — PDF file(s) (max 10 files, 50MB each)
- `question` — Natural language question (e.g., *"What is the probability of negative cash next quarter?"*)

**Response:**

```json
{
  "message": "Analysis completed successfully.",
  "files": [{ "originalName": "...", "publicUrl": "..." }],
  "data": {
    "question": "...",
    "answer": { /* computed metrics */ },
    "reasoning": "LLM-generated interpretation...",
    "plotImage": "data:image/png;base64,..."
  }
}
```

---

## Feature Roadmap

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | PDF extraction with structured tables | ✅ Done |
| P0 | Fix CSV path mismatch | ✅ Done |
| P0 | Hardcoded API key → env var | ✅ Done |
| P1 | Backend timeouts & size limits | ✅ Done |
| P1 | Dark/light mode UI | ✅ Done |
| P2 | Scenario comparison mode | 🔄 In progress |
| P2 | Sensitivity analysis (tornado charts) | 📅 Planned |
| P2 | Data quality scoring per metric | 📅 Planned |
| P3 | Unit tests | 📅 Planned |
| P3 | Query caching | 📅 Planned |

See [`docs/REVIEW_AND_PLAN.md`](docs/REVIEW_AND_PLAN.md) for the full 10-day sprint plan.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7 |
| **Backend** | Node.js, Express 5, Supabase (storage), Multer |
| **ML Engine** | Python 3, NumPy, SciPy, pandas, pdfplumber, pytesseract |
| **AI** | Backboard API (LLM extraction + NLP + interpretation) |
| **Fonts** | Inter (UI), JetBrains Mono (data) |

---

## Team

Built for **Universal Fin-E 2025 Hackathon** by Anubhav Kayal and team.

---

## License

MIT
