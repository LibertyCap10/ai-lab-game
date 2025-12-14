
"use client";

import { useMemo } from "react";
import { useGameStore } from "../lib/store";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function RagResultsViewer() {
  const open = useGameStore((s) => s.showRagResults);
  const setOpen = useGameStore((s) => s.setShowRagResults);
  const rag = useGameStore((s) => s.rag);

  const status = useMemo(() => {
    if (!rag) return { label: "—", color: "#fde68a" };
    return rag.passed ? { label: `PASS (${rag.score})`, color: "#86efac" } : { label: `FAIL (${rag.score})`, color: "#fca5a5" };
  }, [rag]);

  if (!open) return null;

  return (
    <div
      // ...everything else unchanged...

      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 90, // ✅ was 45
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}

      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 96vw)",
          maxHeight: "88vh",
          overflow: "auto",
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
            <div style={{ fontWeight: 900, color: "#67e8f9" }}>RAG RESULTS VIEWER</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Inspect retrieved evidence + citations and see the answer that was generated.
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "#e5e7eb",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>

        {!rag ? (
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.9 }}>
            No RAG run yet. Interact with the <b>Server Rack</b> and run the test rig.
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                alignItems: "start"
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: 12
                }}
              >
                <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Run Summary</div>
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
                  <div>
                    Status: <b style={{ color: status.color }}>{status.label}</b>
                  </div>
                  <div>
                    Config: <b>{rag.config.chunkSize}</b> chunks · <b>topK={rag.config.topK}</b> · citations{" "}
                    <b>{rag.config.requireCitations ? "ON" : "OFF"}</b>
                  </div>
                  <div>
                    Artifact: <b>{rag.id ?? "—"}</b> · <span style={{ opacity: 0.8 }}>{rag.createdAt ? new Date(rag.createdAt).toLocaleString() : ""}</span>
                  </div>
                  <div>
                    Citations returned: <b>{rag.citations.length}</b>
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: 12
                }}
              >
                <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Citations</div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.95, lineHeight: 1.5 }}>
                  {rag.citations.length ? (
                    rag.citations.map((c) => <div key={c}>• [{c}]</div>)
                  ) : (
                    <div style={{ opacity: 0.8 }}>No citations (citations were disabled or retrieval failed).</div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 12
              }}
            >
              <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Answer</div>
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{rag.answer}</div>
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 12
              }}
            >
              <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Retrieved Evidence</div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {rag.retrieved.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(2,6,23,0.35)",
                      borderRadius: 12,
                      padding: 12
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontWeight: 900, color: "#7dd3fc" }}>{r.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>[{r.id}]</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.95, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                      {r.snippet}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
