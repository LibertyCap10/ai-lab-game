"use client";

import { useMemo } from "react";
import { useGameStore } from "../lib/store";

type Verdict = "SHIP" | "REVISE" | "BLOCK";

const mono =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

type Gate = {
  id: string;
  title: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
  hint?: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function badgeColor(status: Gate["status"]) {
  if (status === "PASS") return { bg: "rgba(34,197,94,0.18)", border: "rgba(34,197,94,0.55)", text: "#86efac" };
  if (status === "WARN") return { bg: "rgba(251,191,36,0.18)", border: "rgba(251,191,36,0.55)", text: "#fde68a" };
  return { bg: "rgba(248,113,113,0.16)", border: "rgba(248,113,113,0.55)", text: "#fca5a5" };
}

function pill(status: Gate["status"]) {
  const c = badgeColor(status);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.6,
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.text,
      }}
    >
      {status}
    </span>
  );
}

function progressBar(label: string, value: number, target?: number, invert?: boolean) {
  // invert means lower is better (risk/regheat)
  const v = clamp(value, 0, 100);
  const t = target !== undefined ? clamp(target, 0, 100) : undefined;

  const good = invert ? v <= (t ?? 60) : v >= (t ?? 55);

  const fill = invert ? (100 - v) : v;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.92 }}>
        <div>
          <b>{label}</b>{" "}
          <span style={{ opacity: 0.85 }}>
            {invert ? "(lower is better)" : "(higher is better)"}
          </span>
        </div>
        <div style={{ fontWeight: 900, color: good ? "#86efac" : "#fca5a5" }}>
          {v}
          {t !== undefined ? ` / target ${t}` : ""}
        </div>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${fill}%`,
            background: good ? "rgba(34,197,94,0.55)" : "rgba(248,113,113,0.55)",
          }}
        />
      </div>

      {t !== undefined ? (
        <div style={{ fontSize: 11, opacity: 0.75 }}>
          Goal: {invert ? `≤ ${t}` : `≥ ${t}`}
        </div>
      ) : null}
    </div>
  );
}

export default function WhiteboardPanel() {
  const open = useGameStore((s) => s.showWhiteboard);
  const setOpen = useGameStore((s) => s.setShowWhiteboard);

  const talkedTo = useGameStore((s) => s.talkedTo);
  const rag = useGameStore((s) => s.rag);
  const evalResult = useGameStore((s) => s.eval);
  const meters = useGameStore((s) => s.meters);

  // If your store contains these flags, we can optionally show them.
  // If not present, they'll just be undefined.
  const releaseReview = useGameStore((s: any) => s.releaseReview);
  const verdictSaved = useGameStore((s: any) => s.verdict);

  const consultedCount = useMemo(
    () => Object.values(talkedTo).filter(Boolean).length,
    [talkedTo]
  );

  const analysis = useMemo(() => {
    // Thresholds (match backend main.py logic)
    const REQ_COUNCIL = 4;
    const REQ_EVAL = 80;
    const REQ_RISK_MAX = 60;
    const REQ_REGHEAT_MAX = 60;
    const REQ_REL_MIN = 55;

    const gates: Gate[] = [];

    // 1) Council
    const councilStatus: Gate["status"] =
      consultedCount >= REQ_COUNCIL ? "PASS" : consultedCount >= 2 ? "WARN" : "FAIL";
    gates.push({
      id: "council",
      title: "Consult the Council (4 advisors)",
      status: councilStatus,
      detail: `Consulted ${consultedCount}/${REQ_COUNCIL}`,
      hint:
        consultedCount < REQ_COUNCIL
          ? "Talk to all four advisors (ML, Product, Infra, Security). Each gives guidance + can change your meters."
          : "All advisors consulted. Good coverage across risk, product, ops, and policy.",
    });

    // 2) RAG gate
    let ragStatus: Gate["status"] = "FAIL";
    if (!rag) ragStatus = "FAIL";
    else ragStatus = rag.passed ? "PASS" : "FAIL";
    gates.push({
      id: "rag",
      title: "RAG Grounding Test",
      status: rag ? (rag.passed ? "PASS" : "FAIL") : "FAIL",
      detail: rag
        ? `Score ${rag.score} → ${rag.passed ? "PASS" : "FAIL"}`
        : "Not run yet",
      hint: !rag
        ? "Run the RAG Test Rig and aim for a passing score (≥ 55)."
        : rag.passed
        ? "Grounding looks acceptable. Citations + retrieved evidence indicate support."
        : "RAG failed. Increase evidence overlap: adjust chunk size / topK / require citations and try again.",
    });

    // 3) Eval gate
    const passRate = evalResult?.passRate ?? null;
    const evalStatus: Gate["status"] =
      passRate === null
        ? "FAIL"
        : passRate >= REQ_EVAL
        ? "PASS"
        : passRate >= 65
        ? "WARN"
        : "FAIL";
    gates.push({
      id: "eval",
      title: "Eval Suite",
      status: evalStatus,
      detail: passRate === null ? "Not run yet" : `Pass rate ${passRate}% (target ≥ ${REQ_EVAL}%)`,
      hint:
        passRate === null
          ? "Run EVAL after RAG. Target pass rate ≥ 80%."
          : passRate >= REQ_EVAL
          ? "Eval meets the safety bar. You're trending release-ready."
          : "Eval is below target. Improve grounding + reduce risky behavior; rerun eval.",
    });

    // 4) Meter gates
    const risk = meters.risk;
    const regHeat = meters.regHeat;
    const reliability = meters.reliability;

    const riskStatus: Gate["status"] =
      risk <= REQ_RISK_MAX ? "PASS" : risk <= 75 ? "WARN" : "FAIL";
    gates.push({
      id: "risk",
      title: "Operational Risk",
      status: riskStatus,
      detail: `Risk ${risk} (must be ≤ ${REQ_RISK_MAX})`,
      hint:
        risk <= REQ_RISK_MAX
          ? "Risk is within acceptable range."
          : "Risk is too high. Seek safer guidance from council, use stronger validation, and escalate when uncertain.",
    });

    const regStatus: Gate["status"] =
      regHeat <= REQ_REGHEAT_MAX ? "PASS" : regHeat <= 75 ? "WARN" : "FAIL";
    gates.push({
      id: "regheat",
      title: "Regulatory Heat",
      status: regStatus,
      detail: `RegHeat ${regHeat} (must be ≤ ${REQ_REGHEAT_MAX})`,
      hint:
        regHeat <= REQ_REGHEAT_MAX
          ? "Compliance risk is acceptable."
          : "RegHeat is too high. Prefer citation-backed answers and escalate on missing authorization/context.",
    });

    const relStatus: Gate["status"] =
      reliability >= REQ_REL_MIN ? "PASS" : reliability >= 45 ? "WARN" : "FAIL";
    gates.push({
      id: "reliability",
      title: "Reliability",
      status: relStatus,
      detail: `Reliability ${reliability} (must be ≥ ${REQ_REL_MIN})`,
      hint:
        reliability >= REQ_REL_MIN
          ? "Reliability meets the bar."
          : "Reliability is low. Use better grounding, fewer guesses, and consult infra/security guidance.",
    });

    // Overall verdict (mirror backend)
    const reasons: string[] = [];
    if (consultedCount < REQ_COUNCIL) reasons.push("You have not consulted all four council members.");
    if (!rag?.passed) reasons.push("RAG Test Rig did not pass.");
    if ((evalResult?.passRate ?? 0) < REQ_EVAL) reasons.push(`Eval pass rate too low (${evalResult?.passRate ?? 0}% < ${REQ_EVAL}%).`);
    if (risk > REQ_RISK_MAX) reasons.push(`Risk too high (${risk} > ${REQ_RISK_MAX}).`);
    if (regHeat > REQ_REGHEAT_MAX) reasons.push(`Regulatory heat too high (${regHeat} > ${REQ_REGHEAT_MAX}).`);
    if (reliability < REQ_REL_MIN) reasons.push(`Reliability too low (${reliability} < ${REQ_REL_MIN}).`);

    let verdict: Verdict = "REVISE";
    if (reasons.length === 0) verdict = "SHIP";
    else if (risk >= 80 || regHeat >= 80) verdict = "BLOCK";

    // Next steps: prioritized
    const nextSteps: { title: string; why: string }[] = [];
    const hasCouncil = consultedCount >= REQ_COUNCIL;
    const hasRag = !!rag;
    const hasEval = !!passRate;

    if (!hasCouncil) {
      nextSteps.push({
        title: "Consult all 4 council members",
        why: "Required for release review. Their advice improves your decision process and meters.",
      });
    }
    if (!hasRag || !rag?.passed) {
      nextSteps.push({
        title: hasRag ? "Re-run RAG until it passes" : "Run the RAG Test Rig",
        why: "Passing grounding is mandatory. Score must be ≥ 55.",
      });
    }
    if (!hasEval || (passRate ?? 0) < REQ_EVAL) {
      nextSteps.push({
        title: hasEval ? "Re-run Eval until ≥ 80%" : "Run the Eval Suite",
        why: "Eval approximates safety readiness; target pass rate is 80%+.",
      });
    }
    if (risk > REQ_RISK_MAX) {
      nextSteps.push({
        title: "Reduce Risk to ≤ 60",
        why: "High risk can BLOCK release (≥ 80). Improve guardrails and escalate on uncertainty.",
      });
    }
    if (regHeat > REQ_REGHEAT_MAX) {
      nextSteps.push({
        title: "Reduce RegHeat to ≤ 60",
        why: "Compliance problems can BLOCK release (≥ 80). Prefer citations + policy escalation.",
      });
    }
    if (reliability < REQ_REL_MIN) {
      nextSteps.push({
        title: "Increase Reliability to ≥ 55",
        why: "Low reliability means unsafe/unstable performance. Improve grounding + validation.",
      });
    }

    // If everything passes, give a “what now”
    if (verdict === "SHIP") {
      nextSteps.push({
        title: "Proceed to the Exit Door for release",
        why: "You’ve cleared all gates: council, grounding, eval, and meter thresholds.",
      });
    }

    // A “completion score” (for player feedback)
    const passCount = gates.filter((g) => g.status === "PASS").length;
    const score = Math.round((passCount / gates.length) * 100);

    return { verdict, reasons, gates, nextSteps, score };
  }, [consultedCount, rag, evalResult, meters]);

  if (!open) return null;

  const verdictColors =
    analysis.verdict === "SHIP"
      ? { border: "rgba(34,197,94,0.60)", glow: "rgba(34,197,94,0.35)", text: "#86efac" }
      : analysis.verdict === "BLOCK"
      ? { border: "rgba(248,113,113,0.60)", glow: "rgba(248,113,113,0.35)", text: "#fca5a5" }
      : { border: "rgba(251,191,36,0.60)", glow: "rgba(251,191,36,0.35)", text: "#fde68a" };

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
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "88vh",
          overflow: "auto",
          background: "linear-gradient(180deg, #020617, #0b1226)",
          border: `3px solid ${verdictColors.border}`,
          boxShadow: `0 30px 90px rgba(0,0,0,0.6), 0 0 40px ${verdictColors.glow}`,
          borderRadius: 14,
          padding: 18,
          fontFamily: mono,
          color: "#e5e7eb",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 950, letterSpacing: 0.6, color: verdictColors.text }}>
              WHITEBOARD — RELEASE STATUS
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              This is your live readiness report. It updates instantly based on what you’ve done.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
              }}
              title="How many gates are currently passing"
            >
              Readiness: <b>{analysis.score}%</b>
            </div>

            {verdictSaved ? (
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.85,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                Stored verdict: <b>{String(verdictSaved)}</b>
              </div>
            ) : null}

            <button
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Overall verdict */}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            border: `2px solid ${verdictColors.border}`,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Current verdict</div>
              <div style={{ fontSize: 22, fontWeight: 950, color: verdictColors.text }}>
                {analysis.verdict}
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, textAlign: "right", lineHeight: 1.35 }}>
              {analysis.verdict === "SHIP" ? (
                <>
                  ✅ You meet the current safety bar.
                  <br />
                  Head to the Exit Door to ship the release.
                </>
              ) : analysis.verdict === "BLOCK" ? (
                <>
                  ⛔ Release is blocked.
                  <br />
                  Risk/RegHeat is critically high (≥ 80).
                </>
              ) : (
                <>
                  ⚠️ Revise required.
                  <br />
                  Complete missing gates or reduce risk/compliance issues.
                </>
              )}
            </div>
          </div>

          {analysis.reasons.length ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900, color: "#93c5fd", fontSize: 12 }}>Why</div>
              <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                {analysis.reasons.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      opacity: 0.92,
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    • {r}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Next steps + Scorecard */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12 }}>
          {/* Next steps */}
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 950, color: "#7dd3fc" }}>Next steps</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>
                Ordered by importance
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {analysis.nextSteps.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 13 }}>{i + 1}. {s.title}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                    {s.why}
                  </div>
                </div>
              ))}
            </div>

            {releaseReview ? (
              <div style={{ marginTop: 12, fontSize: 11, opacity: 0.75 }}>
                Note: Release review object exists in store (debug): {JSON.stringify(releaseReview).slice(0, 120)}…
              </div>
            ) : null}
          </div>

          {/* Scorecard */}
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontWeight: 950, color: "#7dd3fc" }}>Gate scorecard</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {analysis.gates.map((g) => {
                const c = badgeColor(g.status);
                return (
                  <div
                    key={g.id}
                    style={{
                      padding: 10,
                      borderRadius: 14,
                      border: `1px solid ${c.border}`,
                      background: c.bg,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 950, fontSize: 13 }}>{g.title}</div>
                      {pill(g.status)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.92 }}>{g.detail}</div>
                    {g.hint ? (
                      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.82, lineHeight: 1.35 }}>
                        Hint: {g.hint}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Meter visualization */}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 950, color: "#7dd3fc" }}>Meters (live)</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>
              These are the operational constraints you’re trying to satisfy.
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {progressBar("Reliability", meters.reliability, 55, false)}
            {progressBar("Cost", meters.cost, undefined, false)}
            {progressBar("Risk", meters.risk, 60, true)}
            {progressBar("RegHeat", meters.regHeat, 60, true)}
          </div>
        </div>

        {/* Footer tips */}
        <div style={{ marginTop: 14, fontSize: 11, opacity: 0.78, lineHeight: 1.45 }}>
          <b>Pro tip:</b> If you’re stuck, consult Security/Policy for escalation rules and Infra for latency/cost tradeoffs.
          The Whiteboard is your “what should I do next?” panel — come back anytime.
        </div>
      </div>
    </div>
  );
}
