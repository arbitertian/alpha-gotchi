# Alpha-Gotchi Demo Copy

Use this file for OpenClaw-facing prompts and short operator copy during demos.

## Best Demo Prompts

### Cold start adoption

```text
Use $alpha-gotchi to adopt a pet, check whether node, npm, okx CLI, and OKX profiles are ready, launch the local dashboard in demo-first mode, and give me the pet status link.
```

### Explain onboarding blockers

```text
Use $alpha-gotchi to recheck my environment, explain why the pet is still waiting to hatch, and tell me the exact next setup step.
```

### Show unlocked capabilities

```text
Use $alpha-gotchi to open the dashboard, inspect which of market, portfolio, trade, bot, and earn are available, and summarize what I can demonstrate right now.
```

### Hackathon narration

```text
Use $alpha-gotchi to launch the pet dashboard and narrate what each pet stat means in trading terms for a live demo audience.
```

## Reply Templates

### Adoption success

```text
Alpha-Gotchi is awake. I checked the local environment, launched the dashboard, and the pet page is ready.

Open here:
- Local: {localhost}
- LAN: {lan}

Current mode: {mode}
Unlocked: {features}

If the pet is still in onboarding mode, open the page and click the recheck button after finishing the missing OKX setup.
```

### Onboarding blocked

```text
Alpha-Gotchi has started in onboarding mode. The dashboard link is already live, but the pet is waiting for one or more setup items:
- {missing_items}

Next step:
- {next_step}

After that, click the recheck button in the page or ask me to run Alpha-Gotchi again.
```

### Demo mode ready

```text
Alpha-Gotchi is using demo mode, so this is safe for a live demo. You can show market data, balances, positions, trade actions, and bot actions without touching real funds.
```

### Live mode warning

```text
Alpha-Gotchi detected a live OKX profile. The dashboard can unlock real trading actions, so every write action still requires explicit confirmation and will show a live-risk warning before execution.
```

## Three-Minute Demo Flow

1. Say the cold start adoption prompt in OpenClaw.
2. Open the returned dashboard link and show the pet hatching or onboarding checklist.
3. Explain the four stats:
   - HP = account health and drawdown pressure
   - Mood = recent performance
   - Energy = available balance and activity freshness
   - Discipline = leverage and risk hygiene
4. Show the action deck and point out that write actions use a prepare/confirm flow.
5. If demo profile is ready, prepare one harmless demo action and stop before final confirm, or confirm a safe demo-only action if desired.
6. Close by showing that the pet is a more intuitive account-health layer over OKX capabilities, not just a static dashboard.
