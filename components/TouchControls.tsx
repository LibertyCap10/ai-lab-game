"use client";

import { useEffect, useRef, useState } from "react";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function detectTouchDevice() {
  if (typeof window === "undefined") return false;
  const nav: any = navigator;
  return (
    "ontouchstart" in window ||
    (nav?.maxTouchPoints ?? 0) > 0 ||
    (nav?.msMaxTouchPoints ?? 0) > 0
  );
}

type Props = {
  enabled?: boolean; // parent can force on/off
};

export default function TouchControls({ enabled }: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // If parent provides enabled, trust it. Otherwise auto-detect.
    if (enabled !== undefined) setActive(enabled);
    else setActive(detectTouchDevice());
  }, [enabled]);

  const activeRef = useRef(false);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const sendMove = (dx: number, dy: number) => {
    window.dispatchEvent(new CustomEvent("ai-lab-move", { detail: { dx, dy } }));
  };
  const resetMove = () => sendMove(0, 0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active) return;
    activeRef.current = true;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    originRef.current = { x: e.clientX, y: e.clientY };
    sendMove(0, 0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active) return;
    if (!activeRef.current) return;

    const ox = originRef.current.x;
    const oy = originRef.current.y;

    const dx = e.clientX - ox;
    const dy = e.clientY - oy;

    const DEAD = 8;
    const MAX = 44;

    const cdx = Math.max(-MAX, Math.min(MAX, dx));
    const cdy = Math.max(-MAX, Math.min(MAX, dy));

    const mag = Math.sqrt(cdx * cdx + cdy * cdy);
    if (mag < DEAD) return sendMove(0, 0);

    // Normalize into [-1..1]
    sendMove(cdx / MAX, cdy / MAX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!active) return;
    activeRef.current = false;
    resetMove();
    try {
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const onInteract = () => {
    window.dispatchEvent(new CustomEvent("ai-lab-interact"));
  };

  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 120, // ✅ always on top (except your full-screen modals)
        fontFamily: mono,
      }}
    >
      {/* Left thumb stick */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "fixed",
          left: 14,
          bottom: 14,
          width: 132,
          height: 132,
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.18)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          pointerEvents: "auto",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
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

      {/* Right-side buttons */}
      <div
        style={{
          position: "fixed",
          right: 14,
          bottom: 18,
          display: "grid",
          gap: 10,
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
            touchAction: "manipulation",
          }}
        >
          INTERACT
        </button>
      </div>
    </div>
  );
}
