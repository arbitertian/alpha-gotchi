import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildActionGroups, prepareAction } from "./lib/actions.js";
import {
  applyDemoMode,
  collectDemoDashboard,
  ensureDemoState,
  isSyntheticProfile,
  simulateDemoAction
} from "./lib/demo.js";
import { makeId, trimText } from "./lib/helpers.js";
import { getLanIps } from "./lib/network.js";
import { collectDashboardData, getPreflightStatus, runOkxJson } from "./lib/okx.js";
import { computePetState } from "./lib/pet.js";
import { appendJsonl, ensureRuntime, readJson, readJsonl, writeJson } from "./lib/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

const host = parseArg("host", process.env.PET_HOST || "0.0.0.0");
const port = Number(parseArg("port", process.env.PET_PORT || "43115"));
const runtimeHome = parseArg(
  "runtime-home",
  process.env.PET_RUNTIME_ROOT || path.join(os.homedir(), ".openclaw", "alpha-gotchi")
);

const runtime = await ensureRuntime(runtimeHome);
const pendingActions = new Map();
const sseClients = new Set();

let snapshot =
  (await readJson(runtime.stateFile, null)) || {
    updatedAt: null,
    preflight: null,
    dashboards: {},
    pets: {}
  };
let settings =
  (await readJson(runtime.settingsFile, null)) || {
    demoModeEnabled: false
  };

async function saveSettings(nextSettings) {
  settings = {
    ...settings,
    ...nextSettings
  };
  await writeJson(runtime.settingsFile, settings);
}

function getLinks() {
  return {
    localhost: `http://localhost:${port}`,
    lan: getLanIps().map((ip) => `http://${ip}:${port}`)
  };
}

async function appendEvent(type, payload = {}) {
  const event = {
    id: makeId("evt"),
    type,
    timestamp: new Date().toISOString(),
    ...payload
  };
  await appendJsonl(runtime.eventsFile, event);
  broadcast("event", event);
  return event;
}

function broadcast(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const response of sseClients) {
    response.write(message);
  }
}

function selectMode(preflight, requestedMode) {
  if (requestedMode && preflight?.profiles?.[requestedMode]?.usable) {
    return requestedMode;
  }
  if (preflight?.profiles?.demo?.usable) {
    return "demo";
  }
  if (preflight?.profiles?.live?.usable) {
    return "live";
  }
  return requestedMode || preflight?.primaryMode || "demo";
}

async function refreshSnapshot(reason = "manual") {
  const rawPreflight = await getPreflightStatus();
  const preflight = applyDemoMode(rawPreflight, settings.demoModeEnabled);
  const dashboards = {};
  const pets = {};

  if (settings.demoModeEnabled) {
    await ensureDemoState(runtime);
  }

  const modesToRefresh = ["demo", "live"].filter((mode) => preflight.profiles[mode]?.usable);
  const requestedModes = modesToRefresh.length ? modesToRefresh : [preflight.primaryMode || "demo"];

  for (const mode of requestedModes) {
    const dashboard =
      settings.demoModeEnabled && mode === "demo" && isSyntheticProfile(preflight.profiles.demo?.resolvedProfile)
        ? await collectDemoDashboard(runtime, { reason })
        : await collectDashboardData(preflight, { profileMode: mode });
    dashboards[mode] = dashboard;
    pets[mode] = computePetState({
      onboarding: preflight.onboarding,
      dashboard,
      selectedProfileMode: mode
    });
  }

  snapshot = {
    updatedAt: new Date().toISOString(),
    reason,
    preflight,
    dashboards,
    pets
  };

  await writeJson(runtime.stateFile, snapshot);
  broadcast("snapshot", {
    updatedAt: snapshot.updatedAt,
    preflight: snapshot.preflight,
    availableModes: Object.keys(snapshot.dashboards)
  });

  return snapshot;
}

