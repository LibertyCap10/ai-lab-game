"use client";

import { useState } from "react";
import { apiPost } from "../lib/api";
import { useGameStore } from "../lib/store";

type WhiteboardResponse = {
  lines: string[];
  reasons: string[];
  verdict: "SHIP" | "REVISE" | "BLOCK";
  effects?: {
    reliability?: number;
    cost?: number;
    risk?: number;
    regHeat?: number;
  };
};

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export default function WhiteboardPanel() {
  const open = useGameStore((s) => s.showWhiteboard);
  const setOpen = useGameStore((s) => s.setShowWhiteboard);
  const setDialogue = useGameStore((s) => s.setDialogue);
  const applyEffects = useGameStore((s) => s.applyEffects);

  const talkedTo = useGameStore((s) => s.talkedTo);
  const rag = useGameStore((s) => s.rag);
  const evalResult = useGameStore((s) => s.eval);
  const meters = useGameStore((s) => s.meters);

  const [busy, setBusy] = useState(false);

  async function runReferee() {
    setBusy(true);
    try {
      const payload = {
        talkedToCount: Object.values(talkedTo).filter(Boolean).length,
        ragPassed: rag?.passed ?? false,
        evalPassRate: evalResult?.passRate ?? 0,
        meters,
      };

      const res = await apiPost<WhiteboardResponse>(
        "/api/station/whiteboard",
        payload
      );

      if (res.effects) applyEffects(res.effects);

      setDialogue({
        title: `WHITEBOARD VERDICT — ${res.verdict}`,
        lines: [
          ...res.lines,
          "",
          ...(res.reasons?.length
            ? ["Reasons:", ...res.reasons.map((r) => `• ${r}`)]
            : []),
        ],
      });
    } catch (e: any) {
      setDialogue({
        title: "Whiteboard error",
        lines: [
          "Could not reach the backend for referee scoring.",
          "",
          `Details: ${e?.message ?? e}`,
        ],
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
        padding: 16,
      }}
      onClick={() => !busy && setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(860px, 96vw)",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: "3px solid rgba(34,197,94,0.55)",
          borderRadius: 14,
          padding: 18,
          fontFamily: mono,
          color: "#e5e7eb",
          boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 900, color: "#86efac" }}>
              WHITEBOARD — RELEASE REFEREE
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Final gate: evidence, safety escalation, and operational risk.
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
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            opacity: 0.9,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 800, color: "#7dd3fc" }}>
            What this represents
          </div>
          <ul style={{ margin: "6px 0 0 18px" }}>
            <li>Release committee / launch review</li>
            <li>Risk, compliance, and evidence gating</li>
            <li>“Should this ship today?” decision</li>
          </ul>

          <div style={{ marginTop: 10 }}>
            <div>
              Council consulted:{" "}
              <b>{Object.values(talkedTo).filter(Boolean).length}/4</b>
            </div>
            <div>
              RAG status:{" "}
              <b style={{ color: rag?.passed ? "#86efac" : "#fca5a5" }}>
                {rag ? (rag.passed ? "PASS" : "FAIL") : "—"}
              </b>
            </div>
            <div>
              Eval pass rate:{" "}
              <b>{evalResult?.passRate ?? "—"}%</b>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 16,
          }}
        >
          <button
            onClick={runReferee}
            disabled={busy}
            style={{
              border: "1px solid rgba(34,197,94,0.35)",
              background: busy
                ? "rgba(34,197,94,0.12)"
                : "rgba(34,197,94,0.28)",
              color: "#e5e7eb",
              borderRadius: 12,
              padding: "10px 16px",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 900,
              letterSpacing: 0.4,
            }}
          >
            {busy ? "REVIEWING…" : "REQUEST VERDICT"}
          </button>
        </div>
      </div>
    </div>
  );
}
