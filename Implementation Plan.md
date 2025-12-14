## MVP Build Plan: **AI Lab – Day Zero** (Pokémon-style single-room lab, WASD + Space to interact)

Goal: ship a playable vertical slice on Vercel where the player walks around a single pixel lab, interacts with 4 agents + 3 key stations, and “ships” a compliant AI plan by passing a RAG tuning test and a referee decision.

---

# 0) Project constraints and MVP definition

**Success criteria (MVP complete when):**

* Player can move with **WASD** (and arrow keys optional) in a **single-room tile map** with collision.
* Player can press **Spacebar** near an NPC/object to interact.
* Interactions open a **dialogue panel** showing structured outputs.
* RAG “server rack” minigame exists: choose `chunk_size`, `top_k`, `require_citations`, run test → updates meters.
* Whiteboard synthesis triggers **Referee**: merges agent outputs, scores rubric, returns **Ship/Revise/Block**.
* Door unlocks only if verdict is **Ship** and constraints are satisfied.
* Deployed to **Vercel** with a public URL and a clean README.

---

# 1) Repo & tooling setup (Deliverable: running skeleton + deploy)

**Tech**

* Frontend: **Next.js (React)** on Vercel
* Rendering: **PixiJS** (recommended for 2D sprites + tilemaps) *or* Canvas (Pixi is faster to get “Pokémon feel”)
* Backend: **FastAPI** (Python)
* Orchestration: **LangChain**
* Vector DB: **Chroma**
* Schemas: **Pydantic**
* Env: `.env.local` with `OPENAI_API_KEY` (or other provider)

**Deliverables**

* GitHub repo created with:

  * `apps/web` (Next.js)
  * `apps/api` (FastAPI)
* Vercel deployment working with:

  * Frontend route `/`
  * API routes mounted under `/api/*`

**Steps**

1. Create monorepo (pnpm or npm workspaces).
2. Scaffold Next.js app in `apps/web`.
3. Scaffold FastAPI app in `apps/api/main.py`.
4. Add `vercel.json` routing `/api/*` → Python function entry.
5. Deploy early to Vercel.

---

# 2) Pixel room engine (Deliverable: walkable lab with collisions)

**Tech**

* PixiJS + simple tilemap JSON (hand-authored for MVP)
* Sprite sheet: minimal placeholder 16-bit sprites (we can use basic rectangles first, swap later)
* Keyboard input: **WASD** + Space (interaction)

**Deliverables**

* `RoomScene` renders:

  * Background tiles
  * Collidable tiles
  * Player sprite (4-direction movement)
* Collision:

  * player cannot walk through walls/workstations
* Interaction trigger:

  * “interactable zones” (NPCs/objects) defined in map JSON
  * when player is within 1 tile and presses **Space**, call interaction handler

**Steps**

1. Define map format: `width/height`, `colliders[]`, `interactables[]`.
2. Implement `useKeyboard()` hook capturing WASD + Space (with key repeat handling).
3. Implement movement update loop (fixed timestep or requestAnimationFrame).
4. Implement collision check on intended move.
5. Implement interact check:

   * compute player tile + facing direction
   * if interactable in front, open dialogue UI

---

# 3) UI shell for dialogue + meters (Deliverable: readable “Pokémon-style” interface)

**Tech**

* React UI overlay above Pixi canvas
* Tailwind (optional) for fast styling

**Deliverables**

* Dialogue panel:

  * Title (NPC/object name)
  * Text body
  * “Continue” (Enter) and/or click
* Right-side or bottom HUD:

  * 4 meters: Reliability / Cost / Risk / Regulatory Heat
* “Objective” panel:

  * Current mission + constraints checklist

**Steps**

1. Create `GameHUD` component and store global state in a small store (Zustand recommended).
2. Add `DialogueModal` with pagination (multi-step messages).
3. Add a debug panel toggle (optional) to show raw JSON from backend.

---

# 4) Game content objects (Deliverable: NPCs + interactables placed)

**Objects in the room**

* NPC: ML Engineer (Model Bench)
* NPC: AI Product Engineer (Agent Console)
* NPC: Infra/MLOps Engineer (Deployment Terminal)
* NPC: Security/Policy Advisor (Compliance Desk)
* Object: Whiteboard (Review Plan)
* Object: Server Rack (RAG Tuner minigame)
* Object: Exit Door (locked gate)

**Deliverables**

* Each object has:

  * position tile
  * interaction id
  * display name
  * handler function (frontend) that calls backend endpoint

**Steps**

1. Add each interactable to map JSON.
2. Render NPC sprites at positions.
3. Add “press Space” hint when in range.

---

# 5) Backend AI primitives (Deliverable: working FastAPI endpoints returning structured JSON)

**Tech**

* FastAPI + Pydantic response models
* LangChain prompt templates
* Chroma store for documents (“Lab Docs”)

**Endpoints**

