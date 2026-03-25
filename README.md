# Alpha-Gotchi

Alpha-Gotchi is an OpenClaw skill that turns an OKX account into a living crypto pet dashboard.

It packages a local React frontend, a Node backend, onboarding scripts, and a safe demo mode so users can say "领养宠物" and open a LAN-accessible pet page that reflects account state, trading activity, bot status, and risk posture.

## Important Prerequisite

Alpha-Gotchi is meant to sit on top of the five base OKX CEX skills.

Users must pre-install these five skills by themselves before using Alpha-Gotchi in a real OpenClaw workspace:

- `okx-cex-market`
- `okx-cex-portfolio`
- `okx-cex-trade`
- `okx-cex-bot`
- `okx-cex-earn`

This repository does **not** auto-install those five skills for the user.

Alpha-Gotchi bundles its own UI and local runtime, but the intended OpenClaw setup still assumes the workspace already has the five OKX capability skills available and maintained by the user.

## What It Does

- Adopts a pixel-retro "crypto pet" that maps account state into HP, Mood, Energy, and Discipline.
- Checks local readiness for `node`, `npm`, `okx` CLI, and OKX profile setup.
- Launches a local dashboard with both `localhost` and LAN links.
- Reads market, portfolio, trade, bot, and optional earn-related account context.
- Supports a safe showcase demo mode with synthetic balances, positions, bots, and action playback.
- Uses prepare/confirm flows for write actions so real live actions are never silent.

## Target Environment

- OpenClaw workspace skill environment
- Windows-first PowerShell scripts
- Local OKX CLI based runtime

Expected placement:

```text
<workspace>/skills/alpha-gotchi
```

## Runtime Architecture

- Frontend: Vite + React
- Backend: Node.js + Express + SSE
- Runtime home: `~/.openclaw/alpha-gotchi`
- Default port: `43115`

The server keeps local JSON and JSONL state for snapshots, events, and demo data. API keys are not stored in the browser UI.

## Install

### 1. Pre-install the five base OKX skills

Before using Alpha-Gotchi, make sure your OpenClaw workspace already contains:

- `okx-cex-market`
- `okx-cex-portfolio`
- `okx-cex-trade`
- `okx-cex-bot`
- `okx-cex-earn`

Again: Alpha-Gotchi does not install them on your behalf.

### 2. Add Alpha-Gotchi to your OpenClaw workspace

Clone or copy this repository into:

```powershell
<workspace>\skills\alpha-gotchi
```

### 3. Start the local pet runtime

From the skill directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Useful scripts:

- `scripts\bootstrap.ps1`
- `scripts\start.ps1`
- `scripts\status.ps1`
- `scripts\stop.ps1`

## OpenClaw Demo Prompts

```text
Use $alpha-gotchi to adopt a pet, check my local OKX setup, prefer demo mode, launch the dashboard, and give me the localhost and LAN links.
```

```text
Use $alpha-gotchi to recheck my OKX environment, explain why Alpha-Gotchi is still in onboarding mode, and tell me what I need to configure next.
```

```text
Use $alpha-gotchi to launch the pet dashboard for a hackathon demo and tell the audience what the pet's HP, mood, energy, and discipline represent.
```

## Demo Mode

If the user has not finished OKX setup yet, Alpha-Gotchi can still be shown in safe showcase mode.

Demo mode provides:

- synthetic balances
- synthetic positions
- synthetic running bots
- synthetic timeline events
- local action simulation without touching OKX funds

This is useful for hackathons, recordings, and live demos.

## Real Mode Notes

When real OKX setup is present:

- `market` can work without credentials
- `portfolio`, `trade`, and `bot` require a resolved profile
- `earn` is live-only
- every write action still goes through a prepare/confirm step

## Repository Layout

```text
alpha-gotchi/
├── SKILL.md
├── README.md
├── agents/
├── assets/
│   ├── app/
│   ├── pet-large.svg
│   └── pet-small.svg
├── references/
└── scripts/
```

## Security Notes

- Never paste API keys into chat.
- Keep OKX credentials in the local OKX config only.
- Alpha-Gotchi does not auto-transfer funds.
- Alpha-Gotchi does not auto-enable silent live writes.

## References

- Skill definition: [SKILL.md](./SKILL.md)
- Demo copy: [references/demo-copy.md](./references/demo-copy.md)
- Capability notes: [references/okx-capabilities.md](./references/okx-capabilities.md)
