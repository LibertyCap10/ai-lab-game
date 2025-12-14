"use client";

import { useEffect } from "react";
import { useGameStore } from "../lib/store";
import { meterBar } from "../lib/ui";
import RagPanel from "./RagPanel";
import EvalPanel from "./EvalPanel";
import RagResultsViewer from "./RagResultsViewer";
import EvalResultsViewer from "./EvalResultsViewer";
import ReleaseChecklist from "./ReleaseChecklist";
import BookViewer from "./BookViewer";
import ArtifactBrowser from "./ArtifactBrowser";
import TelemetryDashboard from "./TelemetryDashboard";
import WhiteboardPanel from "./WhiteboardPanel"; // ✅ ADD


const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function Panel({
  title,
  children,
  style
}: {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(2,6,23,0.92), rgba(2,6,23,0.78))",
        border: "2px solid rgba(56,189,248,0.55)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        borderRadius: 10,
        padding: 10,
        color: "#e5e7eb",
        fontFamily: mono,
        ...style
      }}
    >
      {title ? (
        <div style={{ fontWeight: 800, letterSpacing: 0.5, marginBottom: 6, color: "#7dd3fc" }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default function HUD() {
  const mission = useGameStore((s) => s.mission);
  const meters = useGameStore((s) => s.meters);

  const dialogue = useGameStore((s) => s.dialogue);
  const setDialogue = useGameStore((s) => s.setDialogue);

  const talkedTo = useGameStore((s) => s.talkedTo);
  const rag = useGameStore((s) => s.rag);
  const evalRes = useGameStore((s) => s.eval);
  const verdict = useGameStore((s) => s.verdict);

  const showRagPanel = useGameStore((s) => s.showRagPanel);
  const setShowRagPanel = useGameStore((s) => s.setShowRagPanel);

  const showEvalPanel = useGameStore((s) => s.showEvalPanel);
  const setShowEvalPanel = useGameStore((s) => s.setShowEvalPanel);

  const showRagResults = useGameStore((s) => s.showRagResults);
  const setShowRagResults = useGameStore((s) => s.setShowRagResults);

  const showEvalResults = useGameStore((s) => s.showEvalResults);
  const setShowEvalResults = useGameStore((s) => s.setShowEvalResults);

  const showReleaseChecklist = useGameStore((s) => s.showReleaseChecklist);
  const setShowReleaseChecklist = useGameStore((s) => s.setShowReleaseChecklist);

  const showBookViewer = useGameStore((s) => s.showBookViewer);
  const setShowBookViewer = useGameStore((s) => s.setShowBookViewer);

  const showArtifactBrowser = useGameStore((s) => s.showArtifactBrowser);
  const setShowArtifactBrowser = useGameStore((s) => s.setShowArtifactBrowser);

  const showTelemetryDashboard = useGameStore((s) => s.showTelemetryDashboard);
  const setShowTelemetryDashboard = useGameStore((s) => s.setShowTelemetryDashboard);

  const talkedCount = Object.values(talkedTo).filter(Boolean).length;

  // ✅ ESC closes the top-most overlay/modal (and dialogue)
  useEffect(() => {
    const anyOverlayOpen =
      !!dialogue ||
      showTelemetryDashboard ||
      showArtifactBrowser ||
      showBookViewer ||
      showReleaseChecklist ||
      showEvalResults ||
      showRagResults ||
      showEvalPanel ||
      showRagPanel;

    if (!anyOverlayOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // Don't interfere with typing in inputs
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      e.preventDefault();

      // Close order: dialogue first, then highest-level modals
      if (dialogue) return setDialogue(null);
      if (showTelemetryDashboard) return setShowTelemetryDashboard(false);
      if (showArtifactBrowser) return setShowArtifactBrowser(false);
      if (showBookViewer) return setShowBookViewer(false);
      if (showReleaseChecklist) return setShowReleaseChecklist(false);
      if (showEvalResults) return setShowEvalResults(false);
      if (showRagResults) return setShowRagResults(false);
      if (showEvalPanel) return setShowEvalPanel(false);
      if (showRagPanel) return setShowRagPanel(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    dialogue,
    showTelemetryDashboard,
    showArtifactBrowser,
    showBookViewer,
    showReleaseChecklist,
    showEvalResults,
    showRagResults,
    showEvalPanel,
    showRagPanel,
    setDialogue,
    setShowTelemetryDashboard,
    setShowArtifactBrowser,
    setShowBookViewer,
    setShowReleaseChecklist,
    setShowEvalResults,
    setShowRagResults,
    setShowEvalPanel,
    setShowRagPanel
  ]);

  return (
    <>
      {/* Mission */}
      <Panel title="MISSION" style={{ position: "fixed", top: 14, left: 14, width: 420, zIndex: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{mission.title}</div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.3 }}>{mission.context}</div>

        <div style={{ marginTop: 10, fontSize: 12 }}>
          <div style={{ fontWeight: 800, color: "#a5b4fc" }}>CONSTRAINTS</div>
          <ul style={{ margin: "6px 0 0 18px", padding: 0, opacity: 0.95 }}>
            {mission.constraints.map((c, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, display: "grid", gap: 3 }}>
          <div>
            Progress: <b>{talkedCount}/4</b> workstations ·{" "}
            RAG:{" "}
            <b style={{ color: rag?.passed ? "#86efac" : rag ? "#fca5a5" : "#fde68a" }}>
              {rag ? (rag.passed ? "PASS" : "FAIL") : "—"}
            </b>{" "}
            · Eval:{" "}
            <b style={{ color: (evalRes?.passRate ?? 0) >= 80 ? "#86efac" : evalRes ? "#fde68a" : "#fde68a" }}>
              {evalRes ? `${evalRes.passRate}%` : "—"}
            </b>{" "}
            · Verdict:{" "}
            <b style={{ color: verdict === "SHIP" ? "#86efac" : verdict === "BLOCK" ? "#fca5a5" : "#fde68a" }}>
              {verdict ?? "—"}
            </b>
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => rag && setShowRagResults(true)}
              disabled={!rag}
              style={{
                border: "1px solid rgba(56,189,248,0.35)",
                background: rag ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: rag ? "pointer" : "not-allowed",
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12
              }}
            >
              View RAG Results
            </button>

            <button
              onClick={() => evalRes && setShowEvalResults(true)}
              disabled={!evalRes}
              style={{
                border: "1px solid rgba(165,180,252,0.35)",
                background: evalRes ? "rgba(165,180,252,0.16)" : "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: evalRes ? "pointer" : "not-allowed",
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12
              }}
            >
              View Eval Results
            </button>

            <button
              onClick={() => setShowReleaseChecklist(true)}
              style={{
                border: "1px solid rgba(253,230,138,0.35)",
                background: "rgba(253,230,138,0.14)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12
              }}
            >
              Release Checklist
            </button>

            <button
              onClick={() => setShowBookViewer(true)}
              style={{
                border: "1px solid rgba(103,232,249,0.35)",
                background: "rgba(103,232,249,0.12)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12
              }}
            >
              Lab Library
            </button>

            <button
              onClick={() => setShowArtifactBrowser(true)}
              style={{
                border: "1px solid rgba(253,230,138,0.35)",
                background: "rgba(253,230,138,0.10)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12
              }}
            >
              Artifact Browser
            </button>

            <button
              onClick={() => setShowTelemetryDashboard(true)}
              style={{
                border: "1px solid rgba(103,232,249,0.35)",
                background: "rgba(103,232,249,0.10)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12
              }}
            >
              Telemetry Dashboard
            </button>

            <div style={{ fontSize: 12, opacity: 0.75 }}>Artifacts + checklist drive the ship decision.</div>
          </div>
        </div>
      </Panel>

      {/* Gauges */}
      <Panel title="SYSTEM GAUGES" style={{ position: "fixed", top: 14, right: 14, width: 300, zIndex: 10 }}>
        <div style={{ fontSize: 12, display: "grid", gap: 6 }}>
          <div>
            Reliability <span style={{ opacity: 0.85 }}>{meterBar(meters.reliability)}</span>{" "}
            <span style={{ opacity: 0.7 }}>({meters.reliability})</span>
          </div>
          <div>
            Cost <span style={{ opacity: 0.85 }}>{meterBar(meters.cost)}</span>{" "}
            <span style={{ opacity: 0.7 }}>({meters.cost})</span>
          </div>
          <div>
            Risk <span style={{ opacity: 0.85 }}>{meterBar(meters.risk)}</span>{" "}
            <span style={{ opacity: 0.7 }}>({meters.risk})</span>
          </div>
          <div>
            Reg Heat <span style={{ opacity: 0.85 }}>{meterBar(meters.regHeat)}</span>{" "}
            <span style={{ opacity: 0.7 }}>({meters.regHeat})</span>
          </div>
        </div>
      </Panel>

      {/* Footer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 130,
          zIndex: 10,
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.0), rgba(2,6,23,0.85) 35%, rgba(2,6,23,0.96))",
          borderTop: "2px solid rgba(255,255,255,0.06)",
          fontFamily: mono,
          color: "#e5e7eb",
          padding: "10px 14px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontWeight: 900, color: "#67e8f9", letterSpacing: 0.6 }}>AI LAB – DAY ZERO</div>
            <div style={{ fontSize: 12, opacity: 0.92 }}>
              Controls: <b>WASD</b> Move · <b>SPACE</b> Interact
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Tip: Server Rack → RAG. Eval Terminal → Eval. Whiteboard → Release Checklist.
            </div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.9, textAlign: "right" }}>
            <div style={{ fontWeight: 800, color: "#a5b4fc" }}>WIN CONDITIONS</div>
            <div style={{ marginTop: 4, display: "grid", gap: 2 }}>
              {mission.winConditions.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogue */}
      {dialogue ? (
        <div
          onClick={() => setDialogue(null)}
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 140,
            width: "min(900px, 92vw)",
            background: "linear-gradient(180deg, #020617, #0b1226)",
            border: "3px solid rgba(56,189,248,0.65)",
            borderRadius: 12,
            padding: 14,
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            fontFamily: mono,
            color: "#e5e7eb",
            zIndex: 20
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900, color: "#7dd3fc" }}>{dialogue.title}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>(click to close · ESC)</div>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.35 }}>
            {dialogue.lines.map((l, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <RagPanel />
      <EvalPanel />
      <RagResultsViewer />
      <EvalResultsViewer />
      <ReleaseChecklist />
      <BookViewer />
      <ArtifactBrowser />
      <TelemetryDashboard />
      <WhiteboardPanel />
    </>
  );
}
