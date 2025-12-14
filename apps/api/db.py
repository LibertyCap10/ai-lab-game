from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = os.getenv("AI_LAB_DB_PATH", os.path.join(os.getcwd(), "apps", "api", "ai_lab.db"))

def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    ensure_schema(conn)
    return conn

def init_db() -> None:
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rag_runs (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          passed INTEGER NOT NULL,
          score INTEGER NOT NULL,
          config_json TEXT NOT NULL,
          answer TEXT NOT NULL,
          citations_json TEXT NOT NULL,
          retrieved_json TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS eval_runs (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          pass_rate INTEGER NOT NULL,
          failures_json TEXT NOT NULL,
          rag_run_id TEXT,
          rag_score INTEGER NOT NULL,
          rag_passed INTEGER NOT NULL
        )
        """
    )

    # ---------------- Telemetry (v1.10) ----------------
    # Keep schema flexible via metadata_json.
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS telemetry_events (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          run_id TEXT,
          agent_id TEXT,
          event_type TEXT NOT NULL,
          latency_ms INTEGER,
          success INTEGER NOT NULL,
          metadata_json TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


# ---------------- Telemetry helpers ----------------

def insert_telemetry_event(
    *,
    scenario_id: str,
    event_type: str,
    success: bool,
    latency_ms: Optional[int] = None,
    run_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    event_id = uuid.uuid4().hex[:16]
    conn = connect()
    conn.execute(
        """INSERT INTO telemetry_events (id, created_at, scenario_id, run_id, agent_id, event_type, latency_ms, success, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            event_id,
            _utcnow_iso(),
            scenario_id,
            run_id,
            agent_id,
            event_type,
            int(latency_ms) if latency_ms is not None else None,
            1 if success else 0,
            json.dumps(metadata or {}),
        ),
    )
    conn.commit()
    conn.close()
    return event_id


def list_telemetry_events(
    *,
    scenario_id: Optional[str] = None,
    since_iso: Optional[str] = None,
    limit: int = 2000,
) -> List[Dict[str, Any]]:
    where = []
    params: List[Any] = []
    if scenario_id:
        where.append("scenario_id = ?")
        params.append(scenario_id)
    if since_iso:
        where.append("datetime(created_at) >= datetime(?)")
        params.append(since_iso)

    sql = "SELECT * FROM telemetry_events"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY datetime(created_at) ASC LIMIT ?"
    params.append(int(limit))

    conn = connect()
    rows = conn.execute(sql, tuple(params)).fetchall()
    conn.close()

    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "created_at": r["created_at"],
                "scenario_id": r["scenario_id"],
                "run_id": r["run_id"],
                "agent_id": r["agent_id"],
                "event_type": r["event_type"],
                "latency_ms": r["latency_ms"],
                "success": bool(r["success"]),
                "metadata": json.loads(r["metadata_json"] or "{}"),
            }
        )
    return out

def insert_rag_run(*, passed: bool, score: int, config: Dict[str, Any], answer: str, citations: List[str], retrieved: list[dict]) -> str:
    run_id = uuid.uuid4().hex[:12]
    conn = connect()
    conn.execute(
        """INSERT INTO rag_runs (id, created_at, passed, score, config_json, answer, citations_json, retrieved_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            run_id,
            _utcnow_iso(),
            1 if passed else 0,
            int(score),
            json.dumps(config),
            answer,
            json.dumps(citations),
            json.dumps(retrieved),
        ),
    )
    conn.commit()
    conn.close()
    return run_id

def list_rag_runs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = connect()
    rows = conn.execute(
        """SELECT id, created_at, passed, score, config_json
           FROM rag_runs
           ORDER BY datetime(created_at) DESC
           LIMIT ?""",
        (int(limit),),
    ).fetchall()
    conn.close()
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append({
            "id": r["id"],
            "created_at": r["created_at"],
            "passed": bool(r["passed"]),
            "score": int(r["score"]),
            "config": json.loads(r["config_json"]),
        })
    return out

def get_rag_run(run_id: str) -> Optional[Dict[str, Any]]:
    conn = connect()
    row = conn.execute(
        """SELECT * FROM rag_runs WHERE id = ?""",
        (run_id,),
    ).fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "passed": bool(row["passed"]),
        "score": int(row["score"]),
        "config": json.loads(row["config_json"]),
        "answer": row["answer"],
        "citations": json.loads(row["citations_json"]),
        "retrieved": json.loads(row["retrieved_json"]),
    }

def insert_eval_run(*, pass_rate: int, failures: List[Dict[str, Any]], rag_run_id: Optional[str], rag_score: int, rag_passed: bool) -> str:
    run_id = uuid.uuid4().hex[:12]
    conn = connect()
    conn.execute(
        """INSERT INTO eval_runs (id, created_at, pass_rate, failures_json, rag_run_id, rag_score, rag_passed)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            run_id,
            _utcnow_iso(),
            int(pass_rate),
            json.dumps(failures),
            rag_run_id,
            int(rag_score),
            1 if rag_passed else 0,
        ),
    )
    conn.commit()
    conn.close()
    return run_id

def list_eval_runs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = connect()
    rows = conn.execute(
        """SELECT id, created_at, pass_rate, rag_run_id, rag_score, rag_passed
           FROM eval_runs
           ORDER BY datetime(created_at) DESC
           LIMIT ?""",
        (int(limit),),
    ).fetchall()
    conn.close()
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append({
            "id": r["id"],
            "created_at": r["created_at"],
            "passRate": int(r["pass_rate"]),
            "ragRunId": r["rag_run_id"],
            "ragScore": int(r["rag_score"]),
            "ragPassed": bool(r["rag_passed"]),
        })
    return out

def get_eval_run(run_id: str) -> Optional[Dict[str, Any]]:
    conn = connect()
    row = conn.execute(
        """SELECT * FROM eval_runs WHERE id = ?""",
        (run_id,),
    ).fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "passRate": int(row["pass_rate"]),
        "failures": json.loads(row["failures_json"]),
        "ragRunId": row["rag_run_id"],
        "ragScore": int(row["rag_score"]),
        "ragPassed": bool(row["rag_passed"]),
    }


def ensure_schema(conn: sqlite3.Connection) -> None:
    """
    Ensure all required tables exist. Safe to call repeatedly.
    Must match the columns used by insert_* functions.
    """
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS rag_runs (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          passed INTEGER NOT NULL,
          score INTEGER NOT NULL,
          config_json TEXT NOT NULL,
          answer TEXT NOT NULL,
          citations_json TEXT NOT NULL,
          retrieved_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS eval_runs (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          pass_rate INTEGER NOT NULL,
          failures_json TEXT NOT NULL,
          rag_run_id TEXT,
          rag_score INTEGER NOT NULL,
          rag_passed INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS telemetry_events (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          run_id TEXT,
          agent_id TEXT,
          event_type TEXT NOT NULL,
          latency_ms INTEGER,
          success INTEGER NOT NULL,
          metadata_json TEXT NOT NULL
        );
        """
    )
    conn.commit()

