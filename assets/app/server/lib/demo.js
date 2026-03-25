import { clamp, makeId, toNumber, trimText } from "./helpers.js";
import { readJson, writeJson } from "./store.js";

export const SYNTHETIC_PROFILE = "alpha-demo";

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function capList(items, limit) {
  return items.slice(0, limit);
}

function prependItem(items, item, limit) {
  return capList([item, ...items], limit);
}

function makeDemoBill({ instId = "", ccy = "USDT", type = "trade", balanceChange = 0 }) {
  return {
    billId: makeId("demo-bill"),
    instId,
    ccy,
    type,
    balanceChange: Number(balanceChange.toFixed(2)),
    timestamp: nowIso()
  };
}

function makeDemoHistory({ instId = "", realizedPnl = 0, closeAvgPx = 0, openAvgPx = 0 }) {
  return {
    instId,
    realizedPnl: Number(realizedPnl.toFixed(2)),
    closeAvgPx: Number(closeAvgPx.toFixed(2)),
    openAvgPx: Number(openAvgPx.toFixed(2)),
    updatedAt: nowIso()
  };
}

function getDefaultDemoState() {
  return {
    version: 1,
    tick: 0,
    marketInstId: "BTC-USDT",
    priceBias: 0,
    balances: [
      { ccy: "USDT", equity: 12480, available: 8920, frozen: 540 },
      { ccy: "BTC", equity: 0.182, available: 0.151, frozen: 0.021 },
      { ccy: "ETH", equity: 3.6, available: 2.9, frozen: 0.35 }
    ],
    positions: [
      { instId: "BTC-USDT-SWAP", side: "long", size: 2, avgPx: 92680, lever: 3 },
      { instId: "ETH-USDT-SWAP", side: "short", size: 4, avgPx: 3515, lever: 2 }
    ],
    positionHistory: [
      makeDemoHistory({ instId: "SOL-USDT-SWAP", realizedPnl: 146, closeAvgPx: 181.4, openAvgPx: 168.2 }),
      makeDemoHistory({ instId: "BTC-USDT-SWAP", realizedPnl: 82, closeAvgPx: 91960, openAvgPx: 91240 }),
      makeDemoHistory({ instId: "ETH-USDT-SWAP", realizedPnl: -42, closeAvgPx: 3470, openAvgPx: 3514 })
    ],
    bills: [
      makeDemoBill({ instId: "BTC-USDT", ccy: "USDT", type: "spot-buy", balanceChange: -820 }),
      makeDemoBill({ instId: "BTC-USDT-SWAP", ccy: "USDT", type: "swap-pnl", balanceChange: 136 }),
      makeDemoBill({ instId: "ETH-USDT-SWAP", ccy: "USDT", type: "bot-pnl", balanceChange: 58 })
    ],
    bots: [
      {
        kind: "spot-grid",
        algoId: "demo-grid-01",
        instId: "BTC-USDT",
        state: "running",
        basePnl: 96,
        pnlRatioBase: 0.031
      },
      {
        kind: "dca",
        algoId: "demo-dca-01",
        instId: "ETH-USDT-SWAP",
        state: "running",
        basePnl: 42,
        pnlRatioBase: 0.017
      }
    ],
    earn: [{ ccy: "USDT", amount: 680, rate: 0.061 }],
    botCounter: 2
  };
}

function getAssetPrice(ccy, tick, bias = 0) {
  if (ccy === "USDT") {
    return 1;
  }

  const phase = tick + bias * 0.15;
  if (ccy === "BTC") {
    return 93600 + Math.sin(phase / 2.4) * 1480 + Math.cos(phase / 5.3) * 460 + bias * 16;
  }
  if (ccy === "ETH") {
    return 3380 + Math.sin(phase / 2) * 140 + Math.cos(phase / 4.6) * 48 + bias * 1.3;
  }
  if (ccy === "SOL") {
    return 188 + Math.sin(phase / 1.8) * 14 + Math.cos(phase / 4.2) * 5 + bias * 0.2;
  }
  return 100 + Math.sin(phase / 3.4) * 8;
}

function getInstrumentPrice(instId, tick, bias = 0) {
  const [base = "BTC"] = `${instId || ""}`.split("-");
  return getAssetPrice(base, tick, bias);
}

function getContractExposure(instId) {
  if (`${instId}`.startsWith("BTC-")) {
    return 950;
  }
  if (`${instId}`.startsWith("ETH-")) {
    return 320;
  }
  if (`${instId}`.startsWith("SOL-")) {
    return 92;
  }
  return 140;
}

