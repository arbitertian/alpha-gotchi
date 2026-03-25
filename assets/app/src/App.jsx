import { startTransition, useEffect, useState } from "react";

const demoPrompts = [
  {
    id: "adopt-demo",
    title: "领养并启动 Demo 宠物",
    note: "最适合第一次现场演示",
    prompt:
      "Use $alpha-gotchi to adopt a pet, check my local OKX setup, prefer demo mode, launch the dashboard, and give me the localhost and LAN links."
  },
  {
    id: "explain-onboarding",
    title: "解释为什么还没孵化",
    note: "适合展示配置检测能力",
    prompt:
      "Use $alpha-gotchi to recheck my environment, explain why Alpha-Gotchi is still in onboarding mode, and tell me the exact next setup step."
  },
  {
    id: "show-capabilities",
    title: "总结当前可演示能力",
    note: "适合答辩时快速说明范围",
    prompt:
      "Use $alpha-gotchi to open the dashboard, inspect which of market, portfolio, trade, bot, and earn are available, and summarize what I can demonstrate right now."
  },
  {
    id: "narrate-stats",
    title: "让 OpenClaw 帮你讲解",
    note: "适合台上旁白",
    prompt:
      "Use $alpha-gotchi to launch the pet dashboard for a hackathon demo and tell the audience what the pet's HP, mood, energy, and discipline represent."
  }
];

function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(Number(value));
}

