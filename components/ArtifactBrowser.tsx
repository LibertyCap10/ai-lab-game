
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { useGameStore } from "../lib/store";

type RagSummary = {
  id: string;
  created_at: string;
  passed: boolean;
  score: number;
  config: any;
};

type RagFull = {
  id: string;
  created_at: string;
  passed: boolean;
  score: number;
  config: any;
  answer: string;
  citations: string[];
  retrieved: { id: string; title: string; snippet: string }[];
};

type EvalSummary = {
  id: string;
  created_at: string;
  passRate: number;
  ragRunId?: string | null;
  ragScore: number;
  ragPassed: boolean;
};

type EvalFull = {
  id: string;
  created_at: string;
  passRate: number;
  failures: { id: string; reason: string }[];
  ragRunId?: string | null;
  ragScore: number;
  ragPassed: boolean;
};

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function fmt(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

export default function ArtifactBrowser() {
  const open = useGameStore((s) => s.showArtifactBrowser);
  const setOpen = useGameStore((s) => s.setShowArtifactBrowser);

  const setRag = useGameStore((s) => s.setRag);
  const setEval = useGameStore((s) => s.setEval);
  const setShowRagResults = useGameStore((s) => s.setShowRagResults);
  const setShowEvalResults = useGameStore((s) => s.setShowEvalResults);

  const [tab, setTab] = useState<"rag" | "eval">("rag");
  const [ragList, setRagList] = useState<RagSummary[]>([]);
  const [evalList, setEvalList] = useState<EvalSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const [rags, evals] = await Promise.all([
        apiGet<RagSummary[]>("/api/artifacts/rag?limit=50"),
        apiGet<EvalSummary[]>("/api/artifacts/eval?limit=50")
      ]);
      setRagList(rags);
      setEvalList(evals);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  async function openRag(id: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await apiGet<RagFull>(`/api/artifacts/rag/${id}`);
      setRag({
        id: r.id,
        createdAt: r.created_at,
        passed: r.passed,
        score: r.score,
        answer: r.answer,
        citations: r.citations,
        retrieved: r.retrieved,
        config: r.config
      });
      setShowRagResults(true);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function openEval(id: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await apiGet<EvalFull>(`/api/artifacts/eval/${id}`);
      setEval({
        id: r.id,
        createdAt: r.created_at,
        ran: true,
        passRate: r.passRate,
        failures: r.failures
      });
      setShowEvalResults(true);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  const header = useMemo(() => {
    const ragCount = ragList.length;
    const evalCount = evalList.length;
    return `Artifacts: ${ragCount} RAG runs · ${evalCount} Eval runs`;
  }, [ragList.length, evalList.length]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.58)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={() => !busy && setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1040px, 96vw)",
          maxHeight: "88vh",
          overflow: "auto",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: "3px solid rgba(253,230,138,0.45)",
          borderRadius: 14,
          padding: 16,
          fontFamily: mono,
          color: "#e5e7eb",
          boxShadow: "0 30px 90px rgba(0,0,0,0.65)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, color: "#fde68a" }}>ARTIFACT BROWSER</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              {header} — click an entry to open its full viewer.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              disabled={busy}
              onClick={refresh}
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: busy ? "not-allowed" : "pointer"
              }}
            >
              Refresh
            </button>
            <button
              disabled={busy}
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: busy ? "not-allowed" : "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setTab("rag")}
            disabled={busy}
            style={{
              border: "1px solid rgba(56,189,248,0.35)",
              background: tab === "rag" ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.06)",
              color: "#e5e7eb",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12
            }}
          >
            RAG Runs
          </button>
          <button
            onClick={() => setTab("eval")}
            disabled={busy}
            style={{
              border: "1px solid rgba(165,180,252,0.35)",
              background: tab === "eval" ? "rgba(165,180,252,0.16)" : "rgba(255,255,255,0.06)",
              color: "#e5e7eb",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12
            }}
          >
            Eval Runs
          </button>
        </div>

        {error ? (
          <div style={{ marginTop: 12, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.10)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 900, color: "#fca5a5" }}>Error</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.95 }}>{error}</div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Make sure FastAPI is running on port 8000.</div>
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {tab === "rag" ? (
            ragList.length ? (
              ragList.map((r) => (
                <button
                  key={r.id}
                  disabled={busy}
                  onClick={() => openRag(r.id)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#e5e7eb",
                    cursor: busy ? "not-allowed" : "pointer"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: r.passed ? "#86efac" : "#fca5a5" }}>
                      {r.passed ? "PASS" : "FAIL"} · {r.score}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{fmt(r.created_at)} · id:{r.id}</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                    chunkSize=<b>{r.config?.chunkSize}</b> · topK=<b>{r.config?.topK}</b> · citations=<b>{r.config?.requireCitations ? "ON" : "OFF"}</b>
                  </div>
                </button>
              ))
            ) : (
              <div style={{ fontSize: 12, opacity: 0.8 }}>No RAG artifacts yet — run the Server Rack.</div>
            )
          ) : evalList.length ? (
            evalList.map((e) => (
              <button
                key={e.id}
                disabled={busy}
                onClick={() => openEval(e.id)}
                style={{
                  textAlign: "left",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e5e7eb",
                  cursor: busy ? "not-allowed" : "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900, color: e.passRate >= 80 ? "#86efac" : "#fca5a5" }}>
                    {e.passRate >= 80 ? "PASS" : "FAIL"} · {e.passRate}%
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{fmt(e.created_at)} · id:{e.id}</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                  tiedToRAG=<b>{e.ragRunId ?? "—"}</b> · ragScore=<b>{e.ragScore}</b> · ragPassed=<b>{e.ragPassed ? "yes" : "no"}</b>
                </div>
              </button>
            ))
          ) : (
            <div style={{ fontSize: 12, opacity: 0.8 }}>No Eval artifacts yet — run the Eval Terminal.</div>
          )}
        </div>
      </div>
    </div>
  );
}