function buildPayload(requestedMode, events) {
  const preflight = snapshot.preflight || {
    onboarding: {
      required: true,
      checklist: []
    },
    profiles: {
      demo: { usable: false },
      live: { usable: false }
    },
    modules: {},
    demoMode: { enabled: false }
  };

  const mode = selectMode(preflight, requestedMode);
  const dashboard =
    snapshot.dashboards[mode] ||
    snapshot.dashboards.demo ||
    snapshot.dashboards.live || {
      selectedProfileMode: mode,
      market: {},
      balances: [],
      balanceSummary: { totalEquity: 0, availableEquity: 0 },
      positions: [],
      positionHistory: [],
      bills: [],
      bots: [],
      earn: [],
      notices: []
    };
  const pet =
    snapshot.pets[mode] ||
    computePetState({
      onboarding: preflight.onboarding,
      dashboard,
      selectedProfileMode: mode
    });

  return {
    name: "Alpha-Gotchi",
    updatedAt: snapshot.updatedAt,
    selectedProfileMode: mode,
    links: getLinks(),
    onboarding: preflight.onboarding,
    preflight,
    demoMode: preflight.demoMode,
    capabilities: preflight.modules,
    dashboard,
    pet,
    actionGroups: buildActionGroups(preflight, mode),
    events
  };
}

function cleanupPendingActions() {
  const now = Date.now();
  for (const [token, entry] of pendingActions.entries()) {
    if (now - entry.createdAt > 10 * 60 * 1000) {
      pendingActions.delete(token);
    }
  }
}

await refreshSnapshot("startup");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_request, response) => {
  response.json({
    ok: true,
    name: "Alpha-Gotchi",
    updatedAt: snapshot.updatedAt,
    links: getLinks(),
    runtimeHome,
    demoMode: snapshot.preflight?.demoMode || { enabled: false }
  });
});

app.get("/api/onboarding", async (request, response) => {
  const events = await readJsonl(runtime.eventsFile, 20);
  response.json(buildPayload(request.query.profile, events));
});

app.post("/api/onboarding/recheck", async (request, response) => {
  const nextSnapshot = await refreshSnapshot("recheck");
  await appendEvent("recheck", {
    summary: "Rechecked local OKX and OpenClaw readiness."
  });
  const events = await readJsonl(runtime.eventsFile, 20);
  snapshot = nextSnapshot;
  response.json(buildPayload(request.body?.profileMode || request.query.profile, events));
});

app.post("/api/demo-mode", async (request, response) => {
  const enabled = !!request.body?.enabled;
  await saveSettings({ demoModeEnabled: enabled });

  if (enabled) {
    await ensureDemoState(runtime);
  }

  const nextSnapshot = await refreshSnapshot(enabled ? "demo-mode:enabled" : "demo-mode:disabled");
  await appendEvent("demo-mode", {
    summary: enabled
      ? "Showcase demo mode enabled. Alpha-Gotchi is now using local synthetic data."
      : "Showcase demo mode disabled. Alpha-Gotchi returned to real OKX detection.",
    enabled
  });
  const events = await readJsonl(runtime.eventsFile, 20);
  snapshot = nextSnapshot;
  response.json(buildPayload(enabled ? "demo" : request.body?.profileMode || request.query.profile, events));
});

app.get("/api/pet", async (request, response) => {
  const events = await readJsonl(runtime.eventsFile, 20);
  response.json(buildPayload(request.query.profile, events).pet);
});

app.get("/api/dashboard", async (request, response) => {
  const events = await readJsonl(runtime.eventsFile, 40);
  response.json(buildPayload(request.query.profile, events));
});

app.get("/api/events", async (_request, response) => {
  response.json(await readJsonl(runtime.eventsFile, 60));
});

app.get("/api/capabilities", async (request, response) => {
  const events = await readJsonl(runtime.eventsFile, 20);
  const payload = buildPayload(request.query.profile, events);
  response.json({
    selectedProfileMode: payload.selectedProfileMode,
    capabilities: payload.capabilities,
    profiles: payload.preflight.profiles,
    actionGroups: payload.actionGroups,
    links: payload.links
  });
});