function getBalance(state, ccy) {
  let balance = state.balances.find((item) => item.ccy === ccy);
  if (!balance) {
    balance = { ccy, equity: 0, available: 0, frozen: 0 };
    state.balances.push(balance);
  }
  return balance;
}

function normalizeSpotInst(instId) {
  const [base = "BTC", quote = "USDT"] = `${instId || ""}`.split("-");
  return { base, quote };
}

function computeDerivedDashboard(state) {
  const marketLast = getInstrumentPrice(state.marketInstId, state.tick, state.priceBias);
  const balances = state.balances
    .map((item) => ({
      ccy: item.ccy,
      equity: Number(item.equity.toFixed(8)),
      available: Number(item.available.toFixed(8)),
      frozen: Number(item.frozen.toFixed(8)),
      usdValue: Number((item.equity * getAssetPrice(item.ccy, state.tick, state.priceBias)).toFixed(2))
    }))
    .filter((item) => item.equity > 0.000001 || item.available > 0.000001 || item.frozen > 0.000001);

  const positions = state.positions.map((item) => {
    const markPrice = getInstrumentPrice(item.instId, state.tick, state.priceBias);
    const exposure = getContractExposure(item.instId);
    const direction = item.side === "short" ? -1 : 1;
    const pnlRatio = ((markPrice - item.avgPx) / Math.max(item.avgPx, 1)) * direction;
    return {
      ...item,
      size: Number(item.size.toFixed(4)),
      avgPx: Number(item.avgPx.toFixed(2)),
      currentPx: Number(markPrice.toFixed(2)),
      upl: Number((pnlRatio * exposure * item.size).toFixed(2))
    };
  });

  const bots = state.bots.map((item, index) => {
    const wave = Math.sin((state.tick + index * 1.7) / 2.2);
    return {
      kind: item.kind,
      algoId: item.algoId,
      instId: item.instId,
      state: item.state,
      pnl: Number((item.basePnl + wave * 28).toFixed(2)),
      pnlRatio: Number((item.pnlRatioBase + wave * 0.008).toFixed(4))
    };
  });

  const totalSpotEquity = balances.reduce((sum, item) => sum + item.usdValue, 0);
  const availableSpotEquity = balances.reduce(
    (sum, item) => sum + item.available * getAssetPrice(item.ccy, state.tick, state.priceBias),
    0
  );
  const totalOpenUpl = positions.reduce((sum, item) => sum + item.upl, 0);
  const earn = state.earn.map((item) => ({
    ccy: item.ccy,
    amount: Number(item.amount.toFixed(2)),
    rate: Number(item.rate.toFixed(4))
  }));
  const earnUsd = earn.reduce(
    (sum, item) => sum + item.amount * getAssetPrice(item.ccy, state.tick, state.priceBias),
    0
  );

  return {
    selectedProfileMode: "demo",
    resolvedProfile: SYNTHETIC_PROFILE,
    market: {
      instId: state.marketInstId,
      last: Number(marketLast.toFixed(2)),
      change24h: Number((Math.sin((state.tick + 3) / 5.2) * 4.8).toFixed(2)),
      vol24h: Number((24000 + Math.cos((state.tick + 5) / 6.3) * 3800).toFixed(2)),
      updatedAt: nowIso()
    },
    balances: capList(balances, 12),
    balanceSummary: {
      totalEquity: Number((totalSpotEquity + totalOpenUpl + earnUsd).toFixed(2)),
      availableEquity: Number((availableSpotEquity + earnUsd * 0.25).toFixed(2))
    },
    positions: capList(positions, 12),
    positionHistory: capList(state.positionHistory, 12),
    bills: capList(state.bills, 20),
    bots: capList(bots, 12),
    earn,
    notices: [
      "Showcase demo mode is active. No real OKX requests are being sent.",
      "Demo actions only mutate local state so you can rehearse the full Alpha-Gotchi story."
    ],
    refreshedAt: nowIso()
  };
}

function bumpTick(state, reason) {
  const next = clone(state);
  next.tick += reason.startsWith("action:") ? 2 : 1;
  next.priceBias = clamp(next.priceBias, -400, 400);
  return next;
}

async function saveDemoState(runtime, state) {
  await writeJson(runtime.demoFile, state);
}

export async function ensureDemoState(runtime) {
  const existing = await readJson(runtime.demoFile, null);
  if (existing) {
    return existing;
  }
  const created = getDefaultDemoState();
  await saveDemoState(runtime, created);
  return created;
}

