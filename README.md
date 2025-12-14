
# AI Lab – Day Zero (v0.7.0) — Add Eval Suite Gate

## Run frontend
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000

## Run backend (separate terminal)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn apps.api.main:app --reload --port 8000
```
Health: http://localhost:8000/api/health

## What’s new in v0.5.0
- New **Eval Terminal** station (EVAL)
  - Opens an **Eval Suite** modal
  - POSTs to `/api/eval/run`
  - Stores pass-rate + failure reasons
  - Updates gauges (reliability/risk/regHeat)
- **Whiteboard referee** now requires:
  - talkedTo 4/4
  - RAG PASS
  - **Eval pass-rate ≥ 80%**
  - meter thresholds

## Controls
- WASD / Arrow keys: Move
- SPACE: Interact


## What’s new in v0.7.0
- Adds **RAG Results Viewer** modal
  - shows config, score, citations
  - shows retrieved snippets (evidence) used for the answer
  - auto-opens after a RAG run
  - accessible via Mission panel button


## What’s new in v0.7.0
- Adds **Eval Results Viewer** modal (auto-opens after eval run)
- Adds **Whiteboard Release Checklist** modal with gate statuses and buttons linking to RAG/Eval artifacts
- Whiteboard interaction now opens the checklist view for a true "ship/no-ship" workflow


## What’s new in v0.9.0
- Adds **Bookshelf (Lab Library)** station that opens a **Book Viewer** modal
- Includes 3 starter books: **RAG Fundamentals**, **Evals & Release Gates**, **Safety & Escalation**
- Book viewer supports: table of contents, page navigation, glossary


## What’s new in v0.9.0
- Persists **RAG** and **Eval** runs as artifacts in a local **SQLite** DB (FastAPI)
- Adds **Artifact Console (Run History)** workstation + HUD button
- Adds **Artifact Browser** modal (list + open historical RAG/Eval runs)
- Viewers now show artifact ids + timestamps

### Notes
- DB file: `apps/api/ai_lab.db` (created on first backend start)