app.post("/api/actions/prepare", async (request, response) => {
  try {
    cleanupPendingActions();
    const selectedProfileMode =
      request.body?.profileMode || snapshot.preflight?.primaryMode || "demo";
    const prepared = prepareAction({
      actionId: request.body?.actionId,
      selectedProfileMode,
      preflight: snapshot.preflight,
      params: request.body?.params || {}
    });

    const token = makeId("pending");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    pendingActions.set(token, {
      createdAt: Date.now(),
      prepared
    });

    response.json({
      token,
      expiresAt,
      actionId: prepared.id,
      label: prepared.label,
      summary: prepared.summary,
      warnings: prepared.warnings,
      commandPreview: prepared.commandPreview,
      readOnly: prepared.readOnly,
      selectedProfileMode: prepared.profileMode
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: trimText(error.message || "Unable to prepare action.", 200)
    });
  }
});

app.post("/api/actions/confirm", async (request, response) => {
  cleanupPendingActions();
  const token = request.body?.token;
  const pending = pendingActions.get(token);

  if (!pending) {
    response.status(404).json({
      ok: false,
      error: "Prepared action not found or expired."
    });
    return;
  }

  pendingActions.delete(token);

  const prepared = pending.prepared;

  try {
    let execution = {
      ok: true,
      stdout: "",
      stderr: "",
      payload: null
    };

    if (prepared.executor === "refresh") {
      await refreshSnapshot("manual-refresh");
      await appendEvent("refresh", {
        summary: prepared.summary,
        profileMode: prepared.profileMode
      });
    } else if (isSyntheticProfile(prepared.resolvedProfile)) {
      execution = await simulateDemoAction(runtime, prepared);
      await appendEvent("action", {
        actionId: prepared.id,
        label: prepared.label,
        summary: `${prepared.summary} (showcase demo)`,
        profileMode: prepared.profileMode,
        ok: execution.ok,
        detail: trimText(execution.stdout || "Simulated locally.", 200)
      });
      await refreshSnapshot(`action:${prepared.id}`);
    } else {
      execution = await runOkxJson(prepared.args);
      await appendEvent("action", {
        actionId: prepared.id,
        label: prepared.label,
        summary: prepared.summary,
        profileMode: prepared.profileMode,
        ok: execution.ok,
        detail: trimText(execution.stderr || execution.stdout, 200)
      });
      await refreshSnapshot(`action:${prepared.id}`);
    }

    const events = await readJsonl(runtime.eventsFile, 40);
    response.json({
      ok: execution.ok,
      result: {
        stdout: trimText(execution.stdout, 500),
        stderr: trimText(execution.stderr, 500),
        payload: execution.payload
      },
      dashboard: buildPayload(prepared.profileMode, events)
    });
  } catch (error) {
    await appendEvent("action-error", {
      actionId: prepared.id,
      label: prepared.label,
      summary: trimText(error.message || "Action failed.", 200)
    });
    response.status(500).json({
      ok: false,
      error: trimText(error.message || "Action failed.", 200)
    });
  }
});

app.get("/api/stream", async (_request, response) => {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  response.write(`event: ready\ndata: ${JSON.stringify({ ok: true, updatedAt: snapshot.updatedAt })}\n\n`);
  sseClients.add(response);
  _request.on("close", () => {
    sseClients.delete(response);
  });
});

const distDir = path.join(__dirname, "..", "dist");

app.use(express.static(distDir));

app.get("*", async (_request, response) => {
  try {
    const indexHtml = await fs.readFile(path.join(distDir, "index.html"), "utf8");
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.send(indexHtml);
  } catch {
    response
      .status(503)
      .type("html")
      .send(
        "<!doctype html><title>Alpha-Gotchi</title><body style='font-family:Consolas,monospace;padding:24px'>Build missing. Run npm install and npm run build inside the bundled app first.</body>"
      );
  }
});

setInterval(() => {
  cleanupPendingActions();
  refreshSnapshot("poll").catch(() => {});
}, 30_000);

app.listen(port, host, async () => {
  await appendEvent("server-start", {
    summary: "Alpha-Gotchi server started.",
    links: getLinks()
  });
  console.log(`Alpha-Gotchi listening on ${host}:${port}`);
});
