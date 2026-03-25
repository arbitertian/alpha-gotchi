# Alpha-Gotchi

中文：Alpha-Gotchi 是一个面向 OpenClaw 的赛博交易宠物技能。它会把 OKX 账户状态映射成一只可视化宠物，用本地网页展示账户健康度、盈亏、仓位、机器人状态和风控动作。

English: Alpha-Gotchi is an OpenClaw skill that turns an OKX account into a visual crypto pet. It uses a local web dashboard to show account health, PnL, positions, bot status, and risk-control actions.

## 重要前提 | Important Prerequisite

中文：Alpha-Gotchi 不是独立替代底层 OKX 能力的技能，它是构建在以下 5 个基础技能之上的可视化和交互层。用户在真实 OpenClaw 工作区里使用 Alpha-Gotchi 之前，需要先自行预装这 5 个底层技能。

English: Alpha-Gotchi is not a replacement for the underlying OKX capability skills. It is a visualization and interaction layer built on top of them. Before using Alpha-Gotchi in a real OpenClaw workspace, users must pre-install these five base skills themselves.

必须预装 / Required pre-installed skills:

- `okx-cex-market`
- `okx-cex-portfolio`
- `okx-cex-trade`
- `okx-cex-bot`
- `okx-cex-earn`

中文：本仓库不会自动替用户安装这 5 个技能。

English: This repository does **not** auto-install those five skills for the user.

## 它能做什么 | What It Does

- 中文：把账户状态映射为宠物的 `HP / Mood / Energy / Discipline`。
  English: Maps account state into `HP / Mood / Energy / Discipline`.
- 中文：检查本地 `node`、`npm`、`okx` CLI 和 OKX profile 是否就绪。
  English: Checks local `node`, `npm`, `okx` CLI, and OKX profile readiness.
- 中文：启动一个本地 Web 面板，并返回 `localhost` 和局域网访问链接。
  English: Launches a local web dashboard and returns both `localhost` and LAN links.
- 中文：支持市场、账户、交易、机器人和可选 Earn 能力的展示与操作。
  English: Supports market, account, trade, bot, and optional earn-related display and actions.
- 中文：支持安全的演示模式，不连接真实 OKX 账户也能展示完整宠物状态变化。
  English: Includes a safe showcase demo mode so the full pet flow can be shown without a real OKX account.
- 中文：所有写操作都走 prepare / confirm 双阶段确认。
  English: All write actions go through a prepare / confirm flow.

## OpenClaw 部署方式 | OpenClaw Deployment

### 1. 先预装 5 个底层 OKX 技能 | Pre-install the 5 base OKX skills

中文：先确保你的 OpenClaw 工作区已经安装好了前面列出的 5 个底层技能。

English: First make sure your OpenClaw workspace already has the five base OKX skills listed above.

### 2. 把仓库放到 OpenClaw 工作区 | Place the repo into the OpenClaw workspace

中文：把这个仓库放到你的 OpenClaw 工作区 `skills` 目录下，并保持目录名为 `alpha-gotchi`。

English: Put this repository inside your OpenClaw workspace `skills` directory and keep the folder name as `alpha-gotchi`.

示例目录 / Example path:

```text
<workspace>/skills/alpha-gotchi
```

### 3. 启动技能本地运行时 | Start the local runtime

中文：在技能目录里执行下面的命令。`start.ps1` 会在需要时自动做 bootstrap、安装依赖并启动本地服务。

English: Run the command below inside the skill directory. `start.ps1` will bootstrap the app, install dependencies when needed, and start the local service.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

常用脚本 / Useful scripts:

- `scripts\bootstrap.ps1`
- `scripts\start.ps1`
- `scripts\status.ps1`
- `scripts\stop.ps1`

### 4. 打开宠物页面 | Open the pet dashboard

中文：启动成功后，脚本会返回本机和局域网访问地址，默认端口是 `43115`。

English: After startup, the script returns both localhost and LAN access links. The default port is `43115`.

默认访问地址 / Default links:

- `http://localhost:43115`
- `http://<lan-ip>:43115`

### 5. 如果还没配好 OKX 怎么办 | What if OKX is not ready yet

中文：如果用户还没有配好 `okx` CLI 或 OKX 账户配置，Alpha-Gotchi 仍然可以启动，但会先进入 onboarding 状态，显示检查清单。

English: If the user has not configured `okx` CLI or OKX account access yet, Alpha-Gotchi still starts, but it will begin in onboarding mode and show a checklist.

中文：这时用户可以：

- 在页面里点击 `重新检测`
- 或直接点击 `进入演示模式`

English: At that point the user can:

- click `重新检测` in the page
- or click `进入演示模式`

## OpenClaw 使用提示词 | OpenClaw Prompt Examples

```text
Use $alpha-gotchi to adopt a pet, check my local OKX setup, prefer demo mode, launch the dashboard, and give me the localhost and LAN links.
```

```text
Use $alpha-gotchi to recheck my OKX environment, explain why Alpha-Gotchi is still in onboarding mode, and tell me what I need to configure next.
```

```text
Use $alpha-gotchi to launch the pet dashboard for a hackathon demo and tell the audience what the pet's HP, mood, energy, and discipline represent.
```

## 演示模式 | Demo Mode

中文：演示模式用于路演、比赛、录屏和本地展示。开启后，宠物会使用本地模拟数据，不会向真实 OKX 发送写请求。

English: Demo mode is for hackathons, recordings, and local showcases. When enabled, the pet uses local synthetic data and does not send real write requests to OKX.

演示模式提供 / Demo mode provides:

- 中文：模拟余额
  English: Synthetic balances
- 中文：模拟持仓
  English: Synthetic positions
- 中文：模拟网格/DCA 机器人
  English: Synthetic grid and DCA bots
- 中文：模拟时间线事件
  English: Synthetic timeline events
- 中文：本地动作回放
  English: Local action simulation

## 真实模式说明 | Real Mode Notes

中文：当本地 OKX 配置真实可用时，Alpha-Gotchi 会解锁真实账户读取和操作能力。

English: When local OKX configuration is available, Alpha-Gotchi unlocks real account reads and actions.

规则 / Rules:

- 中文：`market` 可在无凭证时工作。
  English: `market` can work without credentials.
- 中文：`portfolio`、`trade`、`bot` 需要可解析的 profile。
  English: `portfolio`, `trade`, and `bot` require a resolved profile.
- 中文：`earn` 仅在 live 模式下启用。
  English: `earn` is live-only.
- 中文：所有写操作仍然需要显式确认。
  English: All write actions still require explicit confirmation.

## 项目结构 | Repository Layout

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

## 安全说明 | Security Notes

- 中文：不要在聊天里粘贴 API Key。
  English: Do not paste API keys into chat.
- 中文：OKX 凭证应只保存在本地 OKX 配置中。
  English: Keep OKX credentials only in the local OKX configuration.
- 中文：不会自动划转资金。
  English: No automatic fund transfer is performed.
- 中文：不会静默执行真实 live 写操作。
  English: No silent live write actions are performed.

## 参考文件 | References

- [SKILL.md](./SKILL.md)
- [references/demo-copy.md](./references/demo-copy.md)
- [references/okx-capabilities.md](./references/okx-capabilities.md)
