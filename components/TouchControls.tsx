"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (navigator as any).maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

export default function TouchControls() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isTouchDevice());
  }, []);

  const baseRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(false);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const sendMove = (dx: number, dy: number) => {
    window.dispatchEvent(new CustomEvent("ai-lab-move", { detail: { dx, dy } }));
  };

  const resetMove = () => sendMove(0, 0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    activeRef.current = true;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    originRef.current = { x: e.clientX, y: e.clientY };
    sendMove(0, 0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!enabled) return;
    if (!activeRef.current) return;

    const ox = originRef.current.x;
    const oy = originRef.current.y;

    const dx = e.clientX - ox;
    const dy = e.clientY - oy;

    // deadzone + clamp
    const DEAD = 8;
    const MAX = 44;

    const cdx = Math.max(-MAX, Math.min(MAX, dx));
    const cdy = Math.max(-MAX, Math.min(MAX, dy));

    const mag = Math.sqrt(cdx * cdx + cdy * cdy);

    if (mag < DEAD) {
      sendMove(0, 0);
      return;
    }

    // Normalize into [-1..1] for game
    const ndx = cdx / MAX;
    const ndy = cdy / MAX;

    sendMove(ndx, ndy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!enabled) return;
    activeRef.current = false;
    resetMove();
    try {
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const onInteract = () => {
    window.dispatchEvent(new CustomEvent("ai-lab-interact"));
  };

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 35,
        fontFamily: mono,
      }}
    >
      {/* Left thumb stick */}
      <div
        ref={baseRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "fixed",
          left: 16,
          bottom: 18,
          width: 132,
          height: 132,
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.18)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 22,
            borderRadius: 999,
            border: "1px dashed rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.03)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: 11,
            opacity: 0.7,
            letterSpacing: 0.4,
          }}
        >
          MOVE
        </div>
      </div>

      {/* Right side buttons */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 26,
          display: "grid",
          gap: 12,
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={onInteract}
          style={{
            width: 150,
            height: 56,
            borderRadius: 14,
            border: "2px solid rgba(125,211,252,0.35)",
            background: "rgba(125,211,252,0.18)",
            color: "#e5e7eb",
            fontWeight: 900,
            letterSpacing: 0.6,
          }}
        >
          INTERACT
        </button>

        <div style={{ fontSize: 11, opacity: 0.7, textAlign: "right" }}>
          Tip: Tap Interact near stations/NPCs
        </div>
      </div>
    </div>
  );
}