export function isSyntheticProfile(profileName) {
  return profileName === SYNTHETIC_PROFILE;
}

export function applyDemoMode(preflight, enabled) {
  const next = clone(preflight);
  next.demoMode = {
    enabled: !!enabled,
    syntheticProfile: enabled ? SYNTHETIC_PROFILE : null,
    detail: enabled
      ? "Local showcase demo is active."
      : "Off"
  };

  if (!enabled) {
    return next;
  }

  next.primaryMode = "demo";
  next.profiles.demo = {
    usable: true,
    resolvedProfile: SYNTHETIC_PROFILE,
    detail: "Alpha-Gotchi showcase profile is active.",
    attempts: [{ alias: SYNTHETIC_PROFILE, ok: true, stderr: "" }],
    synthetic: true
  };
  next.modules.market = {
    available: true,
    detail: "Synthetic market feed is active for showcase mode."
  };
  next.modules.portfolio.demo = true;
  next.modules.trade.demo = true;
  next.modules.bot.demo = true;
  next.modules.earn.demo = false;
  if (!next.profiles.live.usable) {
    next.modules.earn.detail = "Earn remains live-only. Add a live profile to unlock it.";
  }
  next.onboarding = {
    required: false,
    checklist: [
      ...next.onboarding.checklist,
      {
        key: "showcase-demo",
        label: "Showcase demo",
        ok: true,
        detail: "Synthetic balances, positions, bots, and actions are now available."
      }
    ]
  };

  return next;
}

export async function collectDemoDashboard(runtime, { reason = "demo-refresh" } = {}) {
  const current = await ensureDemoState(runtime);
  const next = bumpTick(current, reason);
  await saveDemoState(runtime, next);
  return computeDerivedDashboard(next);
}

