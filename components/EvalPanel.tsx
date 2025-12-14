
"use client";

import { useState } from "react";
import { apiPost } from "../lib/api";
import { useGameStore } from "../lib/store";

type EvalRunResponse = {
  lines: string[];
  effects?: { reliability?: number; cost?: number; risk?: number; regHeat?: number };
  eval: { ran: boolean; passRate: number; failures: { id: string; reason: string }[] };
  runId: string;
  createdAt: string;
};

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function EvalPanel() {
  const open = useGameStore((s) => s.showEvalPanel);
  const setOpen = useGameStore((s) => s.setShowEvalPanel);
  const setDialogue = useGameStore((s) => s.setDialogue);
  const setEval = useGameStore((s) => s.setEval);
  const applyEffects = useGameStore((s) => s.applyEffects);
  const setShowEvalResults = useGameStore((s) => s.setShowEvalResults);

  const rag = useGameStore((s) => s.rag);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const payload = {
        ragScore: rag?.score ?? 0,
        ragPassed: rag?.passed ?? false,
        ragRunId: rag?.id ?? null
      };
      const res = await apiPost<EvalRunResponse>("/api/eval/run", payload);
      setEval({ ...res.eval, id: res.runId, createdAt: res.createdAt });
      applyEffects(res.effects);
      setDialogue({ title: "Eval Suite Results", lines: res.lines });
      setShowEvalResults(true);
    } catch (e: any) {
      setDialogue({
        title: "Eval error",
        lines: ["Could not run eval suite. Is FastAPI running?", "", `Details: ${e?.message ?? e}`]
      });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 40,
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
          width: "min(820px, 95vw)",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: "3px solid rgba(56,189,248,0.65)",
          borderRadius: 14,
          padding: 16,
          fontFamily: mono,
          color: "#e5e7eb",
          boxShadow: "0 30px 90px rgba(0,0,0,0.6)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, color: "#a5b4fc" }}>EVAL TERMINAL – MINI SUITE</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Run a small eval suite that checks: citations, escalation, and policy compliance.
            </div>
          </div>
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

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.9, lineHeight: 1.45 }}>
          <div style={{ fontWeight: 800, color: "#7dd3fc" }}>What this simulates</div>
          <ul style={{ margin: "6px 0 0 18px" }}>
            <li>Eval set (&gt;= 10 cases) as a release gate</li>
            <li>Failure analysis (why did it fail?)</li>
            <li>Tradeoffs: reliability vs speed/cost</li>
          </ul>
          <div style={{ marginTop: 10 }}>
            Current RAG status:{" "}
            <b style={{ color: rag?.passed ? "#86efac" : "#fca5a5" }}>
              {rag ? (rag.passed ? `PASS (${rag.score})` : `FAIL (${rag.score})`) : "— not run —"}
            </b>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button
            onClick={run}
            disabled={busy}
            style={{
              border: "1px solid rgba(165,180,252,0.35)",
              background: busy ? "rgba(165,180,252,0.10)" : "rgba(165,180,252,0.22)",
              color: "#e5e7eb",
              borderRadius: 12,
              padding: "10px 14px",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 900,
              letterSpacing: 0.4
            }}
          >
            {busy ? "RUNNING…" : "RUN EVAL SUITE"}
          </button>
        </div>
      </div>
    </div>
  );
}
