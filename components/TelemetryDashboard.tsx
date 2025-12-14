"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useGameStore } from "../lib/store";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

type TelemetrySummary = {
  scenarioId: string;
  window: string;
  latencyP50: number | null;
  latencyP95: number | null;
  errorRate: number;
  escalationRate: number;
  citationCoverage: number;
  totalEvents: number;
};

type TelemetryPoint = { timestamp: string; value: number };

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function formatMs(v: number | null) {
  if (v === null || Number.isNaN(v)) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(2)}s`;
  return `${Math.round(v)}ms`;
}

function Sparkline({ data }: { data: TelemetryPoint[] }) {
  const points = useMemo(() => {
    if (!data?.length) return "";
    const w = 220;
    const h = 56;
    const pad = 3;
    const vals = data.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    return data
      .map((d, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
        const y = pad + (h - pad * 2) * (1 - (d.value - min) / span);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data]);

  return (
    <svg width={220} height={56} viewBox="0 0 220 56" style={{ opacity: 0.95 }}>
      <polyline
        fill="none"
        stroke="rgba(103,232,249,0.9)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export default function TelemetryDashboard() {
  const open = useGameStore((s) => s.showTelemetryDashboard);
  const setOpen = useGameStore((s) => s.setShowTelemetryDashboard);

  const meters = useGameStore((s) => s.meters);
  const rag = useGameStore((s) => s.rag);
  const evalRes = useGameStore((s) => s.eval);

  const [timeWindow, setTimeWindow] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [series, setSeries] = useState<Record<string, TelemetryPoint[]>>({});
  const [err, setErr] = useState<string | null>(null);
  const [simTraffic, setSimTraffic] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const health = useMemo(() => {
    if (!summary) return { label: "—", color: "#fde68a" };
    const badLatency = (summary.latencyP95 ?? 0) > 800;
    const badErrors = summary.errorRate > 0.05;
    const badCites = summary.citationCoverage < 0.6;
    const score = Number(badLatency) + Number(badErrors) + Number(badCites);
    if (score === 0) return { label: "STABLE", color: "#86efac" };
    if (score === 1) return { label: "DEGRADING", color: "#fde68a" };
    return { label: "RISK", color: "#fca5a5" };
  }, [summary]);

  async function refresh() {
    try {
      setErr(null);

      // ✅ IMPORTANT: lib/api.ts already prefixes /api
      const s = await apiGet<TelemetrySummary>(`/telemetry/summary?window=${timeWindow}`);
      setSummary(s);

      const metrics = ["latency_p95", "error_rate", "citation_coverage", "eval_pass_rate"] as const;

      const out: Record<string, TelemetryPoint[]> = {};
      await Promise.all(
        metrics.map(async (m) => {
          out[m] = await apiGet<TelemetryPoint[]>(
            `/telemetry/timeseries?metric=${m}&window=${timeWindow}`
          );
        })
      );
      setSeries(out);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    if (!open) return;
    refresh();

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(refresh, 6000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timeWindow]);

  // Simulated traffic: posts synthetic telemetry based on your current state
  useEffect(() => {
    if (!open || !simTraffic) {
      if (simRef.current) clearInterval(simRef.current);
      simRef.current = null;
      return;
    }

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    async function tick() {
      const latency = clamp(
        420 + meters.cost * 6 + meters.risk * 4 - meters.reliability * 2 + rnd(-80, 140),
        120,
        2600
      );

      const errProb = clamp(0.01 + meters.risk / 220 + meters.regHeat / 420, 0.0, 0.35);
      const success = Math.random() > errProb;

      const citations = rag ? rag.citations.length : 0;
      const passRate = evalRes ? evalRes.passRate : null;

      const escProb = clamp(
        0.02 + meters.risk / 160 + (passRate !== null ? (80 - passRate) / 200 : 0.05),
        0,
        0.6
      );
      const escalated = Math.random() < escProb;

      // ✅ IMPORTANT: no leading /api here
      await apiPost("/telemetry/event", {
        scenarioId: "dayzero-utility-outage",
        agentId: "sim",
        eventType: "response",
        latencyMs: Math.round(latency),
        success,
        metadata: {
          citations,
          escalated,
          ragPassed: rag ? rag.passed : null,
          evalPassRate: passRate,
        },
      });
    }

    if (simRef.current) clearInterval(simRef.current);
    simRef.current = setInterval(() => {
      tick().catch(() => {});
    }, 1600);

    return () => {
      if (simRef.current) clearInterval(simRef.current);
      simRef.current = null;
    };
  }, [open, simTraffic, meters, rag, evalRes]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1050px, 96vw)",
          maxHeight: "88vh",
          overflow: "auto",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: "3px solid rgba(56,189,248,0.65)",
          borderRadius: 14,
          padding: 16,
          fontFamily: mono,
          color: "#e5e7eb",
          boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, color: "#67e8f9" }}>TELEMETRY DASHBOARD</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Metrics Station · latency, errors, citations, escalations. Trends update as you run RAG/Eval and as simulated
              traffic flows.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={refresh}
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Window:</div>
          {(["1h", "6h", "24h", "7d"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              style={{
                border: "1px solid rgba(56,189,248,0.35)",
                background: w === timeWindow ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: 12,
              }}
            >
              {w}
            </button>
          ))}

          <label style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <input type="checkbox" checked={simTraffic} onChange={(e) => setSimTraffic(e.target.checked)} />
            <span style={{ opacity: 0.9 }}>Simulated traffic</span>
          </label>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 12,
              background: "rgba(127,29,29,0.28)",
              border: "1px solid rgba(248,113,113,0.55)",
              padding: 10,
              borderRadius: 12,
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 900, color: "#fecaca" }}>Telemetry error</div>
            <div style={{ marginTop: 6, opacity: 0.9 }}>{err}</div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              Start FastAPI: <b>uvicorn apps.api.main:app --reload --port 8000</b>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>SYSTEM HEALTH</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                Based on p95 latency, error rate, and citation coverage in the current window.
              </div>
            </div>
            <div style={{ fontWeight: 900, color: health.color }}>{health.label}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Latency (p95)</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{formatMs(summary?.latencyP95 ?? null)}</div>
              <div style={{ marginTop: 6 }}><Sparkline data={series["latency_p95"] || []} /></div>
            </div>

            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Error rate</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{summary ? pct(summary.errorRate) : "—"}</div>
              <div style={{ marginTop: 6 }}><Sparkline data={series["error_rate"] || []} /></div>
            </div>

            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Citation coverage</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{summary ? pct(summary.citationCoverage) : "—"}</div>
              <div style={{ marginTop: 6 }}><Sparkline data={series["citation_coverage"] || []} /></div>
            </div>

            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Eval pass rate</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{evalRes ? `${evalRes.passRate}%` : "—"}</div>
              <div style={{ marginTop: 6 }}><Sparkline data={series["eval_pass_rate"] || []} /></div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              fontSize: 12,
            }}
          >
            <div>
              <div style={{ opacity: 0.8 }}>Escalation rate</div>
              <div style={{ marginTop: 4, fontWeight: 900 }}>{summary ? pct(summary.escalationRate) : "—"}</div>
            </div>
            <div>
              <div style={{ opacity: 0.8 }}>Events observed</div>
              <div style={{ marginTop: 4, fontWeight: 900 }}>{summary ? summary.totalEvents : "—"}</div>
            </div>
            <div>
              <div style={{ opacity: 0.8 }}>Constraints target</div>
              <div style={{ marginTop: 4, opacity: 0.92 }}>p95 &lt; 800ms · cite evidence · escalate on uncertainty</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
