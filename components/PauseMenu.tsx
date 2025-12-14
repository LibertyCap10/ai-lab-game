"use client";

import { useEffect } from "react";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function PauseMenu({
  open,
  onResume,
  onReset,
  onExit
}: {
  open: boolean;
  onResume: () => void;
  onReset: () => void;
  onExit: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onResume();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onResume]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        padding: 16,
        fontFamily: mono,
        color: "#e5e7eb"
      }}
      onClick={onResume}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 92vw)",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: "3px solid rgba(56,189,248,0.65)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 30px 90px rgba(0,0,0,0.6)"
        }}
      >
        <div style={{ fontWeight: 1000, letterSpacing: 2, color: "#67e8f9" }}>PAUSED</div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
          Resume, reset the run, or exit back to the title screen.
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <button
            onClick={onResume}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "#e5e7eb",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 900,
              letterSpacing: 0.6
            }}
          >
            Resume (Esc)
          </button>

          <button
            onClick={onReset}
            style={{
              border: "1px solid rgba(253,230,138,0.35)",
              background: "rgba(253,230,138,0.10)",
              color: "#e5e7eb",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 900,
              letterSpacing: 0.6
            }}
          >
            Reset Run
          </button>

          <button
            onClick={onExit}
            style={{
              border: "1px solid rgba(248,113,113,0.45)",
              background: "rgba(248,113,113,0.12)",
              color: "#e5e7eb",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 900,
              letterSpacing: 0.6
            }}
          >
            Exit to Title
          </button>

          <div style={{ fontSize: 11, opacity: 0.7, textAlign: "center", marginTop: 2 }}>
            Click outside to resume
          </div>
        </div>
      </div>
    </div>
  );
}
