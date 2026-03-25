---
name: alpha-gotchi
description: "Adopt and operate a local Alpha-Gotchi dashboard for OpenClaw users. Use this skill when the user wants a pet dashboard, asks to adopt a pet, launch a local OKX dashboard, check OKX API setup, open the pet page, or says phrases such as \u9886\u517b\u5ba0\u7269, \u542f\u52a8\u5ba0\u7269\u9762\u677f, \u67e5\u770b\u5ba0\u7269\u72b6\u6001, \u68c0\u67e5 OKX API \u914d\u7f6e, or \u8ba9\u5ba0\u7269\u8ddf\u7740\u8d26\u6237\u53d8\u5316. This skill is designed for the OpenClaw workspace skill environment, bootstraps a LAN-accessible local web app, checks Node/npm/okx CLI readiness, verifies OKX demo/live profiles, launches the pet dashboard, and maps pet actions to OKX market, portfolio, trade, bot, and optional earn capabilities without exposing API secrets in chat."
---

# Alpha-Gotchi

Launch a local OKX companion app that turns account health into a pixel-retro pet. This skill is intended to live under the OpenClaw workspace skills directory, usually `<workspace>/skills/alpha-gotchi`.

## Quick Start

When the user wants to adopt or open the pet dashboard:

1. Run `scripts\start.ps1`
2. Share the `localhost` and LAN links returned by the script
3. Tell the user the app will guide them through missing OKX setup if `okx` or credentials are not ready
4. If the user only wants a hackathon showcase, tell them to use the in-app `进入演示模式` button to unlock synthetic balances, positions, bots, and safe local action playback

Use these scripts as needed:

- `scripts\bootstrap.ps1`: sync the bundled app into `~/.openclaw\alpha-gotchi\app`, install dependencies, and build the frontend
- `scripts\start.ps1`: bootstrap if needed, start the server in the background, and print the pet links
- `scripts\status.ps1`: show process status, runtime path, and links
- `scripts\stop.ps1`: stop the running local pet server

## Workflow

### 1. Adopt the pet

Run:

```powershell
powershell -ExecutionPolicy Bypass -File {baseDir}\scripts\start.ps1
```

The app starts even when OKX is not ready yet. In that case it opens in onboarding mode and shows:

- Node / npm readiness
- `okx` CLI readiness
- `okx config show` status
- demo/live profile detection
- optional Earn availability

### OpenClaw adoption prompts

Use these prompts directly in OpenClaw when demoing the skill:

```text
Use $alpha-gotchi to adopt a pet, check my local OKX setup, prefer demo mode, launch the dashboard, and give me the localhost and LAN links.
```

```text
Use $alpha-gotchi to recheck my OKX environment, explain why Alpha-Gotchi is still in onboarding mode, and tell me what I need to configure next.
```

```text
Use $alpha-gotchi to open Alpha-Gotchi, switch to live mode if available, and summarize whether trade, bot, and earn features are unlocked.
```

```text
Use $alpha-gotchi to launch the pet dashboard for a hackathon demo and tell the audience what the pet's HP, mood, energy, and discipline represent.
```

### 2. Recheck after setup

If the user configures OKX after the app starts, tell them to either:

- click the in-app recheck button, or
- rerun `scripts\status.ps1` to confirm the server is still healthy

Never ask users to paste API keys or secrets into chat. Keep all credentials in the local OKX config file.

### 3. Operate the pet safely

The UI supports these action groups:

- refresh status: reload balances, positions, recent history, and bots
- trade: spot and swap market orders
- patrol bots: create or stop spot grid and DCA bots
- risk care: close positions, add trailing stops, and cancel orders
- sleep and earn: live-only Simple Earn actions

Every write action must go through the app's prepare/confirm flow. The app always shows the chosen profile and warns on live-mode writes.

## Demo Copy

Read [references/demo-copy.md](references/demo-copy.md) when you need:

- adoption reply text for OpenClaw
- onboarding blocked-state explanations
- short live-mode risk wording
- a concise 3-minute hackathon demo flow

## Runtime Model

- Frontend: bundled Vite + React app
- Backend: local Node server with JSON APIs and SSE updates
- Runtime home: `~/.openclaw/alpha-gotchi`
- Default host/port: `0.0.0.0:43115`
- Access links: `http://localhost:43115` and `http://<lan-ip>:43115`

The server shells out to the local `okx` CLI and keeps a local JSON/JSONL cache for pet state, snapshots, and event history. No secrets are stored in the browser UI.

## Capability Rules

Read [references/okx-capabilities.md](references/okx-capabilities.md) before changing the action mappings or onboarding logic.

Important defaults:

- `market` works without credentials
- `portfolio`, `trade`, and `bot` require an explicit resolved profile
- `earn` is live-only and must never block adoption
- never auto-transfer funds
- never enable silent live writes

## Files To Reuse

- App template: `assets/app`
- Runtime scripts: `scripts/*.ps1`
- Capability reference: `references/okx-capabilities.md`

Use the bundled app and scripts instead of cloning external repos at runtime.
