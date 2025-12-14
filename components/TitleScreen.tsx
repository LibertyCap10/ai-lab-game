"use client";

import { useEffect, useState } from "react";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function TitleScreen() {
  const [selected, setSelected] = useState<"start">("start");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("ai-lab-start"));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(1200px 700px at 50% 35%, rgba(56,189,248,0.20), rgba(2,6,23,0.92) 60%, #020617)",
        display: "grid",
        placeItems: "center",
        color: "#e5e7eb",
        fontFamily: mono,
        padding: 24
      }}
    >
      <div style={{ width: "min(720px, 94vw)", textAlign: "center" }}>
        <div style={{ fontWeight: 1000, letterSpacing: 6, fontSize: 56, color: "#67e8f9" }}>
          AI LAB
        </div>
        <div style={{ marginTop: 10, opacity: 0.88, fontSize: 14, lineHeight: 1.5 }}>
          Build, test, and ship an AI incident-response copilot under real constraints.
          <br />
          Talk to engineers · run RAG · run evals · watch telemetry · ship responsibly.
        </div>

        <div style={{ marginTop: 28, display: "grid", gap: 10, justifyItems: "center" }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("ai-lab-start"))}
            style={{
              border: "2px solid rgba(56,189,248,0.65)",
              background: selected === "start" ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.06)",
              color: "#e5e7eb",
              borderRadius: 14,
              padding: "12px 18px",
              cursor: "pointer",
              fontWeight: 900,
              letterSpacing: 1,
              fontSize: 14,
              boxShadow: "0 20px 70px rgba(0,0,0,0.55)"
            }}
          >
            START
          </button>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Press <b>Enter</b> to start · In game press <b>Esc</b> for menu
          </div>
        </div>
      </div>
    </div>
  );
}
