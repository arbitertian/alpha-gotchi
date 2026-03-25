import { trimText } from "./helpers.js";
import { SYNTHETIC_PROFILE } from "./demo.js";
import { resolveSelectedProfile } from "./okx.js";

const ACTION_DEFINITIONS = [
  {
    id: "refresh-dashboard",
    group: "刷新状态",
    label: "刷新状态",
    description: "重新拉取市场、余额、持仓和机器人状态",
    readOnly: true,
    profileRequirement: "optional",
    fields: []
  },
  {
    id: "spot-market-order",
    group: "交易",
    label: "现货市价单",
    description: "用所选 profile 下现货市价买卖单",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "交易对", type: "text", required: true, defaultValue: "BTC-USDT" },
      {
        name: "side",
        label: "方向",
        type: "select",
        required: true,
        defaultValue: "buy",
        options: [
          { label: "Buy", value: "buy" },
          { label: "Sell", value: "sell" }
        ]
      },
      { name: "sz", label: "数量", type: "text", required: true, defaultValue: "0.01" },
      {
        name: "tgtCcy",
        label: "数量模式",
        type: "select",
        required: true,
        defaultValue: "base_ccy",
        options: [
          { label: "Base", value: "base_ccy" },
          { label: "Quote", value: "quote_ccy" }
        ]
      }
    ]
  },
  {
    id: "swap-market-order",
    group: "交易",
    label: "合约市价单",
    description: "下单开多/开空 BTC 或其他 SWAP 合约",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "合约", type: "text", required: true, defaultValue: "BTC-USDT-SWAP" },
      {
        name: "side",
        label: "下单方向",
        type: "select",
        required: true,
        defaultValue: "buy",
        options: [
          { label: "Buy", value: "buy" },
          { label: "Sell", value: "sell" }
        ]
      },
      { name: "sz", label: "张数", type: "text", required: true, defaultValue: "1" },
      {
        name: "tdMode",
        label: "保证金模式",
        type: "select",
        required: true,
        defaultValue: "cross",
        options: [
          { label: "Cross", value: "cross" },
          { label: "Isolated", value: "isolated" }
        ]
      },
      {
        name: "posSide",
        label: "仓位方向",
        type: "select",
        required: true,
        defaultValue: "long",
        options: [
          { label: "Long", value: "long" },
          { label: "Short", value: "short" }
        ]
      }
    ]
  },
  {
    id: "grid-create-spot",
    group: "巡逻机器人",
    label: "创建现货网格",
    description: "创建一个 spot grid bot",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "交易对", type: "text", required: true, defaultValue: "BTC-USDT" },
      { name: "minPx", label: "下限价格", type: "text", required: true, defaultValue: "90000" },
      { name: "maxPx", label: "上限价格", type: "text", required: true, defaultValue: "110000" },
      { name: "gridNum", label: "网格数", type: "text", required: true, defaultValue: "10" },
      { name: "quoteSz", label: "投入 USDT", type: "text", required: true, defaultValue: "100" }
    ]
  },
  {
    id: "dca-create",
    group: "巡逻机器人",
    label: "创建 DCA Bot",
    description: "创建一个合约 DCA bot",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "合约", type: "text", required: true, defaultValue: "BTC-USDT-SWAP" },
      { name: "lever", label: "杠杆", type: "text", required: true, defaultValue: "3" },
      {
        name: "direction",
        label: "方向",
        type: "select",
        required: true,
        defaultValue: "long",
        options: [
          { label: "Long", value: "long" },
          { label: "Short", value: "short" }
        ]
      },
      { name: "initOrdAmt", label: "首单保证金", type: "text", required: true, defaultValue: "100" },
      { name: "safetyOrdAmt", label: "补仓保证金", type: "text", required: true, defaultValue: "50" },
      { name: "maxSafetyOrds", label: "最大补仓次数", type: "text", required: true, defaultValue: "3" },
      { name: "pxSteps", label: "补仓跌幅", type: "text", required: true, defaultValue: "0.03" },
      { name: "pxStepsMult", label: "跌幅倍数", type: "text", required: true, defaultValue: "1" },
      { name: "volMult", label: "金额倍数", type: "text", required: true, defaultValue: "1" },
      { name: "tpPct", label: "止盈比", type: "text", required: true, defaultValue: "0.03" }
    ]
  },
  {
    id: "grid-stop",
    group: "巡逻机器人",
    label: "停止网格",
    description: "停止一个现货或合约 grid bot",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "algoId", label: "Algo ID", type: "text", required: true },
      { name: "instId", label: "交易对", type: "text", required: true, defaultValue: "BTC-USDT" },
      {
        name: "algoOrdType",
        label: "Bot 类型",
        type: "select",
        required: true,
        defaultValue: "grid",
        options: [
          { label: "Spot Grid", value: "grid" },
          { label: "Contract Grid", value: "contract_grid" }
        ]
      },
      {
        name: "stopType",
        label: "停止方式",
        type: "select",
        required: true,
        defaultValue: "2",
        options: [
          { label: "Keep assets", value: "2" },
          { label: "Market close all", value: "1" }
        ]
      }
    ]
  },
  {
    id: "swap-close-position",
    group: "风险治疗",
    label: "平掉合约仓位",
    description: "按合约和平仓方向关闭仓位",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "合约", type: "text", required: true, defaultValue: "BTC-USDT-SWAP" },
      {
        name: "mgnMode",
        label: "保证金模式",
        type: "select",
        required: true,
        defaultValue: "cross",
        options: [
          { label: "Cross", value: "cross" },
          { label: "Isolated", value: "isolated" }
        ]
      },
      {
        name: "posSide",
        label: "仓位方向",
        type: "select",
        required: true,
        defaultValue: "long",
        options: [
          { label: "Long", value: "long" },
          { label: "Short", value: "short" }
        ]
      }
    ]
  },
  {
    id: "swap-trailing-stop",
    group: "风险治疗",
    label: "合约移动止损",
    description: "为合约仓位加一个 trailing stop",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "合约", type: "text", required: true, defaultValue: "BTC-USDT-SWAP" },
      { name: "sz", label: "张数", type: "text", required: true, defaultValue: "1" },
      {
        name: "tdMode",
        label: "保证金模式",
        type: "select",
        required: true,
        defaultValue: "cross",
        options: [
          { label: "Cross", value: "cross" },
          { label: "Isolated", value: "isolated" }
        ]
      },
      {
        name: "posSide",
        label: "仓位方向",
        type: "select",
        required: true,
        defaultValue: "long",
        options: [
          { label: "Long", value: "long" },
          { label: "Short", value: "short" }
        ]
      },
      { name: "callbackRatio", label: "回调比例", type: "text", required: true, defaultValue: "0.02" }
    ]
  },
  {
    id: "spot-trailing-stop",
    group: "风险治疗",
    label: "现货移动止损",
    description: "为现货持仓加一个 trailing stop",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "交易对", type: "text", required: true, defaultValue: "BTC-USDT" },
      { name: "sz", label: "数量", type: "text", required: true, defaultValue: "0.01" },
      { name: "callbackRatio", label: "回调比例", type: "text", required: true, defaultValue: "0.02" }
    ]
  },
  {
    id: "spot-cancel-order",
    group: "风险治疗",
    label: "撤销现货订单",
    description: "按交易对和 ordId 撤销 spot order",
    readOnly: false,
    profileRequirement: "auth",
    fields: [
      { name: "instId", label: "交易对", type: "text", required: true, defaultValue: "BTC-USDT" },
      { name: "ordId", label: "订单 ID", type: "text", required: true }
    ]
  },
  {
    id: "earn-savings-purchase",
    group: "睡眠赚币",
    label: "申购 Simple Earn",
    description: "将闲置资产申购到 Simple Earn",
    readOnly: false,
    profileRequirement: "live-only",
    fields: [
      { name: "ccy", label: "币种", type: "text", required: true, defaultValue: "USDT" },
      { name: "amt", label: "数量", type: "text", required: true, defaultValue: "10" }
    ]
  },
  {
    id: "earn-savings-redeem",
    group: "睡眠赚币",
    label: "赎回 Simple Earn",
    description: "从 Simple Earn 赎回资产",
    readOnly: false,
    profileRequirement: "live-only",
    fields: [
      { name: "ccy", label: "币种", type: "text", required: true, defaultValue: "USDT" },
      { name: "amt", label: "数量", type: "text", required: true, defaultValue: "10" }
    ]
  }
];

