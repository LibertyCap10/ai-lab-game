import { create } from "zustand";

export type Meters = {
  reliability: number;
  cost: number;
  risk: number;
  regHeat: number;
};

export type Mission = {
  title: string;
  context: string;
  constraints: string[];
  winConditions: string[];
};

export type Dialogue = {
  title: string;
  lines: string[];
};

export type RagConfig = {
  chunkSize: "small" | "medium" | "large";
  topK: 3 | 5 | 8;
  requireCitations: boolean;
};

export type RagResult = {
  id?: string;
  createdAt?: string;
  passed: boolean;
  score: number; // 0..100
  answer: string;
  citations: string[];
  retrieved: { id: string; title: string; snippet: string }[];
  config: RagConfig;
};

export type EvalResult = {
  id?: string;
  createdAt?: string;
  ran: boolean;
  passRate: number; // 0..100
  failures: { id: string; reason: string }[];
};

export type RefereeVerdict = "SHIP" | "REVISE" | "BLOCK";

export type ReleaseReview = {
  verdict: RefereeVerdict;
  reasons: string[];
  lines: string[];
};

type State = {
  mission: Mission;
  meters: Meters;

  dialogue: Dialogue | null;
  setDialogue: (d: Dialogue | null) => void;

  talkedTo: Record<string, boolean>;
  markTalkedTo: (id: string) => void;

  rag: RagResult | null;
  setRag: (r: RagResult | null) => void;

  eval: EvalResult | null;
  setEval: (e: EvalResult | null) => void;

  verdict: RefereeVerdict | null;
  setVerdict: (v: RefereeVerdict | null) => void;

  showRagPanel: boolean;
  setShowRagPanel: (v: boolean) => void;

  showRagResults: boolean;
  setShowRagResults: (v: boolean) => void;

  showEvalResults: boolean;
  setShowEvalResults: (v: boolean) => void;

  releaseReview: ReleaseReview | null;
  setReleaseReview: (r: ReleaseReview | null) => void;

  showReleaseChecklist: boolean;
  setShowReleaseChecklist: (v: boolean) => void;

  showBookViewer: boolean;
  setShowBookViewer: (v: boolean) => void;

  showArtifactBrowser: boolean;
  setShowArtifactBrowser: (v: boolean) => void;

  showTelemetryDashboard: boolean;
  setShowTelemetryDashboard: (v: boolean) => void;

  showEvalPanel: boolean;
  setShowEvalPanel: (v: boolean) => void;

  applyEffects: (effects?: Partial<Meters>) => void;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export const useGameStore = create<State>((set) => ({
  mission: {
    title: "Utility Outage Copilot",
    context:
      "A critical infrastructure customer needs an AI agent to assist operators during outage season. You must ship safely under regulation and scrutiny.",
    constraints: [
      "Must cite evidence when recommending steps",
      "Must escalate if uncertain or missing required context",
      "Target p95 latency < 800ms",
      "No sensitive data leaves region"
    ],
    winConditions: [
      "Talk to all workstations",
      "RAG test is PASS",
      "Eval suite pass-rate ≥ 80%",
      "Whiteboard verdict is SHIP",
      "Risk ≤ 60 and Reg Heat ≤ 60",
      "Reliability ≥ 55"
    ]
  },
  meters: { reliability: 62, cost: 36, risk: 44, regHeat: 28 },

  dialogue: null,
  setDialogue: (dialogue) => set({ dialogue }),

  talkedTo: {},
  markTalkedTo: (id) => set((s) => ({ talkedTo: { ...s.talkedTo, [id]: true } })),

  rag: null,
  setRag: (rag) => set({ rag }),

  eval: null,
  setEval: (evalResult) => set({ eval: evalResult }),

  verdict: null,
  setVerdict: (verdict) => set({ verdict }),

  showRagPanel: false,
  setShowRagPanel: (showRagPanel) => set({ showRagPanel }),

  showRagResults: false,
  setShowRagResults: (showRagResults) => set({ showRagResults }),

  showEvalResults: false,
  setShowEvalResults: (showEvalResults) => set({ showEvalResults }),

  releaseReview: null,
  setReleaseReview: (releaseReview) => set({ releaseReview }),

  showReleaseChecklist: false,
  setShowReleaseChecklist: (showReleaseChecklist) => set({ showReleaseChecklist }),

  showBookViewer: false,
  setShowBookViewer: (showBookViewer) => set({ showBookViewer }),

  showArtifactBrowser: false,
  setShowArtifactBrowser: (showArtifactBrowser) => set({ showArtifactBrowser }),

  showTelemetryDashboard: false,
  setShowTelemetryDashboard: (showTelemetryDashboard) => set({ showTelemetryDashboard }),

  showEvalPanel: false,
  setShowEvalPanel: (showEvalPanel) => set({ showEvalPanel }),

  applyEffects: (effects) =>
    set((s) => {
      if (!effects) return s;
      const m = { ...s.meters };
      (Object.keys(effects) as (keyof Meters)[]).forEach((k) => {
        const delta = effects[k] ?? 0;
        m[k] = clamp(m[k] + delta);
      });
      return { meters: m };
    })
}));
