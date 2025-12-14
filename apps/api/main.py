from __future__ import annotations

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Literal, List, Any
from pathlib import Path
import re
import time
from datetime import datetime, timedelta, timezone
import sqlite3
import os

from apps.api.db import connect  # or ensure_schema, depending on your structure


from .db import (
    init_db,
    insert_rag_run,
    list_rag_runs,
    get_rag_run,
    insert_eval_run,
    list_eval_runs,
    get_eval_run,
    insert_telemetry_event,
    list_telemetry_events,
)

DEFAULT_SCENARIO_ID = "dayzero-utility-outage"

app = FastAPI(title="AI Lab – Day Zero API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Models ----------------

class Effects(BaseModel):
    reliability: Optional[int] = 0
    cost: Optional[int] = 0
    risk: Optional[int] = 0
    regHeat: Optional[int] = 0


class InteractionResponse(BaseModel):
    lines: List[str]
    effects: Optional[Effects] = None


class Meters(BaseModel):
    reliability: int
    cost: int
    risk: int
    regHeat: int


ChunkSize = Literal["small", "medium", "large"]


class RagConfig(BaseModel):
    chunk_size: ChunkSize = Field(alias="chunkSize")
    top_k: int = Field(alias="topK")
    require_citations: bool = Field(alias="requireCitations")

    class Config:
        populate_by_name = True


class RagRetrieved(BaseModel):
    id: str
    title: str
    snippet: str


class RagResult(BaseModel):
    passed: bool
    score: int
    answer: str
    citations: List[str]
    retrieved: List[RagRetrieved]
    config: RagConfig


class RagRunRequest(BaseModel):
    config: RagConfig
    question: str


class RagRunResponse(BaseModel):
    lines: List[str]
    effects: Effects
    rag: RagResult
    runId: str
    createdAt: str


class EvalFailure(BaseModel):
    id: str
    reason: str


class EvalResult(BaseModel):
    ran: bool
    passRate: int
    failures: List[EvalFailure]


class EvalRunRequest(BaseModel):
    ragScore: int = 0
    ragPassed: bool = False
    ragRunId: Optional[str] = None


class EvalRunResponse(BaseModel):
    lines: List[str]
    effects: Effects
    eval: EvalResult
    runId: str
    createdAt: str


class WhiteboardRequest(BaseModel):
    talkedToCount: int
    ragPassed: bool
    evalPassRate: int
    meters: Meters


RefVerdict = Literal["SHIP", "REVISE", "BLOCK"]


class WhiteboardResponse(BaseModel):
    lines: List[str]
    reasons: List[str]
    verdict: RefVerdict
    effects: Effects


# ---------------- Telemetry Models (v1.10) ----------------

class TelemetryEventIn(BaseModel):
    scenario_id: str = Field(default=DEFAULT_SCENARIO_ID, alias="scenarioId")
    run_id: Optional[str] = Field(default=None, alias="runId")
    agent_id: Optional[str] = Field(default=None, alias="agentId")
    event_type: str = Field(alias="eventType")
    latency_ms: Optional[int] = Field(default=None, alias="latencyMs")
    success: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        populate_by_name = True


class TelemetrySummary(BaseModel):
    scenarioId: str
    window: str
    latencyP50: Optional[int] = None
    latencyP95: Optional[int] = None
    errorRate: float
    escalationRate: float
    citationCoverage: float
    totalEvents: int


class TelemetryPoint(BaseModel):
    timestamp: str
    value: float


class TelemetryIngestResponse(BaseModel):
    ok: bool
    ids: List[str]


# ---------------- Helpers ----------------

def load_docs() -> list[dict]:
    docs_dir = Path(__file__).resolve().parents[2] / "data" / "lab_docs"
    docs = []
    for p in docs_dir.glob("*.md"):
        text = p.read_text()
        docs.append({
            "id": p.stem,
            "title": text.splitlines()[0].lstrip("# "),
            "text": text
        })
    return docs


DOCS = load_docs()


def tokenize(s: str) -> set[str]:
    s = re.sub(r"[^a-z0-9\s]", " ", s.lower())
    return {t for t in s.split() if len(t) > 2}


def chunk_text(text: str, size: ChunkSize) -> list[str]:
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    if size == "small":
        return paras
    if size == "medium":
        return ["\n\n".join(paras[i:i+2]) for i in range(0, len(paras), 2)]
    return ["\n\n".join(paras)]

# ---------------- NPC / Agent endpoints ----------------

AGENT_SCRIPTS = {
    "mlengineer": {
        "lines": [
            "ML Engineer (Model Bench)",
            "",
            "Telemetry lens:",
            "• Watch p95 latency: safety checks + tool calls can push it over budget.",
            "• Reduce error rate by adding guardrails and better input validation.",
            "• If uncertainty is high, escalate rather than guessing."
        ],
        "effects": {"reliability": 1, "risk": -1}
    },
    "aiproductengineer": {
        "lines": [
            "AI Product Eng (Agent Console)",
            "",
            "Product lens:",
            "• Users care about consistent behavior more than peak scores.",
            "• Citation coverage is a trust metric — treat it like a feature.",
            "• Escalation rate should be stable and policy-driven, not random."
        ],
        "effects": {"reliability": 1, "regHeat": -1}
    },
    "infraengineer": {
        "lines": [
            "Infra/MLOps (Deploy Terminal)",
            "",
            "Ops lens:",
            "• If p95 latency rises, check tool retries and retrieval size (topK/chunks).",
            "• Add timeouts and circuit breakers for external calls.",
            "• Track error rate and correlate with changes you make."
        ],
        "effects": {"cost": 1, "risk": -1}
    },
    "securityadvisor": {
        "lines": [
            "Security/Policy (Compliance Desk)",
            "",
            "Policy lens:",
            "• Missing citations + high confidence is a compliance hazard.",
            "• Escalate on missing context (location, circuit id, operator authorization).",
            "• Treat prompt injection as an incident class (coming in v1.4)."
        ],
        "effects": {"regHeat": -2, "risk": -1}
    },
}

@app.get("/api/agent/{agent_id}", response_model=InteractionResponse)
def agent(agent_id: str):
    script = AGENT_SCRIPTS.get(agent_id)
    if not script:
        raise HTTPException(status_code=404, detail="Unknown agent")
    return InteractionResponse(lines=script["lines"], effects=Effects(**script.get("effects", {})))


# ---------------- Reset / Clear Run ----------------

class ResetRequest(BaseModel):
    wipe_db: bool = True

def _candidate_db_paths() -> List[Path]:
    """
    Try the common locations:
      1) current working directory (where uvicorn was launched)
      2) alongside this file (apps/api)
      3) repo root (assuming apps/api/main.py)
    """
    here = Path(__file__).resolve()
    cwd = Path.cwd()
    api_dir = here.parent
    repo_root = here.parents[2] if len(here.parents) >= 3 else cwd

    return [
        cwd / "ai_lab.db",
        api_dir / "ai_lab.db",
        repo_root / "ai_lab.db",
    ]

def _delete_sqlite_files(db_path: Path) -> Dict[str, Any]:
    removed = []
    missing = []
    errors = []

    for p in [db_path, Path(str(db_path) + "-wal"), Path(str(db_path) + "-shm")]:
        try:
            if p.exists():
                p.unlink()
                removed.append(str(p))
            else:
                missing.append(str(p))
        except Exception as e:
            errors.append({"file": str(p), "error": str(e)})

    return {"removed": removed, "missing": missing, "errors": errors}

def _truncate_all_tables(db_path: Path) -> Dict[str, Any]:
    """
    If file deletion fails (locked, permissions, etc.), wipe all tables.
    """
    wiped_tables: List[str] = []
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [r[0] for r in cur.fetchall()]

        cur.execute("PRAGMA foreign_keys=OFF;")
        for t in tables:
            cur.execute(f'DELETE FROM "{t}";')
            wiped_tables.append(t)

        conn.commit()
        # shrink file
        cur.execute("VACUUM;")
        conn.commit()
    finally:
        conn.close()

    return {"wiped_tables": wiped_tables}

@app.post("/api/reset")
@app.post("/api/reset")
def reset_run(req: ResetRequest = Body(default=ResetRequest())):
    if not req.wipe_db:
        return {"ok": True, "wiped": False}

    candidates = _candidate_db_paths()
    results: List[Dict[str, Any]] = []

    # First attempt: delete db files wherever we find them
    for db in candidates:
        if db.exists() or Path(str(db) + "-wal").exists() or Path(str(db) + "-shm").exists():
            r = {"db": str(db), **_delete_sqlite_files(db)}
            results.append(r)

    # If nothing found, still report what we checked
    if not results:
        return {
            "ok": True,
            "wiped": False,
            "reason": "No db file found in expected locations",
            "checked": [str(p) for p in candidates],
        }

    # If deletion had errors but the main db still exists, truncate as fallback
    for r in results:
        db = Path(r["db"])
        if db.exists():
            try:
                r["truncate_fallback"] = _truncate_all_tables(db)
            except Exception as e:
                r["truncate_fallback_error"] = str(e)

    # ✅ ADD THIS BLOCK RIGHT HERE
    # Recreate empty DB + schema so subsequent API calls don't 500
    try:
        conn = connect()
        conn.close()
    except Exception as e:
        # Don't fail reset if schema init fails — frontend can still recover
        results.append({"schema_reinit_error": str(e)})

    # ✅ THEN RETURN
    return {"ok": True, "wiped": True, "results": results}

# ---------------- Telemetry helpers ----------------

_WINDOW_RE = re.compile(r"^(\d+)([smhd])$")


def _parse_window(window: str) -> timedelta:
    """Parse a simple window like '15m', '24h', '7d'."""
    m = _WINDOW_RE.match(window.strip())
    if not m:
        # default: 24 hours
        return timedelta(hours=24)
    n = int(m.group(1))
    unit = m.group(2)
    if unit == "s":
        return timedelta(seconds=n)
    if unit == "m":
        return timedelta(minutes=n)
    if unit == "h":
        return timedelta(hours=n)
    return timedelta(days=n)


def _percentile(values: List[int], p: float) -> Optional[int]:
    if not values:
        return None
    v = sorted(values)
    if len(v) == 1:
        return int(v[0])
    # nearest-rank
    k = max(0, min(len(v) - 1, int(round((p / 100.0) * (len(v) - 1)))))
    return int(v[k])


def _bucket_seconds(window_td: timedelta) -> int:
    sec = int(window_td.total_seconds())
    if sec <= 6 * 3600:
        return 5 * 60
    if sec <= 48 * 3600:
        return 30 * 60
    return 2 * 3600


# ---------------- RAG ----------------

@app.post("/api/rag/run", response_model=RagRunResponse)
def rag_run(req: RagRunRequest):
    t0 = time.perf_counter()
    q_tokens = tokenize(req.question)

    scored = []
    for d in DOCS:
        for chunk in chunk_text(d["text"], req.config.chunk_size):
            score = len(tokenize(chunk) & q_tokens)
            scored.append((score, d["id"], d["title"], chunk))

    scored.sort(reverse=True)
    top = scored[:req.config.top_k]

    retrieved = []
    citations = []
    evidence = 0

    for score, did, title, chunk in top:
        evidence += score
        cid = f"{did}:{len(retrieved)}"
        retrieved.append(
            RagRetrieved(
                id=cid,
                title=title,
                snippet=chunk[:220] + ("…" if len(chunk) > 220 else "")
            )
        )
        citations.append(cid)

    answer = (
        "Do not authorize automatic restart by default. "
        "Confirm circuit/location, verify relay state, "
        "and escalate if context is missing."
    )

    if req.config.require_citations:
        answer += " Evidence: " + ", ".join(f"[{c}]" for c in citations[:2])

    score = min(100, evidence * 12)
    passed = score >= 55

    effects = Effects(
        reliability=3 if passed else -2,
        risk=-3 if passed else 2,
        cost=1,
        regHeat=-2 if passed else 2,
    )

    run_id = insert_rag_run(
        passed=passed,
        score=score,
        config={
            "chunkSize": req.config.chunk_size,
            "topK": req.config.top_k,
            "requireCitations": req.config.require_citations,
        },
        answer=answer,
        citations=citations,
        retrieved=[r.model_dump() for r in retrieved],
    )

    created_at = get_rag_run(run_id)["created_at"]

    # Emit telemetry event (v1.10)
    try:
        insert_telemetry_event(
            scenario_id=DEFAULT_SCENARIO_ID,
            run_id=run_id,
            agent_id="rag",
            event_type="rag_run",
            success=True,
            latency_ms=int((time.perf_counter() - t0) * 1000),
            metadata={
                "passed": passed,
                "score": score,
                "citations": len(citations),
                "sources_used": len(retrieved),
                "config": {
                    "chunkSize": req.config.chunk_size,
                    "topK": req.config.top_k,
                    "requireCitations": req.config.require_citations,
                },
            },
        )
    except Exception:
        # Never let telemetry failures break gameplay.
        pass

    return RagRunResponse(
        lines=[f"RAG score {score} → {'PASS' if passed else 'FAIL'}", "", answer],
        effects=effects,
        rag=RagResult(
            passed=passed,
            score=score,
            answer=answer,
            citations=citations,
            retrieved=retrieved,
            config=req.config,
        ),
        runId=run_id,
        createdAt=created_at,
    )


# ---------------- Eval ----------------

@app.post("/api/eval/run", response_model=EvalRunResponse)
def eval_run(req: EvalRunRequest):
    t0 = time.perf_counter()
    base = 55 + (20 if req.ragPassed else 0)
    pass_rate = min(100, base + (req.ragScore - 55) // 2)

    failures = []
    if pass_rate < 80:
        failures.append(EvalFailure(id="E-01", reason="Insufficient grounding"))

    run_id = insert_eval_run(
        pass_rate=pass_rate,
        failures=[f.model_dump() for f in failures],
        rag_run_id=req.ragRunId,
        rag_score=req.ragScore,
        rag_passed=req.ragPassed,
    )

    created_at = get_eval_run(run_id)["created_at"]

    # Emit telemetry event (v1.10)
    try:
        insert_telemetry_event(
            scenario_id=DEFAULT_SCENARIO_ID,
            run_id=run_id,
            agent_id="eval",
            event_type="eval_run",
            success=True,
            latency_ms=int((time.perf_counter() - t0) * 1000),
            metadata={
                "passRate": pass_rate,
                "ragRunId": req.ragRunId,
                "ragScore": req.ragScore,
                "ragPassed": req.ragPassed,
                "failures": [f.model_dump() for f in failures],
            },
        )
    except Exception:
        pass

    return EvalRunResponse(
        lines=[f"Eval pass rate: {pass_rate}%"],
        effects=Effects(reliability=4 if pass_rate >= 80 else -2),
        eval=EvalResult(
            ran=True,
            passRate=pass_rate,
            failures=failures,
        ),
        runId=run_id,
        createdAt=created_at,
    )

# ---------------- Whiteboard ----------------

@app.post("/api/station/whiteboard", response_model=WhiteboardResponse)
def whiteboard(req: WhiteboardRequest):
    reasons: list[str] = []
    verdict: RefVerdict = "REVISE"

    # Required interactions
    if req.talkedToCount < 4:
        reasons.append("You have not consulted all four council members.")

    # RAG gate
    if not req.ragPassed:
        reasons.append("RAG Test Rig did not pass.")

    # Eval gate
    if req.evalPassRate < 80:
        reasons.append(f"Eval pass rate too low ({req.evalPassRate}% < 80%).")

    # Meter gates
    if req.meters.risk > 60:
        reasons.append(f"Risk too high ({req.meters.risk} > 60).")

    if req.meters.regHeat > 60:
        reasons.append(f"Regulatory heat too high ({req.meters.regHeat} > 60).")

    if req.meters.reliability < 55:
        reasons.append(f"Reliability too low ({req.meters.reliability} < 55).")

    # Final verdict logic
    if not reasons:
        verdict = "SHIP"
    elif req.meters.risk >= 80 or req.meters.regHeat >= 80:
        verdict = "BLOCK"

    effects = Effects(
        reliability=2 if verdict == "SHIP" else 0,
        risk=-1 if verdict == "SHIP" else (1 if verdict == "BLOCK" else 0),
        regHeat=-1 if verdict == "SHIP" else (1 if verdict == "BLOCK" else 0),
        cost=0,
    )

    lines = [
        "Whiteboard referee review complete.",
        "Verdict is based on evidence quality, safety escalation, and operational risk.",
    ]

    if verdict == "SHIP":
        lines += ["", "✅ SHIP approved.", "This release meets the current safety bar."]
    elif verdict == "BLOCK":
        lines += ["", "⛔ BLOCKED.", "Deployment would be unsafe under current conditions."]
    else:
        lines += ["", "⚠️ REVISE required.", "Address issues and resubmit for review."]

    return WhiteboardResponse(
        lines=lines,
        reasons=reasons,
        verdict=verdict,
        effects=effects,
    )


# ---------------- Artifacts ----------------

@app.get("/api/artifacts/rag")
def artifacts_rag(limit: int = 50):
    return [
        {
            "id": r["id"],
            "createdAt": r["created_at"],
            "passed": r["passed"],
            "score": r["score"],
            "config": r["config"],
        }
        for r in list_rag_runs(limit)
    ]


@app.get("/api/artifacts/eval")
def artifacts_eval(limit: int = 50):
    return [
        {
            "id": r["id"],
            "createdAt": r["created_at"],
            "passRate": r["passRate"],
            "ragRunId": r["ragRunId"],
            "ragScore": r["ragScore"],
            "ragPassed": r["ragPassed"],
        }
        for r in list_eval_runs(limit)
    ]


# ---------------- Telemetry API (v1.10) ----------------

@app.post("/api/telemetry/event", response_model=TelemetryIngestResponse)
def telemetry_event(payload: Any = Body(...)):
    """
    Ingest 1 or many events.

    Supports:
      - single event { ... }
      - batch [ { ... }, ... ]
    """
    events_raw = payload if isinstance(payload, list) else [payload]

    ids: List[str] = []
    for raw in events_raw:
        # Validate using your Pydantic model (wherever it is defined in this file)
        evt = TelemetryEventIn.model_validate(raw)

        ids.append(
            insert_telemetry_event(
                scenario_id=evt.scenario_id,
                run_id=evt.run_id,
                agent_id=evt.agent_id,
                event_type=evt.event_type,
                success=bool(evt.success),
                latency_ms=evt.latency_ms,
                metadata=evt.metadata,
            )
        )

    return TelemetryIngestResponse(ok=True, ids=ids)


@app.get("/api/telemetry/summary", response_model=TelemetrySummary)
def telemetry_summary(scenarioId: str = DEFAULT_SCENARIO_ID, window: str = "24h"):
    td = _parse_window(window)
    since = (datetime.now(timezone.utc) - td).isoformat()
    events = list_telemetry_events(scenario_id=scenarioId, since_iso=since, limit=5000)

    latencies = [int(e["latency_ms"]) for e in events if e.get("latency_ms") is not None]
    total = len(events)
    errors = sum(1 for e in events if not e.get("success", True))

    esc = 0
    for e in events:
        if e.get("event_type") == "escalation":
            esc += 1
        else:
            md = e.get("metadata") or {}
            if md.get("escalated") is True:
                esc += 1

    cit_total = 0
    cit_covered = 0
    for e in events:
        if e.get("event_type") in ("rag_run", "response"):
            md = e.get("metadata") or {}
            if "citations" in md:
                cit_total += 1
                if int(md.get("citations") or 0) > 0:
                    cit_covered += 1

    return TelemetrySummary(
        scenarioId=scenarioId,
        window=window,
        latencyP50=_percentile(latencies, 50),
        latencyP95=_percentile(latencies, 95),
        errorRate=(errors / total) if total else 0.0,
        escalationRate=(esc / total) if total else 0.0,
        citationCoverage=(cit_covered / cit_total) if cit_total else 0.0,
        totalEvents=total,
    )


@app.get("/api/telemetry/timeseries", response_model=List[TelemetryPoint])
def telemetry_timeseries(
    metric: str,
    scenarioId: str = DEFAULT_SCENARIO_ID,
    window: str = "24h",
):
    td = _parse_window(window)
    since_dt = datetime.now(timezone.utc) - td
    since = since_dt.isoformat()
    events = list_telemetry_events(scenario_id=scenarioId, since_iso=since, limit=20000)

    bucket_sec = _bucket_seconds(td)

    def bucket_key(dt: datetime) -> int:
        return int(dt.timestamp() // bucket_sec) * bucket_sec

    buckets: Dict[int, List[float]] = {}
    for e in events:
        try:
            dt = datetime.fromisoformat(e["created_at"].replace("Z", "+00:00"))
        except Exception:
            continue
        k = bucket_key(dt)
        buckets.setdefault(k, [])

        md = e.get("metadata") or {}
        if metric in ("latency_p95", "latency_p50", "latency"):
            if e.get("latency_ms") is not None:
                buckets[k].append(float(e["latency_ms"]))
        elif metric == "error_rate":
            buckets[k].append(0.0 if e.get("success", True) else 1.0)
        elif metric == "escalation_rate":
            is_esc = e.get("event_type") == "escalation" or bool(md.get("escalated"))
            buckets[k].append(1.0 if is_esc else 0.0)
        elif metric == "citation_coverage":
            if e.get("event_type") in ("rag_run", "response") and "citations" in md:
                buckets[k].append(1.0 if int(md.get("citations") or 0) > 0 else 0.0)
        elif metric == "eval_pass_rate":
            if e.get("event_type") == "eval_run" and "passRate" in md:
                buckets[k].append(float(md.get("passRate")))

    points: List[TelemetryPoint] = []
    for k in sorted(buckets.keys()):
        vals = buckets[k]
        if not vals:
            continue

        if metric in ("latency_p95", "latency_p50"):
            ints = [int(x) for x in vals]
            p = 95 if metric == "latency_p95" else 50
            v = float(_percentile(ints, p) or 0)
        elif metric.endswith("_rate") or metric == "citation_coverage":
            v = sum(vals) / len(vals)
        else:
            v = sum(vals) / len(vals)

        ts = datetime.fromtimestamp(k, tz=timezone.utc).isoformat()
        points.append(TelemetryPoint(timestamp=ts, value=v))

    return points



@app.on_event("startup")
def startup():
    init_db()