function findAction(id) {
  return ACTION_DEFINITIONS.find((action) => action.id === id);
}

function normalizeParams(fields, rawParams = {}) {
  const params = {};
  for (const field of fields) {
    const value =
      rawParams[field.name] == null || rawParams[field.name] === ""
        ? field.defaultValue ?? ""
        : rawParams[field.name];
    params[field.name] = `${value}`.trim();
    if (field.required && !params[field.name]) {
      throw new Error(`${field.label} is required.`);
    }
  }
  return params;
}

function getCommandProfile(action, selectedProfileMode, preflight) {
  if (action.profileRequirement === "optional") {
    return {
      profileMode: selectedProfileMode,
      resolvedProfile: null
    };
  }

  const desiredMode = action.profileRequirement === "live-only" ? "live" : selectedProfileMode;
  const selected = resolveSelectedProfile(preflight, desiredMode);

  if (!selected.resolvedProfile) {
    throw new Error(
      action.profileRequirement === "live-only"
        ? "Live profile is not ready."
        : `No authenticated profile is available for ${selectedProfileMode || "this action"}.`
    );
  }

  return selected;
}

function buildPrepared(action, selectedProfileMode, preflight, params) {
  const commandProfile = getCommandProfile(action, selectedProfileMode, preflight);
  const warnings = [];
  const resolved = commandProfile.resolvedProfile;
  const profileMode = commandProfile.profileMode || selectedProfileMode;

  if (resolved) {
    warnings.push(`Profile: ${profileMode} (${resolved})`);
  }
  if (resolved === SYNTHETIC_PROFILE) {
    warnings.push("Showcase demo warning: this action only mutates local simulated data.");
  }
  if (!action.readOnly && resolved !== SYNTHETIC_PROFILE) {
    warnings.push("This action will write to the exchange.");
  }
  if (profileMode === "live" && !action.readOnly && resolved !== SYNTHETIC_PROFILE) {
    warnings.push("Live mode warning: this may affect real funds.");
  }

  switch (action.id) {
    case "refresh-dashboard":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "refresh",
        commandPreview: "Refresh cached dashboard snapshot",
        summary: "Reload market data, balances, positions, history, and bot status.",
        warnings
      };
    case "spot-market-order":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "spot",
          "place",
          "--instId",
          params.instId,
          "--side",
          params.side,
          "--ordType",
          "market",
          "--sz",
          params.sz,
          "--tgtCcy",
          params.tgtCcy
        ],
        commandPreview: `okx --profile ${resolved} spot place --instId ${params.instId} --side ${params.side} --ordType market --sz ${params.sz} --tgtCcy ${params.tgtCcy}`,
        summary: `Place a spot market ${params.side} on ${params.instId} for size ${params.sz}.`,
        warnings
      };
    case "swap-market-order":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "swap",
          "place",
          "--instId",
          params.instId,
          "--side",
          params.side,
          "--ordType",
          "market",
          "--sz",
          params.sz,
          "--tdMode",
          params.tdMode,
          "--posSide",
          params.posSide
        ],
        commandPreview: `okx --profile ${resolved} swap place --instId ${params.instId} --side ${params.side} --ordType market --sz ${params.sz} --tdMode ${params.tdMode} --posSide ${params.posSide}`,
        summary: `Place a swap market ${params.side} on ${params.instId} with ${params.sz} contract(s).`,
        warnings
      };
    case "grid-create-spot":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "bot",
          "grid",
          "create",
          "--instId",
          params.instId,
          "--algoOrdType",
          "grid",
          "--minPx",
          params.minPx,
          "--maxPx",
          params.maxPx,
          "--gridNum",
          params.gridNum,
          "--quoteSz",
          params.quoteSz
        ],
        commandPreview: `okx --profile ${resolved} bot grid create --instId ${params.instId} --algoOrdType grid --minPx ${params.minPx} --maxPx ${params.maxPx} --gridNum ${params.gridNum} --quoteSz ${params.quoteSz}`,
        summary: `Create a spot grid bot on ${params.instId} with ${params.gridNum} grids and ${params.quoteSz} quote investment.`,
        warnings
      };
    case "dca-create":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "bot",
          "dca",
          "create",
          "--instId",
          params.instId,
          "--lever",
          params.lever,
          "--direction",
          params.direction,
          "--initOrdAmt",
          params.initOrdAmt,
          "--safetyOrdAmt",
          params.safetyOrdAmt,
          "--maxSafetyOrds",
          params.maxSafetyOrds,
          "--pxSteps",
          params.pxSteps,
          "--pxStepsMult",
          params.pxStepsMult,
          "--volMult",
          params.volMult,
          "--tpPct",
          params.tpPct
        ],
        commandPreview: `okx --profile ${resolved} bot dca create --instId ${params.instId} --lever ${params.lever} --direction ${params.direction} --initOrdAmt ${params.initOrdAmt} --safetyOrdAmt ${params.safetyOrdAmt} --maxSafetyOrds ${params.maxSafetyOrds} --pxSteps ${params.pxSteps} --pxStepsMult ${params.pxStepsMult} --volMult ${params.volMult} --tpPct ${params.tpPct}`,
        summary: `Create a DCA bot on ${params.instId} with ${params.lever}x leverage and ${params.direction} direction.`,
        warnings
      };
    case "grid-stop":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "bot",
          "grid",
          "stop",
          "--algoId",
          params.algoId,
          "--algoOrdType",
          params.algoOrdType,
          "--instId",
          params.instId,
          "--stopType",
          params.stopType
        ],
        commandPreview: `okx --profile ${resolved} bot grid stop --algoId ${params.algoId} --algoOrdType ${params.algoOrdType} --instId ${params.instId} --stopType ${params.stopType}`,
        summary: `Stop grid bot ${params.algoId} on ${params.instId}.`,
        warnings
      };
    case "swap-close-position":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "swap",
          "close",
          "--instId",
          params.instId,
          "--mgnMode",
          params.mgnMode,
          "--posSide",
          params.posSide
        ],
        commandPreview: `okx --profile ${resolved} swap close --instId ${params.instId} --mgnMode ${params.mgnMode} --posSide ${params.posSide}`,
        summary: `Close the ${params.posSide} swap position on ${params.instId}.`,
        warnings
      };
    case "swap-trailing-stop":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "swap",
          "algo",
          "trail",
          "--instId",
          params.instId,
          "--side",
          params.posSide === "long" ? "sell" : "buy",
          "--sz",
          params.sz,
          "--tdMode",
          params.tdMode,
          "--posSide",
          params.posSide,
          "--callbackRatio",
          params.callbackRatio
        ],
        commandPreview: `okx --profile ${resolved} swap algo trail --instId ${params.instId} --side ${params.posSide === "long" ? "sell" : "buy"} --sz ${params.sz} --tdMode ${params.tdMode} --posSide ${params.posSide} --callbackRatio ${params.callbackRatio}`,
        summary: `Attach a swap trailing stop to ${params.instId} at callback ratio ${params.callbackRatio}.`,
        warnings
      };
    case "spot-trailing-stop":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "spot",
          "algo",
          "trail",
          "--instId",
          params.instId,
          "--side",
          "sell",
          "--sz",
          params.sz,
          "--callbackRatio",
          params.callbackRatio
        ],
        commandPreview: `okx --profile ${resolved} spot algo trail --instId ${params.instId} --side sell --sz ${params.sz} --callbackRatio ${params.callbackRatio}`,
        summary: `Attach a spot trailing stop to ${params.instId} at callback ratio ${params.callbackRatio}.`,
        warnings
      };
    case "spot-cancel-order":
      return {
        ...action,
        profileMode,
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "spot",
          "cancel",
          "--instId",
          params.instId,
          "--ordId",
          params.ordId
        ],
        commandPreview: `okx --profile ${resolved} spot cancel --instId ${params.instId} --ordId ${params.ordId}`,
        summary: `Cancel spot order ${params.ordId} on ${params.instId}.`,
        warnings
      };
    case "earn-savings-purchase":
      return {
        ...action,
        profileMode: "live",
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "earn",
          "savings",
          "purchase",
          "--ccy",
          params.ccy,
          "--amt",
          params.amt
        ],
        commandPreview: `okx --profile ${resolved} earn savings purchase --ccy ${params.ccy} --amt ${params.amt}`,
        summary: `Subscribe ${params.amt} ${params.ccy} into Simple Earn.`,
        warnings
      };
    case "earn-savings-redeem":
      return {
        ...action,
        profileMode: "live",
        resolvedProfile: resolved,
        params,
        executor: "okx",
        args: [
          "--profile",
          resolved,
          "earn",
          "savings",
          "redeem",
          "--ccy",
          params.ccy,
          "--amt",
          params.amt
        ],
        commandPreview: `okx --profile ${resolved} earn savings redeem --ccy ${params.ccy} --amt ${params.amt}`,
        summary: `Redeem ${params.amt} ${params.ccy} from Simple Earn.`,
        warnings
      };
    default:
      throw new Error(`Unknown action: ${action.id}`);
  }
}

