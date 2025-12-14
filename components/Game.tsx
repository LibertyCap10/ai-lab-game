"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import HUD from "./HUD";
import PauseMenu from "./PauseMenu";
import { apiGet, apiPost } from "../lib/api";
import { useGameStore, RefereeVerdict } from "../lib/store";

type AgentResponse = {
  lines: string[];
  effects?: { reliability?: number; cost?: number; risk?: number; regHeat?: number };
};

type WhiteboardResponse = AgentResponse & { verdict: RefereeVerdict; reasons: string[] };

type Interactable = {
  id: string;
  name: string;
  kind: "npc" | "station";
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
};

const ROOM_W = 640;
const ROOM_H = 384;

function isAnyOverlayOpen() {
  const s = useGameStore.getState();
  return (
    !!s.dialogue ||
    s.showTelemetryDashboard ||
    s.showArtifactBrowser ||
    s.showBookViewer ||
    s.showReleaseChecklist ||
    s.showEvalResults ||
    s.showRagResults ||
    s.showEvalPanel ||
    s.showRagPanel ||
    s.showWhiteboard ||
    !!s.releaseReview
  );
}

export default function Game() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Stable actions
  const setDialogue = useGameStore((s) => s.setDialogue);
  const applyEffects = useGameStore((s) => s.applyEffects);
  const markTalkedTo = useGameStore((s) => s.markTalkedTo);

  const setShowRagPanel = useGameStore((s) => s.setShowRagPanel);
  const setShowEvalPanel = useGameStore((s) => s.setShowEvalPanel);
  const setShowReleaseChecklist = useGameStore((s) => s.setShowReleaseChecklist);
  const setShowBookViewer = useGameStore((s) => s.setShowBookViewer);
  const setShowArtifactBrowser = useGameStore((s) => s.setShowArtifactBrowser);
  const setShowTelemetryDashboard = useGameStore((s) => s.setShowTelemetryDashboard);
  const setShowWhiteboard = useGameStore((s) => s.setShowWhiteboard);

  const setVerdict = useGameStore((s) => s.setVerdict);
  const setReleaseReview = useGameStore((s) => s.setReleaseReview);

  const [bootError, setBootError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  // ESC => pause menu (but do NOT fight other modals; HUD handles those)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // If a modal/dialogue is open, let HUD's ESC handler close it instead
      if (isAnyOverlayOpen()) return;

      e.preventDefault();
      setPaused((p) => !p);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const doReset = async () => {
    try {
      // ✅ IMPORTANT: lib/api.ts already prefixes /api
      await apiPost("/reset", { wipe_db: true });
    } catch (e) {
      console.warn("Backend reset failed, continuing with client reset", e);
    } finally {
      window.dispatchEvent(new CustomEvent("ai-lab-reset"));
    }
  };

  const doExit = () => {
    window.dispatchEvent(new CustomEvent("ai-lab-exit"));
  };

  useEffect(() => {
    let destroyed = false;

    let app: PIXI.Application | null = null;

    // cleanup closures
    let cleanup: (() => void) | null = null;

    async function init() {
      try {
        setBootError(null);
        const mount = mountRef.current;
        if (!mount) return;

        // Pixi v8 prefers `new Application()` + `await app.init()`
        app = new PIXI.Application();

        await (app as any).init?.({
          width: window.innerWidth,
          height: window.innerHeight,
          background: "#070a14",
          resolution: window.devicePixelRatio || 1,
          antialias: false,
          autoDensity: true,
        });

        if (destroyed || !app) return;

        // Support Pixi v8 (canvas) and older shape (view)
        const canvas: HTMLCanvasElement | undefined =
          (app as any).canvas ?? (app as any).view ?? (app as any).renderer?.view;

        if (!canvas) {
          throw new Error(
            "PIXI did not create a canvas element. Verify pixi.js version and Application init."
          );
        }

        mount.innerHTML = "";
        mount.appendChild(canvas);

        const world = new PIXI.Container();
        app.stage.addChild(world);

        const floor = new PIXI.Graphics().rect(0, 0, ROOM_W, ROOM_H).fill(0x0b1226);
        world.addChild(floor);

        const grid = new PIXI.Graphics();
        for (let x = 0; x <= ROOM_W; x += 16) grid.moveTo(x, 0).lineTo(x, ROOM_H);
        for (let y = 0; y <= ROOM_H; y += 16) grid.moveTo(0, y).lineTo(ROOM_W, y);
        grid.stroke({ width: 1, color: 0x0f1a33, alpha: 0.9 });
        world.addChild(grid);

        const border = new PIXI.Graphics()
          .rect(2, 2, ROOM_W - 4, ROOM_H - 4)
          .stroke({ width: 4, color: 0x1f2a44, alpha: 1 });
        world.addChild(border);

        const interactables: Interactable[] = [
          { id: "mlengineer", name: "ML Engineer (Model Bench)", kind: "npc", x: 120, y: 86, w: 40, h: 28, color: 0x1e293b },
          { id: "aiproductengineer", name: "AI Product Eng (Agent Console)", kind: "npc", x: 240, y: 86, w: 40, h: 28, color: 0x1e293b },
          { id: "infraengineer", name: "Infra/MLOps (Deploy Terminal)", kind: "npc", x: 360, y: 86, w: 40, h: 28, color: 0x1e293b },
          { id: "securityadvisor", name: "Security/Policy (Compliance Desk)", kind: "npc", x: 480, y: 86, w: 40, h: 28, color: 0x1e293b },

          { id: "serverrack", name: "Server Rack (RAG Test Rig)", kind: "station", x: 92, y: 250, w: 36, h: 54, color: 0x0b3b2f },
          { id: "eval", name: "Eval Terminal (Mini Suite)", kind: "station", x: 160, y: 258, w: 42, h: 34, color: 0x2b2a4a },
          { id: "artifact", name: "Artifact Console (Run History)", kind: "station", x: 230, y: 258, w: 46, h: 34, color: 0x3a2d00 },
          { id: "metrics", name: "Metrics Station (Telemetry)", kind: "station", x: 400, y: 258, w: 52, h: 34, color: 0x0a3c4a },
          { id: "whiteboard", name: "Whiteboard (Review Plan)", kind: "station", x: 300, y: 250, w: 80, h: 26, color: 0x2a2a2a },
          { id: "exitdoor", name: "Exit Door (Locked)", kind: "station", x: 600, y: 170, w: 26, h: 44, color: 0x3b1d1d },
          { id: "bookshelf", name: "Bookshelf (Lab Library)", kind: "station", x: 34, y: 92, w: 34, h: 86, color: 0x2b1b12 },
        ];

        for (const it of interactables) {
          const g = new PIXI.Graphics().rect(it.x, it.y, it.w, it.h).fill(it.color);
          g.rect(it.x, it.y, it.w, 3).fill(0x7dd3fc, 0.25);
          world.addChild(g);
        }

        for (const it of interactables.filter((x) => x.kind === "npc")) {
          const head = new PIXI.Graphics().rect(0, 0, 10, 12).fill(0x94a3b8);
          head.x = it.x + it.w / 2 - 5;
          head.y = it.y - 14;
          world.addChild(head);
        }

        const labels = new PIXI.Container();
        world.addChild(labels);
        for (const it of interactables.filter((x) => x.kind === "station")) {
          const t = new PIXI.Text({
            text:
              it.id === "serverrack" ? "RAG" :
              it.id === "eval" ? "EVAL" :
              it.id === "artifact" ? "LOGS" :
              it.id === "metrics" ? "METR" :
              it.id === "whiteboard" ? "REVIEW" :
              it.id === "bookshelf" ? "BOOK" :
              "EXIT",
            style: { fontFamily: "monospace", fontSize: 10, fill: 0x93c5fd },
          });
          t.x = it.x;
          t.y = it.y + it.h + 3;
          labels.addChild(t);
        }

        const player = new PIXI.Graphics().rect(0, 0, 14, 14).fill(0x22d3ee);
        player.x = 320;
        player.y = 210;
        world.addChild(player);

        const hint = new PIXI.Text({
          text: "",
          style: { fontFamily: "monospace", fontSize: 12, fill: 0xe5e7eb },
        });
        hint.x = 12;
        hint.y = 12;
        hint.alpha = 0;
        world.addChild(hint);

        // Center the room in the viewport
        const positionWorld = () => {
          if (!app) return;
          const w = (app as any).renderer?.width ?? window.innerWidth;
          const h = (app as any).renderer?.height ?? window.innerHeight;
          world.x = Math.max(0, Math.floor((w - ROOM_W) / 2));
          world.y = Math.max(0, Math.floor((h - ROOM_H) / 2));
        };

        const onResize = () => {
          if (!app) return;
          // resize canvas to window
          (app as any).renderer?.resize?.(window.innerWidth, window.innerHeight);
          positionWorld();
        };

        positionWorld();
        window.addEventListener("resize", onResize);

        const keys: Record<string, boolean> = {};
        const down = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = true);
        const up = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);

        let spaceLatch = false;

        const colliders = interactables.map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h }));
        const aabb = (nx: number, ny: number, w: number, h: number, r: any) =>
          nx < r.x + r.w && nx + w > r.x && ny < r.y + r.h && ny + h > r.y;

        const collides = (nx: number, ny: number) => {
          if (nx < 6 || ny < 6 || nx + 14 > ROOM_W - 6 || ny + 14 > ROOM_H - 6) return true;
          for (const r of colliders) if (aabb(nx, ny, 14, 14, r)) return true;
          return false;
        };

        const findNearest = () => {
          const px = player.x + 7;
          const py = player.y + 7;
          let best: { it: Interactable; d: number } | null = null;
          for (const it of interactables) {
            const cx = it.x + it.w / 2;
            const cy = it.y + it.h / 2;
            const dx = cx - px;
            const dy = cy - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (!best || d < best.d) best = { it, d };
          }
          return best && best.d <= 46 ? best.it : null;
        };

        const interact = async (it: Interactable) => {
          if (it.kind === "station") {
            if (it.id === "serverrack") setShowRagPanel(true);
            else if (it.id === "eval") setShowEvalPanel(true);
            else if (it.id === "artifact") setShowArtifactBrowser(true);
            else if (it.id === "metrics") setShowTelemetryDashboard(true);
            else if (it.id === "whiteboard") setShowWhiteboard(true);
            else if (it.id === "bookshelf") setShowBookViewer(true);
            else if (it.id === "exitdoor") setShowReleaseChecklist(true);
            return;
          }

          try {
            // ✅ IMPORTANT: lib/api.ts already prefixes /api
            const data = await apiGet<AgentResponse>(`/agent/${it.id}`);
            markTalkedTo(it.id);
            if (data.effects) applyEffects(data.effects);
            setDialogue({ title: it.name, lines: data.lines });
          } catch (e: any) {
            setDialogue({
              title: "Backend error",
              lines: ["Could not reach backend.", "", `Details: ${e?.message ?? e}`],
            });
          }
        };

        const tick = () => {
          if (!app) return;
          if (paused || isAnyOverlayOpen()) return;

          const speed = 2.35;
          const dx = (keys["d"] || keys["arrowright"] ? 1 : 0) - (keys["a"] || keys["arrowleft"] ? 1 : 0);
          const dy = (keys["s"] || keys["arrowdown"] ? 1 : 0) - (keys["w"] || keys["arrowup"] ? 1 : 0);

          if (dx || dy) {
            const nx = player.x + dx * speed;
            const ny = player.y + dy * speed;
            if (!collides(nx, player.y)) player.x = nx;
            if (!collides(player.x, ny)) player.y = ny;
          }

          const near = findNearest();
          if (near) {
            hint.text = `Press SPACE to interact: ${near.name}`;
            hint.alpha = 1;
          } else {
            hint.text = "";
            hint.alpha = 0;
          }

          const space = !!keys[" "];
          if (space && !spaceLatch) {
            spaceLatch = true;
            if (near) interact(near).catch(() => {});
          }
          if (!space) spaceLatch = false;
        };

        app.ticker.add(tick);

        cleanup = () => {
          window.removeEventListener("resize", onResize);
          window.removeEventListener("keydown", down);
          window.removeEventListener("keyup", up);
          try {
            app?.ticker?.remove?.(tick);
          } catch {}
          try {
            app?.destroy?.(true);
          } catch {}
          app = null;
        };
      } catch (e: any) {
        setBootError(e?.message ?? String(e));
      }
    }

    init();

    return () => {
      destroyed = true;
      if (cleanup) cleanup();
    };
  }, [
    paused,
    setDialogue,
    applyEffects,
    markTalkedTo,
    setShowRagPanel,
    setShowEvalPanel,
    setShowReleaseChecklist,
    setShowBookViewer,
    setShowArtifactBrowser,
    setShowTelemetryDashboard,
    setShowWhiteboard,
    setVerdict,
    setReleaseReview,
  ]);

  return (
    <>
      <div ref={mountRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
      <HUD />

      <PauseMenu
        open={paused}
        onResume={() => setPaused(false)}
        onReset={() => {
          setPaused(false);
          doReset();
        }}
        onExit={() => {
          setPaused(false);
          doExit();
        }}
      />

      {bootError ? (
        <div
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            background: "rgba(127,29,29,0.9)",
            border: "2px solid rgba(248,113,113,0.9)",
            color: "#fff",
            padding: 10,
            borderRadius: 10,
            fontFamily: "monospace",
            maxWidth: "min(900px, 92vw)",
          }}
        >
          Pixi boot error: {bootError}
        </div>
      ) : null}
    </>
  );
}
