
"use client";

import { useMemo } from "react";
import { useGameStore } from "../lib/store";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function EvalResultsViewer() {
  const open = useGameStore((s) => s.showEvalResults);
  const setOpen = useGameStore((s) => s.setShowEvalResults);
  const evalRes = useGameStore((s) => s.eval);

  const status = useMemo(() => {
    if (!evalRes) return { label: "—", color: "#fde68a" };
    const pass = evalRes.passRate >= 80;
    return pass ? { label: `PASS (${evalRes.passRate}%)`, color: "#86efac" } : { label: `FAIL (${evalRes.passRate}%)`, color: "#fca5a5" };
  }, [evalRes]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 46,
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
          border: "3px solid rgba(165,180,252,0.65)",
          borderRadius: 14,
          padding: 16,
          fontFamily: mono,
          color: "#e5e7eb",
          boxShadow: "0 30px 90px rgba(0,0,0,0.6)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, color: "#a5b4fc" }}>EVAL RESULTS VIEWER</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Inspect eval pass-rate and the top failure reasons (release gate).
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

        {!evalRes ? (
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.9 }}>
            No eval run yet. Interact with the <b>Eval Terminal</b> and run the suite.
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 12
              }}
            >
              <div style={{ fontWeight: 900, color: "#7dd3fc" }}>Summary</div>
              <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6 }}>
                <div>
                  Status: <b style={{ color: status.color }}>{status.label}</b>
                </div>
                <div>
                  Gate: <b>pass-rate ≥ 80%</b>
                </div>
                <div>
                  Artifact: <b>{(evalRes as any)?.id ?? "—"}</b> · <span style={{ opacity: 0.8 }}>{(evalRes as any)?.createdAt ? new Date((evalRes as any).createdAt).toLocaleString() : ""}</span>
                </div>
                <div style={{ opacity: 0.85 }}>
                  Note: In a real pipeline, each failure links to a test case + trace. Here we show the *shape* of that workflow.
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
              <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Failures</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {evalRes.failures.length ? (
                  evalRes.failures.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(2,6,23,0.35)",
                        borderRadius: 12,
                        padding: 12
                      }}
                    >
                      <div style={{ fontWeight: 900, color: "#fde68a" }}>{f.id}</div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.95, lineHeight: 1.45 }}>
                        {f.reason}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.85 }}>No failures reported.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