export function buildActionGroups(preflight, selectedProfileMode) {
  const groupOrder = ["刷新状态", "交易", "巡逻机器人", "风险治疗", "睡眠赚币"];
  const grouped = new Map();

  for (const group of groupOrder) {
    grouped.set(group, []);
  }

  for (const action of ACTION_DEFINITIONS) {
    let enabled = true;
    let disabledReason = "";

    if (action.profileRequirement === "auth" && !resolveSelectedProfile(preflight, selectedProfileMode).resolvedProfile) {
      enabled = false;
      disabledReason = "No authenticated profile is ready.";
    }

    if (action.profileRequirement === "live-only" && !preflight.profiles.live.usable) {
      enabled = false;
      disabledReason = trimText(preflight.profiles.live.detail || "Live profile is not ready.", 120);
    }

    grouped.get(action.group).push({
      ...action,
      enabled,
      disabledReason
    });
  }

  return groupOrder.map((group) => ({
    id: group,
    label: group,
    actions: grouped.get(group)
  }));
}

export function prepareAction({ actionId, selectedProfileMode, preflight, params }) {
  const action = findAction(actionId);
  if (!action) {
    throw new Error(`Unknown action ${actionId}`);
  }

  const normalizedParams = normalizeParams(action.fields, params);
  return buildPrepared(action, selectedProfileMode, preflight, normalizedParams);
}