export async function simulateDemoAction(runtime, prepared) {
  const state = clone(await ensureDemoState(runtime));
  const params = prepared.params || {};
  const prices = {
    demoMarket: getInstrumentPrice("BTC-USDT", state.tick, state.priceBias)
  };
  let stdout = "Simulated Alpha-Gotchi action locally.";

  switch (prepared.id) {
    case "spot-market-order": {
      const { base, quote } = normalizeSpotInst(params.instId);
      const baseBalance = getBalance(state, base);
      const quoteBalance = getBalance(state, quote);
      const price = getInstrumentPrice(params.instId, state.tick, state.priceBias);
      const rawSize = Math.max(toNumber(params.sz, 0), 0);
      const baseQty = params.tgtCcy === "quote_ccy" ? rawSize / Math.max(price, 1) : rawSize;
      const quoteCost = params.tgtCcy === "quote_ccy" ? rawSize : baseQty * price;

      if (params.side === "sell") {
        const sellQty = Math.min(baseBalance.available, baseQty || baseBalance.available);
        baseBalance.equity = Math.max(0, baseBalance.equity - sellQty);
        baseBalance.available = Math.max(0, baseBalance.available - sellQty);
        quoteBalance.equity += sellQty * price;
        quoteBalance.available += sellQty * price;
        state.bills = prependItem(
          state.bills,
          makeDemoBill({
            instId: params.instId,
            ccy: quote,
            type: "spot-sell",
            balanceChange: sellQty * price
          }),
          20
        );
        stdout = `Simulated spot sell on ${params.instId} for ${sellQty.toFixed(4)} ${base}.`;
      } else {
        const spend = Math.min(quoteBalance.available, quoteCost || quoteBalance.available);
        const received = params.tgtCcy === "quote_ccy" ? spend / Math.max(price, 1) : baseQty;
        quoteBalance.equity = Math.max(0, quoteBalance.equity - spend);
        quoteBalance.available = Math.max(0, quoteBalance.available - spend);
        baseBalance.equity += received;
        baseBalance.available += received;
        state.bills = prependItem(
          state.bills,
          makeDemoBill({
            instId: params.instId,
            ccy: quote,
            type: "spot-buy",
            balanceChange: -spend
          }),
          20
        );
        stdout = `Simulated spot buy on ${params.instId} using ${spend.toFixed(2)} ${quote}.`;
      }
      break;
    }

    case "swap-market-order": {
      const instId = params.instId || "BTC-USDT-SWAP";
      const posSide = params.posSide || "long";
      const size = Math.max(toNumber(params.sz, 1), 0.1);
      const price = getInstrumentPrice(instId, state.tick, state.priceBias);
      const usdt = getBalance(state, "USDT");
      const marginFreeze = Math.max(40, size * 55);
      const existing = state.positions.find((item) => item.instId === instId && item.side === posSide);

      if (existing) {
        const nextSize = existing.size + size;
        existing.avgPx = (existing.avgPx * existing.size + price * size) / Math.max(nextSize, 0.0001);
        existing.size = nextSize;
        existing.lever = Math.max(existing.lever, toNumber(params.lever, existing.lever || 3));
      } else {
        state.positions.unshift({
          instId,
          side: posSide,
          size,
          avgPx: price,
          lever: 3
        });
      }

      usdt.available = Math.max(0, usdt.available - marginFreeze);
      usdt.frozen += marginFreeze;
      state.bills = prependItem(
        state.bills,
        makeDemoBill({
          instId,
          ccy: "USDT",
          type: "swap-open",
          balanceChange: -marginFreeze
        }),
        20
      );
      stdout = `Simulated ${posSide} swap order on ${instId} with ${size} contract(s).`;
      break;
    }

    case "grid-create-spot":
    case "dca-create": {
      state.botCounter += 1;
      const kind = prepared.id === "grid-create-spot" ? "spot-grid" : "dca";
      const instId = params.instId || (kind === "dca" ? "BTC-USDT-SWAP" : "BTC-USDT");
      state.bots = prependItem(
        state.bots,
        {
          kind,
          algoId: `demo-${kind}-${String(state.botCounter).padStart(2, "0")}`,
          instId,
          state: "running",
          basePnl: 16,
          pnlRatioBase: 0.009
        },
        12
      );
      stdout =
        prepared.id === "grid-create-spot"
          ? `Simulated a spot grid bot on ${instId}.`
          : `Simulated a DCA bot on ${instId}.`;
      break;
    }

    case "grid-stop": {
      const target = state.bots.find((item) => item.algoId === params.algoId);
      if (target) {
        target.state = "stopped";
        stdout = `Simulated stop for bot ${params.algoId}.`;
      } else {
        stdout = `Bot ${params.algoId || "unknown"} was not found in demo state.`;
      }
      break;
    }

    case "swap-close-position": {
      const positionIndex = state.positions.findIndex(
        (item) => item.instId === params.instId && item.side === params.posSide
      );
      if (positionIndex >= 0) {
        const [position] = state.positions.splice(positionIndex, 1);
        const markPrice = getInstrumentPrice(position.instId, state.tick, state.priceBias);
        const direction = position.side === "short" ? -1 : 1;
        const pnlRatio = ((markPrice - position.avgPx) / Math.max(position.avgPx, 1)) * direction;
        const realizedPnl = pnlRatio * getContractExposure(position.instId) * position.size;
        const usdt = getBalance(state, "USDT");
        usdt.available += Math.max(60, position.size * 55) + realizedPnl;
        usdt.equity += realizedPnl;
        usdt.frozen = Math.max(0, usdt.frozen - Math.max(30, position.size * 25));
        state.positionHistory = prependItem(
          state.positionHistory,
          makeDemoHistory({
            instId: position.instId,
            realizedPnl,
            closeAvgPx: markPrice,
            openAvgPx: position.avgPx
          }),
          12
        );
        state.bills = prependItem(
          state.bills,
          makeDemoBill({
            instId: position.instId,
            ccy: "USDT",
            type: "swap-close",
            balanceChange: realizedPnl
          }),
          20
        );
        stdout = `Simulated closing the ${position.side} position on ${position.instId}.`;
      } else {
        stdout = "No matching demo position was found to close.";
      }
      break;
    }

    case "swap-trailing-stop":
    case "spot-trailing-stop":
    case "spot-cancel-order": {
      state.bills = prependItem(
        state.bills,
        makeDemoBill({
          instId: params.instId || "BTC-USDT",
          ccy: "USDT",
          type: prepared.id,
          balanceChange: 0
        }),
        20
      );
      stdout = `Simulated ${prepared.label.toLowerCase()} locally.`;
      break;
    }

    default:
      stdout = trimText(`No synthetic handler was needed for ${prepared.id}.`, 160);
      break;
  }

  const next = bumpTick(state, `action:${prepared.id}`);
  await saveDemoState(runtime, next);

  return {
    ok: true,
    stdout,
    stderr: "",
    payload: {
      simulated: true,
      profile: SYNTHETIC_PROFILE,
      actionId: prepared.id,
      marketAnchor: Number(prices.demoMarket.toFixed(2))
    }
  };
}
