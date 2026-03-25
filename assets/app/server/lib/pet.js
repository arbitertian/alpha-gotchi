import { asArray, clamp, pickNumber } from "./helpers.js";

function deriveDrawdownPenalty(positions, history) {
  const openLoss = asArray(positions)
    .map((item) => Math.min(0, pickNumber(item, ["upl", "unrealizedPnl"], 0)))
    .reduce((sum, value) => sum + value, 0);

  const realizedLoss = asArray(history)
    .map((item) => Math.min(0, pickNumber(item, ["realizedPnl", "pnl"], 0)))
    .reduce((sum, value) => sum + value, 0);

  return Math.abs(openLoss) + Math.abs(realizedLoss);
}

export function computePetState({ onboarding, dashboard, selectedProfileMode }) {
  const totalEquity = pickNumber(dashboard.balanceSummary, ["totalEquity"], 0);
  const availableEquity = pickNumber(dashboard.balanceSummary, ["availableEquity"], 0);
  const openUpl = asArray(dashboard.positions)
    .map((item) => pickNumber(item, ["upl"], 0))
    .reduce((sum, value) => sum + value, 0);
  const realizedRecent = asArray(dashboard.positionHistory)
    .map((item) => pickNumber(item, ["realizedPnl"], 0))
    .reduce((sum, value) => sum + value, 0);
  const averageLeverage =
    asArray(dashboard.positions)
      .map((item) => pickNumber(item, ["lever"], 0))
      .reduce((sum, value) => sum + value, 0) / Math.max(1, asArray(dashboard.positions).length);
  const activeBots = asArray(dashboard.bots).filter((item) => item.state !== "stopped").length;
  const drawdownPenalty = deriveDrawdownPenalty(dashboard.positions, dashboard.positionHistory);

  const hp = onboarding.required
    ? 18
    : clamp(60 + totalEquity * 0.015 - drawdownPenalty * 0.06 + availableEquity * 0.01, 5, 100);
  const mood = onboarding.required
    ? 12
    : clamp(50 + openUpl * 0.25 + realizedRecent * 0.2 - drawdownPenalty * 0.08, 5, 100);
  const energy = onboarding.required
    ? 20
    : clamp(40 + availableEquity * 0.02 + activeBots * 6, 5, 100);
  const discipline = onboarding.required
    ? 15
    : clamp(70 - averageLeverage * 7 - activeBots * 2 + (dashboard.positions.length ? 0 : 8), 5, 100);

  const overall = (hp + mood + energy + discipline) / 4;
  let evolutionStage = "baby";
  if (onboarding.required) {
    evolutionStage = "onboarding";
  } else if (overall >= 80) {
    evolutionStage = "elite";
  } else if (overall >= 62) {
    evolutionStage = "evolved";
  } else if (overall >= 40) {
    evolutionStage = "active";
  }

  let animation = "idle";
  if (onboarding.required) {
    animation = "egg";
  } else if (mood >= 72) {
    animation = "jump";
  } else if (activeBots > 0) {
    animation = "patrol";
  } else if (mood <= 30 || discipline <= 28) {
    animation = "stressed";
  } else if (energy <= 30) {
    animation = "sleep";
  }

  return {
    name: "Alpha-Gotchi",
    selectedProfileMode,
    hp: Math.round(hp),
    mood: Math.round(mood),
    energy: Math.round(energy),
    discipline: Math.round(discipline),
    evolutionStage,
    animation,
    summary: onboarding.required
      ? "Pet is waiting for setup to finish."
      : activeBots > 0
        ? "Pet is actively patrolling your OKX routines."
        : mood >= 65
          ? "Pet is thriving on healthy account momentum."
          : "Pet is stable and watching the account closely."
  };
}
