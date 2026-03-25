export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (normalized) {
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

export function pickNumber(source, keys, fallback = 0) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      const value = toNumber(source[key], Number.NaN);
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }
  return fallback;
}

export function pickString(source, keys, fallback = "") {
  for (const key of keys) {
    if (source && typeof source[key] === "string" && source[key].trim()) {
      return source[key].trim();
    }
  }
  return fallback;
}

export function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
}

export function unwrapOkxData(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && payload.data && Array.isArray(payload.data.details)) {
    return payload.data.details;
  }
  if (payload && payload.data) {
    return asArray(payload.data);
  }
  return asArray(payload);
}

export function okxSucceeded(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "code")) {
    return true;
  }
  return payload.code === 0 || payload.code === "0";
}

export function prettyDate(value) {
  if (!value) {
    return "";
  }
  const numeric = toNumber(value, Number.NaN);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

export function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function trimText(value, maxLength = 240) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
