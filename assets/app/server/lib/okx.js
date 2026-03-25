import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  asArray,
  okxSucceeded,
  pickNumber,
  pickString,
  prettyDate,
  toNumber,
  trimText,
  unwrapOkxData
} from "./helpers.js";

const execFileAsync = promisify(execFile);

const PROFILE_ALIASES = {
  demo: ["demo", "okx-demo"],
  live: ["live", "okx-prod"]
};

function tryParseJson(stdout) {
  const trimmed = `${stdout || ""}`.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed];
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

async function runCommand(command, args, { timeoutMs = 20000 } = {}) {
  try {
    const result = await execFileAsync(command, args, {
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      shell: process.platform === "win32"
    });

    return {
      ok: true,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      code: 0
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "Unknown command error",
      code: typeof error.code === "number" ? error.code : 1
    };
  }
}

export async function hasCommand(name) {
  const locator = process.platform === "win32" ? "where" : "which";
  const result = await runCommand(locator, [name], { timeoutMs: 8000 });
  if (!result.ok) {
    return null;
  }
  const firstLine = `${result.stdout || ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine || null;
}

export async function runOkxRaw(args, options) {
  return runCommand("okx", args, options);
}

export async function runOkxJson(args, options) {
  const finalArgs = args.includes("--json") ? args : [...args, "--json"];
  const result = await runOkxRaw(finalArgs, options);
  const payload = tryParseJson(result.stdout);
  return {
    ...result,
    payload,
    ok: result.ok && !!payload && okxSucceeded(payload)
  };
}

function buildChecklist(preflight) {
  return [
    {
      key: "node",
      label: "Node.js",
      ok: preflight.dependencies.node.available,
      detail: preflight.dependencies.node.detail
    },
    {
      key: "npm",
      label: "npm",
      ok: preflight.dependencies.npm.available,
      detail: preflight.dependencies.npm.detail
    },
    {
      key: "okx",
      label: "OKX CLI",
      ok: preflight.dependencies.okx.available,
      detail: preflight.dependencies.okx.detail
    },
    {
      key: "config",
      label: "OKX config",
      ok: preflight.config.detected,
      detail: preflight.config.detail
    },
    {
      key: "demo",
      label: "Demo profile",
      ok: preflight.profiles.demo.usable,
      detail: preflight.profiles.demo.detail
    },
    {
      key: "live",
      label: "Live profile",
      ok: preflight.profiles.live.usable,
      detail: preflight.profiles.live.detail
    }
  ];
}

async function testProfile(mode) {
  const aliases = PROFILE_ALIASES[mode];
  const attempts = [];

  for (const alias of aliases) {
    const result = await runOkxJson(["--profile", alias, "account", "balance", "USDT"]);
    attempts.push({
      alias,
      ok: result.ok,
      stderr: trimText(result.stderr || result.stdout, 160)
    });
    if (result.ok) {
      return {
        mode,
        usable: true,
        resolvedProfile: alias,
        detail: `Resolved as ${alias}`,
        attempts
      };
    }
  }

  const lastError = attempts.find((item) => item.stderr)?.stderr || "Profile not ready";
  return {
    mode,
    usable: false,
    resolvedProfile: null,
    detail: lastError,
    attempts
  };
}

async function testEarn(resolvedLiveProfile) {
  if (!resolvedLiveProfile) {
    return {
      available: false,
      detail: "Live profile not ready"
    };
  }

  const result = await runOkxJson([
    "--profile",
    resolvedLiveProfile,
    "earn",
    "savings",
    "balance"
  ]);

  return {
    available: result.ok,
    detail: result.ok ? "Simple Earn available" : trimText(result.stderr || result.stdout, 180)
  };
}

export async function getPreflightStatus() {
  const npmPath = await hasCommand("npm");
  const okxPath = await hasCommand("okx");
  const configResult = okxPath ? await runOkxRaw(["config", "show"]) : null;
  const configText = `${configResult?.stdout || ""}\n${configResult?.stderr || ""}`.trim();

  const preflight = {
    checkedAt: new Date().toISOString(),
    dependencies: {
      node: {
        available: true,
        detail: process.version
      },
      npm: {
        available: !!npmPath,
        detail: npmPath || "npm not found"
      },
      okx: {
        available: !!okxPath,
        detail: okxPath || "okx CLI not found"
      }
    },
    config: {
      detected: !!configText && configResult?.ok !== false,
      detail: configText
        ? trimText(configText.split(/\r?\n/).filter(Boolean).slice(0, 3).join(" | "), 180)
        : "No OKX config detected"
    },
    profiles: {
      demo: {
        usable: false,
        resolvedProfile: null,
        detail: "Profile not checked yet",
        attempts: []
      },
      live: {
        usable: false,
        resolvedProfile: null,
        detail: "Profile not checked yet",
        attempts: []
      }
    },
    modules: {
      market: {
        available: !!okxPath,
        detail: okxPath ? "Public market data ready" : "Install okx CLI first"
      },
      portfolio: {
        demo: false,
        live: false
      },
      trade: {
        demo: false,
        live: false
      },
      bot: {
        demo: false,
        live: false
      },
      earn: {
        demo: false,
        live: false,
        detail: "Earn is live-only"
      }
    },
    primaryMode: null
  };

  if (okxPath) {
    preflight.profiles.demo = await testProfile("demo");
    preflight.profiles.live = await testProfile("live");
  }

  preflight.modules.portfolio.demo = preflight.profiles.demo.usable;
  preflight.modules.portfolio.live = preflight.profiles.live.usable;
  preflight.modules.trade.demo = preflight.profiles.demo.usable;
  preflight.modules.trade.live = preflight.profiles.live.usable;
  preflight.modules.bot.demo = preflight.profiles.demo.usable;
  preflight.modules.bot.live = preflight.profiles.live.usable;

  const earn = await testEarn(preflight.profiles.live.resolvedProfile);
  preflight.modules.earn.live = earn.available;
  preflight.modules.earn.detail = earn.detail;

  preflight.primaryMode = preflight.profiles.demo.usable
    ? "demo"
    : preflight.profiles.live.usable
      ? "live"
      : "demo";

  preflight.onboarding = {
    required: !(preflight.profiles.demo.usable || preflight.profiles.live.usable),
    checklist: buildChecklist(preflight)
  };

  return preflight;
}

export function resolveSelectedProfile(preflight, preferredMode = "demo") {
  if (preferredMode && preflight.profiles[preferredMode]?.usable) {
    return {
      mode: preferredMode,
      resolvedProfile: preflight.profiles[preferredMode].resolvedProfile
    };
  }

  if (preflight.profiles.demo.usable) {
    return {
      mode: "demo",
      resolvedProfile: preflight.profiles.demo.resolvedProfile
    };
  }

  if (preflight.profiles.live.usable) {
    return {
      mode: "live",
      resolvedProfile: preflight.profiles.live.resolvedProfile
    };
  }

  return {
    mode: preferredMode || preflight.primaryMode,
    resolvedProfile: null
  };
}

function normalizeTicker(payload) {
  const entry = unwrapOkxData(payload)[0] || {};
  return {
    instId: pickString(entry, ["instId"], "BTC-USDT"),
    last: pickNumber(entry, ["last", "lastPx"], 0),
    change24h: pickNumber(entry, ["change24h", "chgUtc24h", "priceChangePercent"], 0),
    vol24h: pickNumber(entry, ["vol24h"], 0),
    updatedAt: prettyDate(pickString(entry, ["ts", "uTime"], ""))
  };
}

function normalizeBalances(payload) {
  const rows = [];
  let totalEquity = 0;

  for (const entry of unwrapOkxData(payload)) {
    totalEquity = Math.max(totalEquity, pickNumber(entry, ["totalEq", "adjEq", "eqUsd"], 0));
    const detailEntries = Array.isArray(entry.details) ? entry.details : [entry];
    for (const detail of detailEntries) {
      const ccy = pickString(detail, ["ccy", "currency"], "");
      if (!ccy) {
        continue;
      }
      rows.push({
        ccy,
        equity: pickNumber(detail, ["eq", "equity", "bal"], 0),
        available: pickNumber(detail, ["availEq", "available", "availBal"], 0),
        frozen: pickNumber(detail, ["frozenBal", "ordFrozen"], 0),
        usdValue: pickNumber(detail, ["eqUsd", "usdVal", "notionalUsd"], 0)
      });
    }
  }

  const availableEquity = rows.reduce((sum, item) => sum + item.available, 0);

  return {
    rows: rows
      .filter((item) => item.equity !== 0 || item.available !== 0 || item.frozen !== 0)
      .slice(0, 12),
    summary: {
      totalEquity,
      availableEquity
    }
  };
}

function normalizePositions(payload) {
  return unwrapOkxData(payload)
    .map((entry) => ({
      instId: pickString(entry, ["instId"], ""),
      side: pickString(entry, ["posSide", "side"], ""),
      size: pickNumber(entry, ["pos", "sz"], 0),
      avgPx: pickNumber(entry, ["avgPx"], 0),
      upl: pickNumber(entry, ["upl", "uplUsd"], 0),
      lever: pickNumber(entry, ["lever"], 0)
    }))
    .filter((item) => item.instId);
}

function normalizePositionHistory(payload) {
  return unwrapOkxData(payload)
    .map((entry) => ({
      instId: pickString(entry, ["instId"], ""),
      realizedPnl: pickNumber(entry, ["realizedPnl", "pnl"], 0),
      closeAvgPx: pickNumber(entry, ["closeAvgPx"], 0),
      openAvgPx: pickNumber(entry, ["openAvgPx"], 0),
      updatedAt: prettyDate(pickString(entry, ["uTime", "ts"], ""))
    }))
    .filter((item) => item.instId)
    .slice(0, 12);
}

function normalizeBills(payload) {
  return unwrapOkxData(payload)
    .map((entry) => ({
      billId: pickString(entry, ["billId"], ""),
      instId: pickString(entry, ["instId"], ""),
      ccy: pickString(entry, ["ccy"], ""),
      type: pickString(entry, ["type", "subType"], ""),
      balanceChange: pickNumber(entry, ["balChg", "pnl"], 0),
      timestamp: prettyDate(pickString(entry, ["ts"], ""))
    }))
    .slice(0, 20);
}

function normalizeBots(payload, kind) {
  return unwrapOkxData(payload)
    .map((entry) => ({
      kind,
      algoId: pickString(entry, ["algoId"], ""),
      instId: pickString(entry, ["instId"], ""),
      state: pickString(entry, ["state"], ""),
      pnl: pickNumber(entry, ["pnl", "upl"], 0),
      pnlRatio: pickNumber(entry, ["pnlRatio"], 0)
    }))
    .filter((item) => item.algoId);
}

function normalizeEarn(payload) {
  return unwrapOkxData(payload)
    .map((entry) => ({
      ccy: pickString(entry, ["ccy"], ""),
      amount: pickNumber(entry, ["amt", "balance"], 0),
      rate: pickNumber(entry, ["rate", "apy"], 0)
    }))
    .filter((item) => item.ccy)
    .slice(0, 10);
}

export async function collectDashboardData(preflight, { profileMode = "demo" } = {}) {
  const selected = resolveSelectedProfile(preflight, profileMode);
  const marketResult = preflight.dependencies.okx.available
    ? await runOkxJson(["market", "ticker", "BTC-USDT"])
    : { ok: false, payload: null };

  const base = {
    selectedProfileMode: selected.mode,
    resolvedProfile: selected.resolvedProfile,
    market: normalizeTicker(marketResult.payload || []),
    balances: [],
    balanceSummary: {
      totalEquity: 0,
      availableEquity: 0
    },
    positions: [],
    positionHistory: [],
    bills: [],
    bots: [],
    earn: [],
    notices: [],
    refreshedAt: new Date().toISOString()
  };

  if (!selected.resolvedProfile) {
    base.notices.push("No authenticated OKX profile is ready yet.");
    return base;
  }

  const [
    balanceResult,
    positionsResult,
    historyResult,
    billsResult,
    spotGridResult,
    contractGridResult,
    dcaResult,
    earnResult
  ] = await Promise.all([
    runOkxJson(["--profile", selected.resolvedProfile, "account", "balance"]),
    runOkxJson(["--profile", selected.resolvedProfile, "account", "positions"]),
    runOkxJson(["--profile", selected.resolvedProfile, "account", "positions-history", "--limit", "10"]),
    runOkxJson(["--profile", selected.resolvedProfile, "account", "bills", "--limit", "20"]),
    runOkxJson([
      "--profile",
      selected.resolvedProfile,
      "bot",
      "grid",
      "orders",
      "--algoOrdType",
      "grid"
    ]),
    runOkxJson([
      "--profile",
      selected.resolvedProfile,
      "bot",
      "grid",
      "orders",
      "--algoOrdType",
      "contract_grid"
    ]),
    runOkxJson(["--profile", selected.resolvedProfile, "bot", "dca", "orders"]),
    selected.mode === "live" && preflight.modules.earn.live
      ? runOkxJson(["--profile", selected.resolvedProfile, "earn", "savings", "balance"])
      : Promise.resolve({ ok: false, payload: null })
  ]);

  const balances = normalizeBalances(balanceResult.payload || []);

  base.balances = balances.rows;
  base.balanceSummary = balances.summary;
  base.positions = normalizePositions(positionsResult.payload || []);
  base.positionHistory = normalizePositionHistory(historyResult.payload || []);
  base.bills = normalizeBills(billsResult.payload || []);
  base.bots = [
    ...normalizeBots(spotGridResult.payload || [], "spot-grid"),
    ...normalizeBots(contractGridResult.payload || [], "contract-grid"),
    ...normalizeBots(dcaResult.payload || [], "dca")
  ];
  base.earn = normalizeEarn(earnResult.payload || []);

  if (!balanceResult.ok) {
    base.notices.push(trimText(balanceResult.stderr || "Unable to read balance.", 160));
  }
  if (!positionsResult.ok) {
    base.notices.push(trimText(positionsResult.stderr || "Unable to read positions.", 160));
  }

  return base;
}
