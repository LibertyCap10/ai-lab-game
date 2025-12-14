
"use client";

import { useMemo } from "react";
import { useGameStore } from "../lib/store";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function pill(ok: boolean, labelOk: string, labelBad: string) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.14)",
        color: ok ? "#86efac" : "#fca5a5"
      }}
    >
      {ok ? labelOk : labelBad}
    </span>
  );
}

export default function ReleaseChecklist() {
  const open = useGameStore((s) => s.showReleaseChecklist);
  const setOpen = useGameStore((s) => s.setShowReleaseChecklist);

  const review = useGameStore((s) => s.releaseReview);
  const meters = useGameStore((s) => s.meters);
  const talkedTo = useGameStore((s) => s.talkedTo);
  const rag = useGameStore((s) => s.rag);
  const evalRes = useGameStore((s) => s.eval);
  const verdict = useGameStore((s) => s.verdict);

  const setShowRagResults = useGameStore((s) => s.setShowRagResults);
  const setShowEvalResults = useGameStore((s) => s.setShowEvalResults);

  const talkedCount = Object.values(talkedTo).filter(Boolean).length;

  const gates = useMemo(() => {
    const g1 = talkedCount >= 4;
    const g2 = !!rag?.passed;
    const g3 = (evalRes?.passRate ?? 0) >= 80;
    const g4 = verdict === "SHIP";
    const g5 = meters.risk <= 60 && meters.regHeat <= 60 && meters.reliability >= 55;
    return { g1, g2, g3, g4, g5 };
  }, [talkedCount, rag, evalRes, verdict, meters]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.58)",
        zIndex: 60,
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
          width: "min(1040px, 96vw)",
          maxHeight: "88vh",
          overflow: "auto",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: "3px solid rgba(125,211,252,0.55)",
          borderRadius: 14,
          padding: 16,
          fontFamily: mono,
          color: "#e5e7eb",
          boxShadow: "0 30px 90px rgba(0,0,0,0.65)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, color: "#67e8f9" }}>WHITEBOARD — RELEASE CHECKLIST</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              A gatekeeper view: artifacts → evals → thresholds → verdict.
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

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12 }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 12,
              padding: 12
            }}
          >
            <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Gates</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>Consult council (4/4)</div>
                {pill(gates.g1, "OK", `${talkedCount}/4`)}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>RAG test passes</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>({(rag as any)?.id ?? "—"})</span>
                  <button
                    onClick={() => setShowRagResults(true)}
                    disabled={!rag}
                    style={{
                      border: "1px solid rgba(56,189,248,0.35)",
                      background: rag ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.06)",
                      color: "#e5e7eb",
                      borderRadius: 10,
                      padding: "6px 8px",
                      cursor: rag ? "pointer" : "not-allowed",
                      fontWeight: 900,
                      fontSize: 12
                    }}
                  >
                    View RAG Artifact
                  </button>
                </div>
                {pill(gates.g2, "PASS", "FAIL")}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>Eval suite ≥ 80%</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>({(evalRes as any)?.id ?? "—"})</span>
                  <button
                    onClick={() => setShowEvalResults(true)}
                    disabled={!evalRes}
                    style={{
                      border: "1px solid rgba(165,180,252,0.35)",
                      background: evalRes ? "rgba(165,180,252,0.14)" : "rgba(255,255,255,0.06)",
                      color: "#e5e7eb",
                      borderRadius: 10,
                      padding: "6px 8px",
                      cursor: evalRes ? "pointer" : "not-allowed",
                      fontWeight: 900,
                      fontSize: 12
                    }}
                  >
                    View Eval Artifact
                  </button>
                </div>
                {pill(gates.g3, "PASS", `${evalRes?.passRate ?? 0}%`)}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>Thresholds</div>
                {pill(gates.g5, "OK", "FAIL")}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>Referee verdict</div>
                <span
                  style={{
                    fontWeight: 900,
                    color: verdict === "SHIP" ? "#86efac" : verdict === "BLOCK" ? "#fca5a5" : "#fde68a"
                  }}
                >
                  {verdict ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 12
              }}
            >
              <div style={{ fontWeight: 900, color: "#7dd3fc" }}>Meters</div>
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.7, opacity: 0.95 }}>
                <div>Reliability: <b>{meters.reliability}</b> (need ≥ 55)</div>
                <div>Risk: <b>{meters.risk}</b> (need ≤ 60)</div>
                <div>Reg Heat: <b>{meters.regHeat}</b> (need ≤ 60)</div>
                <div>Cost: <b>{meters.cost}</b></div>
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
              <div style={{ fontWeight: 900, color: "#a5b4fc" }}>Referee Notes</div>
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.55, opacity: 0.95 }}>
                {review ? (
                  <>
                    <div style={{ opacity: 0.9 }}>{review.lines.join(" ")}</div>
                    {review.reasons?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 900, color: "#fde68a" }}>Reasons</div>
                        <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                          {review.reasons.map((r, i) => (
                            <div key={i}>• {r}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, color: "#86efac", fontWeight: 900 }}>No issues found.</div>
                    )}
                  </>
                ) : (
                  <div style={{ opacity: 0.85 }}>No review run yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
          Tip: This mirrors real release practice—artifacts (RAG/eval) + thresholds → ship decision.
        </div>
      </div>
    </div>
  );
}