function StatBar({ label, value, tone }) {
  return (
    <div className="stat-row">
      <div className="stat-label-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-track">
        <div className={`stat-fill tone-${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PetSprite({ pet }) {
  return (
    <div className={`pet-sprite animation-${pet.animation} stage-${pet.evolutionStage}`}>
      <div className="pet-ear pet-ear-left" />
      <div className="pet-ear pet-ear-right" />
      <div className="pet-body">
        <span className="pet-eye pet-eye-left" />
        <span className="pet-eye pet-eye-right" />
        <span className="pet-mouth" />
        <span className="pet-stage-pill">{pet.evolutionStage}</span>
      </div>
      <div className="pet-shadow" />
    </div>
  );
}

function SectionCard({ title, eyebrow, children }) {
  return (
    <section className="section-card">
      <header className="section-header">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

function ActionModal({ action, formValues, setFormValues, prepared, onPrepare, onConfirm, onClose, busy }) {
  if (!action) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="section-eyebrow">{action.group}</p>
            <h3>{action.label}</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            关闭
          </button>
        </header>

        {!prepared ? (
          <>
            <p className="modal-description">{action.description}</p>
            <div className="field-grid">
              {action.fields.map((field) => (
                <label key={field.name} className="field">
                  <span>{field.label}</span>
                  {field.type === "select" ? (
                    <select
                      value={formValues[field.name] ?? field.defaultValue ?? ""}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.name]: event.target.value
                        }))
                      }
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={formValues[field.name] ?? field.defaultValue ?? ""}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.name]: event.target.value
                        }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={onClose} type="button">
                取消
              </button>
              <button className="primary-button" onClick={onPrepare} type="button" disabled={busy}>
                {busy ? "准备中..." : "生成执行预览"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="summary-box">
              <p>{prepared.summary}</p>
              <code>{prepared.commandPreview}</code>
              <ul>
                {prepared.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={onClose} type="button">
                返回
              </button>
              <button className="danger-button" onClick={onConfirm} type="button" disabled={busy}>
                {busy ? "执行中..." : "确认执行"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedProfileMode, setSelectedProfileMode] = useState("demo");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [prepared, setPrepared] = useState(null);

  const toggleDemoMode = async (enabled) => {
    setBusy(true);
    try {
      const response = await fetch("/api/demo-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          enabled,
          profileMode: selectedProfileMode
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to toggle demo mode.");
      }
      setDashboard(payload);
      setSelectedProfileMode(payload.selectedProfileMode || (enabled ? "demo" : selectedProfileMode));
      setFlash(enabled ? "演示模式已开启，宠物现在会使用本地模拟数据。" : "演示模式已关闭。");
      setError("");
    } catch (err) {
      setError(err.message || "Unable to toggle demo mode.");
    } finally {
      setBusy(false);
    }
  };

  const recheckEnvironment = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/onboarding/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileMode: selectedProfileMode })
      });
      const payload = await response.json();
      setDashboard(payload);
      setSelectedProfileMode(payload.selectedProfileMode || selectedProfileMode);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to recheck environment.");
    } finally {
      setBusy(false);
    }
  };

  async function load(mode = selectedProfileMode) {
    const response = await fetch(`/api/dashboard?profile=${mode}`);
    const payload = await response.json();
    startTransition(() => {
      setDashboard(payload);
      setSelectedProfileMode(payload.selectedProfileMode || mode);
      setError("");
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err.message || "Unable to load dashboard."));
  }, []);

  useEffect(() => {
    if (!flash) {
      return undefined;
    }
    const timer = window.setTimeout(() => setFlash(""), 2200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    const stream = new EventSource("/api/stream");
    const reload = () => {
      load(selectedProfileMode).catch(() => {});
    };

    stream.addEventListener("snapshot", reload);
    stream.addEventListener("event", reload);
    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.close();
    };
  }, [selectedProfileMode]);

  if (!dashboard) {
    return <div className="page-shell">正在唤醒 Alpha-Gotchi...</div>;
  }

  const openAction = (action) => {
    const defaults = Object.fromEntries(
      (action.fields || []).map((field) => [field.name, field.defaultValue ?? ""])
    );
    setPrepared(null);
    setFormValues(defaults);
    setActiveAction(action);
  };

  const copyPrompt = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setFlash("提示词已复制到剪贴板。");
    } catch (err) {
      setError(err.message || "无法复制提示词。");
    }
  };

  const closeModal = () => {
    setPrepared(null);
    setActiveAction(null);
    setFormValues({});
  };

  const prepareCurrentAction = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/actions/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actionId: activeAction.id,
          profileMode: selectedProfileMode,
          params: formValues
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to prepare action.");
      }
      setPrepared(payload);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to prepare action.");
    } finally {
      setBusy(false);
    }
  };

  const confirmCurrentAction = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/actions/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: prepared.token
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.result?.stderr || "Action failed.");
      }
      setDashboard(payload.dashboard);
      setSelectedProfileMode(payload.dashboard?.selectedProfileMode || selectedProfileMode);
      setError("");
      closeModal();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const checklist = dashboard.onboarding?.checklist || [];
  const pet = dashboard.pet;
  const demoModeEnabled = !!dashboard.demoMode?.enabled;
  const profileOptions = [
    {
      label: demoModeEnabled ? "Demo Showcase" : "Demo",
      value: "demo",
      usable: dashboard.preflight?.profiles?.demo?.usable
    },
    { label: "Live", value: "live", usable: dashboard.preflight?.profiles?.live?.usable }
  ];

  return (
    <div className="page-shell">
      <div className="scanlines" />
      <header className="hero">
        <div>
          <p className="hero-kicker">OpenClaw Workspace Skill</p>
          <h1>Alpha-Gotchi</h1>
          <p className="hero-copy">
            面向 OpenClaw 的赛博交易宠物。它会根据余额、盈亏、机器人状态和风控动作实时变化。
          </p>
        </div>

        <div className="hero-actions">
          <div className="link-stack">
            <a href={dashboard.links.localhost} target="_blank" rel="noreferrer">
              localhost
            </a>
            {dashboard.links.lan.map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer">
                {link}
              </a>
            ))}
          </div>
          <div className="profile-switcher">
            <label>
              Profile
              <select
                value={selectedProfileMode}
                onChange={(event) => {
                  const nextMode = event.target.value;
                  setSelectedProfileMode(nextMode);
                  load(nextMode).catch((err) => setError(err.message || "Unable to switch profile."));
                }}
              >
                {profileOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.usable ? "" : " (blocked)"}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" onClick={() => load(selectedProfileMode)} type="button">
              刷新
            </button>
            <div className="button-stack">
              {demoModeEnabled ? (
                <button className="ghost-button" onClick={() => toggleDemoMode(false)} type="button" disabled={busy}>
                  退出演示模式
                </button>
              ) : (
                <button className="ghost-button" onClick={() => toggleDemoMode(true)} type="button" disabled={busy}>
                  进入演示模式
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {flash ? <div className="info-banner">{flash}</div> : null}
      {demoModeEnabled ? (
        <div className="info-banner">
          当前是演示模式。所有交易、机器人和风控动作都只会修改本地模拟状态，不会向 OKX 发送真实写请求。
        </div>
      ) : null}

      <SectionCard title="OpenClaw 领养提示词" eyebrow="Demo Ready">
        <div className="prompt-grid">
          {demoPrompts.map((item) => (
            <article key={item.id} className="prompt-card">
              <div className="prompt-head">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                </div>
                <button className="ghost-button" onClick={() => copyPrompt(item.prompt)} type="button">
                  复制提示词
                </button>
              </div>
              <code>{item.prompt}</code>
            </article>
          ))}
        </div>
      </SectionCard>

      {dashboard.onboarding?.required ? (
        <SectionCard title="领养检查清单" eyebrow="Onboarding">
          <div className="checklist-grid">
            {checklist.map((item) => (
              <div key={item.key} className={`check-card ${item.ok ? "ok" : "blocked"}`}>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="section-actions">
            <button
              className="primary-button"
              onClick={recheckEnvironment}
              type="button"
              disabled={busy}
            >
              {busy ? "Checking..." : "重新检测"}
            </button>
            <button className="ghost-button" onClick={() => toggleDemoMode(true)} type="button" disabled={busy}>
              直接进入演示模式
            </button>
          </div>
        </SectionCard>
      ) : null}

      <main className="grid-layout">
        <SectionCard title={pet.name} eyebrow="Pet Status">
          <div className="pet-panel">
            <PetSprite pet={pet} />
            <div className="pet-copy">
              <p className="pet-summary">{pet.summary}</p>
              <p className="pet-meta">
                阶段: <strong>{pet.evolutionStage}</strong> | 动画: <strong>{pet.animation}</strong>
              </p>
            </div>
          </div>
          <div className="stat-grid">
            <StatBar label="HP" value={pet.hp} tone="hp" />
            <StatBar label="Mood" value={pet.mood} tone="mood" />
            <StatBar label="Energy" value={pet.energy} tone="energy" />
            <StatBar label="Discipline" value={pet.discipline} tone="discipline" />
          </div>
        </SectionCard>

        <SectionCard title="账户总览" eyebrow={dashboard.selectedProfileMode.toUpperCase()}>
          <div className="summary-grid">
            <div className="summary-tile">
              <span>总权益</span>
              <strong>{formatNumber(dashboard.dashboard.balanceSummary.totalEquity)}</strong>
            </div>
            <div className="summary-tile">
              <span>可用余额</span>
              <strong>{formatNumber(dashboard.dashboard.balanceSummary.availableEquity)}</strong>
            </div>
            <div className="summary-tile">
              <span>观察市场</span>
              <strong>{dashboard.dashboard.market.instId || "BTC-USDT"}</strong>
            </div>
            <div className="summary-tile">
              <span>最新价格</span>
              <strong>{formatNumber(dashboard.dashboard.market.last)}</strong>
            </div>
          </div>

          {dashboard.dashboard.notices?.length ? (
            <div className="notice-stack">
              {dashboard.dashboard.notices.map((notice) => (
                <div key={notice} className="notice-pill">
                  {notice}
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="余额" eyebrow="Portfolio">
          <div className="list-table">
            {dashboard.dashboard.balances.length ? (
              dashboard.dashboard.balances.map((item) => (
                <div key={item.ccy} className="table-row">
                  <span>{item.ccy}</span>
                  <span>{formatNumber(item.equity)}</span>
                  <span>{formatNumber(item.available)}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">还没有可展示的余额数据。</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="持仓" eyebrow="Risk">
          <div className="list-table">
            {dashboard.dashboard.positions.length ? (
              dashboard.dashboard.positions.map((item) => (
                <div key={`${item.instId}-${item.side}`} className="table-row">
                  <span>{item.instId}</span>
                  <span>{item.side}</span>
                  <span>{formatNumber(item.upl)}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">当前没有打开中的仓位。</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="机器人" eyebrow="Patrol">
          <div className="list-table">
            {dashboard.dashboard.bots.length ? (
              dashboard.dashboard.bots.map((item) => (
                <div key={`${item.kind}-${item.algoId}`} className="table-row">
                  <span>{item.kind}</span>
                  <span>{item.instId}</span>
                  <span>{item.state || "unknown"}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">当前没有运行中的机器人。</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="事件日志" eyebrow="Timeline">
          <div className="event-list">
            {dashboard.events.length ? (
              dashboard.events.map((event) => (
                <article key={event.id} className="event-item">
                  <strong>{event.type}</strong>
                  <p>{event.summary || event.detail || "暂无更多说明。"}</p>
                  <span>{new Date(event.timestamp).toLocaleString()}</span>
                </article>
              ))
            ) : (
              <p className="empty-state">还没有事件记录。</p>
            )}
          </div>
        </SectionCard>
      </main>

      <SectionCard title="操作面板" eyebrow="Operator Controls">
        <div className="action-group-grid">
          {dashboard.actionGroups.map((group) => (
            <div key={group.id} className="action-group">
              <h3>{group.label}</h3>
              <div className="action-list">
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    className={`action-card ${action.enabled ? "" : "disabled"}`}
                    onClick={() => action.enabled && openAction(action)}
                    type="button"
                    disabled={!action.enabled}
                  >
                    <strong>{action.label}</strong>
                    <span>{action.description}</span>
                    {!action.enabled && action.disabledReason ? <em>{action.disabledReason}</em> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <ActionModal
        action={activeAction}
        formValues={formValues}
        setFormValues={setFormValues}
        prepared={prepared}
        onPrepare={prepareCurrentAction}
        onConfirm={confirmCurrentAction}
        onClose={closeModal}
        busy={busy}
      />
    </div>
  );
}
