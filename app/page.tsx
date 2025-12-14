"use client";

import { useEffect, useState } from "react";
import Game from "../components/Game";
import TitleScreen from "../components/TitleScreen";

type Mode = "title" | "game";

export default function Page() {
  const [mode, setMode] = useState<Mode>("title");
  const [gameKey, setGameKey] = useState(1);

  useEffect(() => {
    const onStart = () => setMode("game");
    const onReset = () => setGameKey((k) => k + 1);
    const onExit = () => {
      setMode("title");
      setGameKey((k) => k + 1); // ensure a clean run next time
    };

    window.addEventListener("ai-lab-start", onStart as EventListener);
    window.addEventListener("ai-lab-reset", onReset as EventListener);
    window.addEventListener("ai-lab-exit", onExit as EventListener);

    return () => {
      window.removeEventListener("ai-lab-start", onStart as EventListener);
      window.removeEventListener("ai-lab-reset", onReset as EventListener);
      window.removeEventListener("ai-lab-exit", onExit as EventListener);
    };
  }, []);

  if (mode === "title") return <TitleScreen />;

  // key remounts Game => hard reset of Pixi + HUD + stateful component internals
  return <Game key={gameKey} />;
}
