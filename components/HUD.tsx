"use client";

import { useEffect, useMemo, useState } from "react";
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
import WhiteboardPanel from "./WhiteboardPanel";
import TouchControls from "./TouchControls";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

/* -------------------- helpers -------------------- */

function useIsMobile(breakpoint = 760) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

function Panel({
  title,
  right,
  children,
  style,
  onFocus,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onFocus?: () => void;
}) {
  return (
    <div
      onMouseDown={onFocus}
      onTouchStart={onFocus}
      style={{
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.92), rgba(2,6,23,0.78))",
        border: "2px solid rgba(56,189,248,0.55)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        borderRadius: 12,
        padding: 10,
        color: "#e5e7eb",
        fontFamily: mono,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: 0.5, color: "#7dd3fc" }}>
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.08)",
        color: "#e5e7eb",
        borderRadius: 999,
        padding: "4px 10px",
        fontFamily: mono,
        fontWeight: 900,
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      {label}
    </button>
  );
}

/* -------------------- HUD -------------------- */

export default function HUD() {
  const isMobile = useIsMobile();

  const mission = useGameStore((s) => s.mission);
  const meters = useGameStore((s) => s.meters);

  const dialogue = useGameStore((s) => s.dialogue);
  const setDialogue = useGameStore((s) => s.setDialogue);

  const talkedTo = useGameStore((s) => s.talkedTo);
  const rag = useGameStore((s) => s.rag);
  const evalRes = useGameStore((s) => s.eval);
  const verdict = useGameStore((s) => s.verdict);

  const showTelemetryDashboard = useGameStore((s) => s.showTelemetryDashboard);
  const setShowTelemetryDashboard = useGameStore((s) => s.setShowTelemetryDashboard);

  const showArtifactBrowser = useGameStore((s) => s.showArtifactBrowser);
  const setShowArtifactBrowser = useGameStore((s) => s.setShowArtifactBrowser);

  const showBookViewer = useGameStore((s) => s.showBookViewer);
  const setShowBookViewer = useGameStore((s) => s.setShowBookViewer);

  const showReleaseChecklist = useGameStore((s) => s.showReleaseChecklist);
  const setShowReleaseChecklist = useGameStore((s) => s.setShowReleaseChecklist);

  const showEvalResults = useGameStore((s) => s.showEvalResults);
  const setShowEvalResults = useGameStore((s) => s.setShowEvalResults);

  const showRagResults = useGameStore((s) => s.showRagResults);
  const setShowRagResults = useGameStore((s) => s.setShowRagResults);

  const showEvalPanel = useGameStore((s) => s.showEvalPanel);
  const setShowEvalPanel = useGameStore((s) => s.setShowEvalPanel);

  const showRagPanel = useGameStore((s) => s.showRagPanel);
  const setShowRagPanel = useGameStore((s) => s.setShowRagPanel);

  const showWhiteboard = useGameStore((s) => s.showWhiteboard);
  const setShowWhiteboard = useGameStore((s) => s.setShowWhiteboard);

  const talkedCount = Object.values(talkedTo).filter(Boolean).length;

  /* ---------------- panel state ---------------- */

  const [hudExpanded, setHudExpanded] = useState(true);
  const [missionOpen, setMissionOpen] = useState(true);
  const [gaugesOpen, setGaugesOpen] = useState(true);
  const [footerOpen, setFooterOpen] = useState(true);

  /* ---------------- z-order stack ---------------- */

  const [zStack, setZStack] = useState<string[]>([]);
  const bringToFront = (id: string) =>
    setZStack((s) => [...s.filter((x) => x !== id), id]);
  const zIndexFor = (id: string) =>
    20 + (zStack.indexOf(id) === -1 ? 0 : zStack.indexOf(id) * 2);

  /* ---------------- mobile defaults ---------------- */

  useEffect(() => {
    if (isMobile) {
      setHudExpanded(false);
      setMissionOpen(false);
      setGaugesOpen(false);
      setFooterOpen(false);
      setZStack([]);
    } else {
      setHudExpanded(true);
      setMissionOpen(true);
      setGaugesOpen(true);
      setFooterOpen(true);
    }
  }, [isMobile]);

  /* ---------------- ESC: close overlays top-most; else mobile collapses HUD ---------------- */

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
      showRagPanel ||
      showWhiteboard;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // Don't interfere with typing in inputs
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      e.preventDefault();

      // Close order: top-most first
      if (dialogue) return setDialogue(null);

      // detail viewers ABOVE the artifact browser
      if (showEvalResults) return setShowEvalResults(false);
      if (showRagResults) return setShowRagResults(false);

      if (showTelemetryDashboard) return setShowTelemetryDashboard(false);
      if (showArtifactBrowser) return setShowArtifactBrowser(false);
      if (showBookViewer) return setShowBookViewer(false);
      if (showReleaseChecklist) return setShowReleaseChecklist(false);
      if (showWhiteboard) return setShowWhiteboard(false);

      if (showEvalPanel) return setShowEvalPanel(false);
      if (showRagPanel) return setShowRagPanel(false);

      // If nothing else open, collapse HUD on mobile
      if (isMobile && hudExpanded) return setHudExpanded(false);
    };

    if (!anyOverlayOpen && !(isMobile && hudExpanded)) return;

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
    showWhiteboard,
    setDialogue,
    setShowTelemetryDashboard,
    setShowArtifactBrowser,
    setShowBookViewer,
    setShowReleaseChecklist,
    setShowEvalResults,
    setShowRagResults,
    setShowEvalPanel,
    setShowRagPanel,
    setShowWhiteboard,
    isMobile,
    hudExpanded,
  ]);

  /* ---------------- layout ---------------- */

  const showHudChrome = !isMobile || hudExpanded;

  const footerHeight = isMobile ? 110 : 130;
  const dialogueBottom = footerOpen && showHudChrome ? footerHeight + 10 : 18;

  const progressColor = rag?.passed
    ? "#86efac"
    : rag
      ? "#fca5a5"
      : "#fde68a";

  const evalColor =
    (evalRes?.passRate ?? 0) >= 80 ? "#86efac" : evalRes ? "#fde68a" : "#fde68a";

  const verdictColor =
    verdict === "SHIP" ? "#86efac" : verdict === "BLOCK" ? "#fca5a5" : "#fde68a";

  /* ---------------- render ---------------- */

  return (
    <>
      {/* Mobile HUD Toggle - top center */}
      {isMobile && (
        <button
          onClick={() => setHudExpanded((v) => !v)}
          style={{
            position: "fixed",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 120,
            border: "1px solid rgba(255,255,255,0.18)",
            background: hudExpanded
              ? "rgba(56,189,248,0.25)"
              : "rgba(255,255,255,0.12)",
            color: "#e5e7eb",
            borderRadius: 999,
            padding: "10px 16px",
            fontFamily: mono,
            fontWeight: 900,
            letterSpacing: 0.5,
            touchAction: "manipulation",
          }}
        >
          {hudExpanded ? "HIDE HUD" : "SHOW HUD"}
        </button>
      )}

      {/* Mission */}
      {showHudChrome && missionOpen ? (
        <Panel
          title="MISSION"
          onFocus={() => bringToFront("mission")}
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            width: isMobile ? "calc(100vw - 28px)" : 420,
            zIndex: zIndexFor("mission"),
          }}
          right={<IconButton label="–" onClick={() => setMissionOpen(false)} />}
        >
          <div style={{ fontSize: 13, fontWeight: 800 }}>{mission.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.3 }}>
            {mission.context}
          </div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div style={{ fontWeight: 800, color: "#a5b4fc" }}>CONSTRAINTS</div>
            <ul
              style={{
                margin: "6px 0 0 18px",
                padding: 0,
                opacity: 0.95,
                maxHeight: isMobile ? 88 : undefined,
                overflow: isMobile ? "auto" : undefined,
              }}
            >
              {mission.constraints.map((c, i) => (
                <li key={i} style={{ marginBottom: 2 }}>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, display: "grid", gap: 3 }}>
            <div>
              Progress: <b>{talkedCount}/4</b> workstations · RAG:{" "}
              <b style={{ color: progressColor }}>{rag ? (rag.passed ? "PASS" : "FAIL") : "—"}</b> ·
              Eval: <b style={{ color: evalColor }}>{evalRes ? `${evalRes.passRate}%` : "—"}</b> ·
              Verdict: <b style={{ color: verdictColor }}>{verdict ?? "—"}</b>
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
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
                  fontSize: 12,
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
                  fontSize: 12,
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
                  fontSize: 12,
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
                  fontSize: 12,
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
                  fontSize: 12,
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
                  fontSize: 12,
                }}
              >
                Telemetry Dashboard
              </button>

              <button
                onClick={() => setShowWhiteboard(true)}
                style={{
                  border: "1px solid rgba(34,197,94,0.35)",
                  background: "rgba(34,197,94,0.12)",
                  color: "#e5e7eb",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                  letterSpacing: 0.3,
                  fontSize: 12,
                }}
              >
                Whiteboard
              </button>

              {!isMobile ? (
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Artifacts + checklist drive the ship decision.
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : showHudChrome ? (
        <button
          onClick={() => {
            setMissionOpen(true);
            bringToFront("mission");
          }}
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 10,
            border: "1px solid rgba(56,189,248,0.55)",
            background: "rgba(2,6,23,0.78)",
            color: "#e5e7eb",
            borderRadius: 999,
            padding: "10px 14px",
            fontFamily: mono,
            fontWeight: 900,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          MISSION ▸
        </button>
      ) : null}

      {/* Gauges */}
      {showHudChrome && gaugesOpen ? (
        <Panel
          title="SYSTEM GAUGES"
          onFocus={() => bringToFront("gauges")}
          style={{
            position: "fixed",
            top: 14,
            right: 14,
            width: isMobile ? "calc(100vw - 28px)" : 300,
            zIndex: zIndexFor("gauges"),
          }}
          right={<IconButton label="–" onClick={() => setGaugesOpen(false)} />}
        >
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
      ) : showHudChrome ? (
        <button
          onClick={() => {
            setGaugesOpen(true);
            bringToFront("gauges");
          }}
          style={{
            position: "fixed",
            top: 14,
            right: 14,
            zIndex: 10,
            border: "1px solid rgba(56,189,248,0.55)",
            background: "rgba(2,6,23,0.78)",
            color: "#e5e7eb",
            borderRadius: 999,
            padding: "10px 14px",
            fontFamily: mono,
            fontWeight: 900,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          GAUGES ▸
        </button>
      ) : null}

      {/* Footer - restored detail (desktop), compact on mobile */}
      {showHudChrome && footerOpen ? (
        <div
          onMouseDown={() => bringToFront("footer")}
          onTouchStart={() => bringToFront("footer")}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: footerHeight,
            zIndex: zIndexFor("footer"),
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.0), rgba(2,6,23,0.85) 35%, rgba(2,6,23,0.96))",
            borderTop: "2px solid rgba(255,255,255,0.06)",
            fontFamily: mono,
            color: "#e5e7eb",
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "#67e8f9", letterSpacing: 0.6 }}>
                  AI LAB – DAY ZERO
                </div>
                <IconButton label="Hide" onClick={() => setFooterOpen(false)} />
              </div>

              <div style={{ fontSize: 12, opacity: 0.92 }}>
                Controls:{" "}
                {!isMobile ? (
                  <>
                    <b>WASD</b> Move · <b>SPACE</b> Interact · <b>ESC</b> Close
                  </>
                ) : (
                  <>
                    <b>Joystick</b> Move · <b>INTERACT</b> Use · <b>HUD</b> Toggle
                  </>
                )}
              </div>

              {!isMobile ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Tip: Server Rack → RAG. Eval Terminal → Eval. Whiteboard → Release Checklist.
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Tip: Hide HUD to see more of the lab.
                </div>
              )}
            </div>

            {!isMobile ? (
              <div style={{ fontSize: 12, opacity: 0.9, textAlign: "right" }}>
                <div style={{ fontWeight: 800, color: "#a5b4fc" }}>WIN CONDITIONS</div>
                <div style={{ marginTop: 4, display: "grid", gap: 2 }}>
                  {mission.winConditions.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : showHudChrome ? (
        <button
          onClick={() => {
            setFooterOpen(true);
            bringToFront("footer");
          }}
          style={{
            position: "fixed",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(2,6,23,0.78)",
            color: "#e5e7eb",
            borderRadius: 999,
            padding: "10px 14px",
            fontFamily: mono,
            fontWeight: 900,
            letterSpacing: 0.4,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          CONTROLS ▴
        </button>
      ) : null}

      {/* Dialogue */}
      {dialogue ? (
        <div
          onClick={() => setDialogue(null)}
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: dialogueBottom,
            width: "min(900px, 92vw)",
            background: "linear-gradient(180deg, #020617, #0b1226)",
            border: "3px solid rgba(56,189,248,0.65)",
            borderRadius: 12,
            padding: 14,
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
            fontFamily: mono,
            color: "#e5e7eb",
            zIndex: 40,
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

      {/* Existing overlays */}
      <RagPanel />
      <EvalPanel />
      <RagResultsViewer />
      <EvalResultsViewer />
      <ReleaseChecklist />
      <BookViewer />
      <ArtifactBrowser />
      <TelemetryDashboard />
      <WhiteboardPanel />

      {/* Touch controls ONLY on mobile */}
      <TouchControls enabled={isMobile} />
    </>
  );
}
