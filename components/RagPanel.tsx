
"use client";

import { useMemo, useState } from "react";
import { apiPost } from "../lib/api";
import { RagConfig, RagResult, useGameStore } from "../lib/store";

type RagRunResponse = {
  lines: string[];
  effects?: { reliability?: number; cost?: number; risk?: number; regHeat?: number };
  rag: RagResult;
  runId: string;
  createdAt: string;
};

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function RagPanel() {
  const open = useGameStore((s) => s.showRagPanel);
  const setOpen = useGameStore((s) => s.setShowRagPanel);
  const setDialogue = useGameStore((s) => s.setDialogue);
  const setRag = useGameStore((s) => s.setRag);
  const applyEffects = useGameStore((s) => s.applyEffects);
  const setShowRagResults = useGameStore((s) => s.setShowRagResults);

  const [chunkSize, setChunkSize] = useState<RagConfig["chunkSize"]>("medium");
  const [topK, setTopK] = useState<RagConfig["topK"]>(5);
  const [requireCitations, setRequireCitations] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);

  const config: RagConfig = useMemo(
    () => ({ chunkSize, topK, requireCitations }),
    [chunkSize, topK, requireCitations]
  );

  async function run() {
    setBusy(true);
    try {
      const payload = {
        config,
        question:
          "During an outage, the operator asks: 'Can I restart the feeder automatically?'. What do we do?"
      };
      const res = await apiPost<RagRunResponse>("/api/rag/run", payload);
      setRag({ ...res.rag, id: res.runId, createdAt: res.createdAt });
      applyEffects(res.effects);
      setDialogue({ title: "RAG Test Rig Result", lines: res.lines });
      setShowRagResults(true);
    } catch (e: any) {
      setDialogue({
        title: "RAG Test Rig error",
        lines: [
          "Could not run RAG test. Is FastAPI running?",
          "",
          `Details: ${e?.message ?? e}`
        ]
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
          width: "min(780px, 95vw)",
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
            <div style={{ fontWeight: 900, color: "#67e8f9" }}>SERVER RACK – RAG TEST RIG</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Tune retrieval settings. Your goal is grounded, compliant answers with citations.
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

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 800 }}>Chunk Size</div>
              <select
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value as any)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 10,
                  color: "#e5e7eb"
                }}
              >
                <option value="small">Small (more precise, slower)</option>
                <option value="medium">Medium (balanced)</option>
                <option value="large">Large (faster, riskier)</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 800 }}>Top-K</div>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value) as any)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 10,
                  color: "#e5e7eb"
                }}
              >
                <option value={3}>3 (fast)</option>
                <option value={5}>5 (balanced)</option>
                <option value={8}>8 (safer but slower)</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 800 }}>Require citations</div>
              <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={requireCitations}
                  onChange={(e) => setRequireCitations(e.target.checked)}
                />
                <span style={{ fontSize: 12, opacity: 0.9 }}>
                  If off, you may pass speed but increase hallucination risk.
                </span>
              </label>
            </div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.35 }}>
            <div style={{ fontWeight: 800, color: "#7dd3fc" }}>Test prompt</div>
            <div style={{ marginTop: 4 }}>
              “During an outage, the operator asks: <b>Can I restart the feeder automatically?</b> What do we do?”
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button
            onClick={run}
            disabled={busy}
            style={{
              border: "1px solid rgba(103,232,249,0.35)",
              background: busy ? "rgba(103,232,249,0.12)" : "rgba(103,232,249,0.22)",
              color: "#e5e7eb",
              borderRadius: 12,
              padding: "10px 14px",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 900,
              letterSpacing: 0.4
            }}
          >
            {busy ? "RUNNING…" : "RUN TEST"}
          </button>
        </div>
      </div>
    </div>
  );
}