1. `POST /api/agents/ml` → returns **Model Plan**
2. `POST /api/agents/product` → returns **Agent Flow**
3. `POST /api/agents/infra` → returns **Deployment Plan + simulated metrics**
4. `POST /api/agents/security` → returns **Risk Review**
5. `POST /api/whiteboard/review` → **Referee synthesis + score + verdict**
6. `POST /api/rag/test` → **RAG minigame test result**
7. `POST /api/docs/upsert` → ingest markdown docs into Chroma

**Deliverables**

* Pydantic schemas for every response:

  * `ModelPlan`, `AgentFlow`, `InfraPlan`, `SecurityReview`, `RefereeVerdict`, `RagTestResult`
* All endpoints return deterministic JSON that the frontend renders.

**Steps**

1. Implement schemas first (prevents UI chaos).
2. Implement LLM calls with strict JSON prompting.
3. Add basic error handling + fallback mock if no key present (dev friendliness).

---

# 6) Lab Docs + RAG implementation (Deliverable: citations + evidence drawer)

**Tech**

* Chroma persistent directory in serverless context:

  * For MVP: store docs in-memory per run *or* ship with seeded docs and embed at startup.
  * (We’ll choose the simplest reliable approach for Vercel: **seed docs in repo** and build embeddings on startup if missing.)
* Retrieval: top-k chunks
* Agent prompts require citations: `[DOC:chunk_id]`

**Deliverables**

* `data/lab_docs/*.md` (3–5 small docs):

  * “Runbook: RAG grounding rules”
  * “Policy: escalation & safety”
  * “Incident: prompt injection postmortem”
* UI Evidence drawer shows retrieved snippets + ids
* Agents cite ids in their plans

**Steps**

1. Add chunker (simple: markdown → paragraphs → chunk).
2. Add embedding + persist.
3. Add retriever function used by agents and RAG test.

---

# 7) Server Rack minigame: RAG Tuner (Deliverable: interactive simulation)

**Player choices**

* `chunk_size`: small/med/large (mapped to token counts)
* `top_k`: 3/5/8
* `require_citations`: on/off

**Backend logic**

* Run retrieval with chosen config
* Ask model: answer the question *with citations if required*
* Score outcome:

  * citation presence/coverage
  * latency proxy (based on top_k + chunk_size)
  * hallucination proxy (no citations + low evidence match)
* Return:

  * `answer`
  * `citations[]`
  * `quality_score`
  * `risk_delta`, `cost_delta`, `reliability_delta`, `reg_heat_delta`

**Deliverables**

* UI panel that feels like a machine console:

  * toggles + “RUN TEST”
  * result readout + meter changes

---

# 8) Whiteboard synthesis: Referee + gating (Deliverable: ship/revise/block + door unlock)

**Logic**

* Frontend stores each agent’s latest output.
* Whiteboard interaction sends:

  * mission prompt + constraints
  * stored outputs
  * latest RAG test result
* Referee returns:

  * merged plan
  * scorecard by dimension (actionability, safety, cost, evidence)
  * verdict: `SHIP | REVISE | BLOCK`
  * required changes list

**Door unlock**

* Door checks:

  * verdict == SHIP
  * Risk below threshold
  * Regulatory Heat below threshold
  * RAG test passed

**Deliverables**

* Whiteboard dialogue shows verdict + scorecard
* Door interaction changes from “Locked” to “Open” and ends the MVP with a success screen

---

# 9) Polish pass (Deliverable: cohesive experience + README)

**Game feel**

* Smooth movement (grid-snapped or pixel-smooth, your choice)
* Facing direction matters for interactions
* Sound: optional single click/beep (nice but optional)

**README**

* Architecture diagram (simple)
* What agents do
* How RAG is implemented
* Why citations matter
* How to run locally
* Deployment notes

**Demo content**

* 1 mission (“Utility outage copilot / critical infra”)
* 3 preset questions for server rack test

---

# 10) Implementation order (the “don’t get stuck” path)

1. Deploy skeleton (web + api) ✅
2. Walkable room + interaction zones ✅
3. Dialogue UI + meters ✅
4. Mock endpoints wired end-to-end ✅
5. Replace mocks with real FastAPI schemas + LangChain ✅
6. Seed docs + Chroma retrieval ✅
7. RAG Tuner minigame ✅
8. Referee + door unlock ✅
9. Polish + README ✅

---

## If you want a crisp “definition of done”

You can record a 60–90s demo video:

* walk to 2 agents → gather plans
* run the server rack test and see meters change
* use the whiteboard → get SHIP verdict
* exit door opens → success screen

That’s the MVP.

---

## Want to begin implementing?

If yes, I’ll start by generating the **repo scaffold + file tree + initial code** (Next.js + Pixi scene with WASD + Space interaction + FastAPI endpoints returning mocked Pydantic-shaped JSON), so you can run it locally immediately and deploy to Vercel.
