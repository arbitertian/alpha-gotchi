# OKX Capability Distillation

This file is the compact authoring reference for `alpha-gotchi`. It summarizes the behavior the pet app must respect when it shells out to the OKX CLI.

## Module Map

### `market`

- Public, read-only, no API credentials required
- Safe for onboarding and fallback mode
- Use for ticker, candles, order book, funding rate, and market context

### `portfolio`

- Authenticated
- Requires an explicit resolved profile on every command
- Read balance, positions, positions history, bills, fees, config, and transfer limits
- Do not auto-transfer funds

### `trade`

- Authenticated
- Requires an explicit resolved profile on every command
- All write actions must display profile, instrument, amount, and risk warnings
- Spot uses quantity or quote mode
- Swap/futures/options use contract sizing rules
- Do not place live writes without explicit confirmation

### `bot`

- Authenticated
- Requires an explicit resolved profile on every command
- Grid and DCA bots are native OKX bots running server-side
- Safe to monitor from the pet app after the app process exits
- Grid stop requires the correct `algoId` and `algoOrdType`

### `earn`

- Authenticated
- Live-only
- Never block pet adoption or onboarding
- Keep it gated and optional in demo mode

## Profile Rules

- Treat `demo` and `live` as product modes
- Support local aliases when verifying profiles:
  - demo candidates: `demo`, `okx-demo`
  - live candidates: `live`, `okx-prod`
- Always send an explicit resolved profile for authenticated commands
- Surface the exact resolved profile name in warnings and logs

## Onboarding Rules

Check these in order:

1. `node`
2. `npm`
3. `okx`
4. `okx config show`
5. demo profile usability
6. live profile usability
7. optional Earn usability

Even if checks fail, the app should still launch in onboarding mode so the user gets a working link.

## Safety Rules

- Never ask for API keys in chat
- Never render secrets in browser UI
- Never auto-transfer funds
- Never auto-enable live trading after adoption
- Always require an explicit confirm step for writes
- Keep a local event log of write attempts and results

## Suggested Pet Mapping

- `hp`: equity health minus drawdown stress
- `mood`: recent realized + unrealized performance
- `energy`: available balance and recent activity freshness
- `discipline`: leverage, concentration, and TP/SL hygiene
- `evolutionStage`: onboarding, baby, active, evolved, elite

Reward healthy behavior rather than raw trading frequency.
