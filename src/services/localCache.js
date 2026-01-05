export function readCache(key, { ttlMs } = {}) {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const { value, ts } = parsed;
    if (typeof ts !== "number") return null;

    if (typeof ttlMs === "number" && ttlMs > 0) {
      if (Date.now() - ts > ttlMs) return null;
    }

    return value;
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    // ignore
  }
}

export function writeFlag(key, value = true) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    // ignore
  }
}

export function readFlag(key, { maxAgeMs } = {}) {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const { value, ts } = parsed;
    if (typeof ts !== "number") return null;

    if (typeof maxAgeMs === "number" && maxAgeMs > 0) {
      if (Date.now() - ts > maxAgeMs) return null;
    }

    return value;
  } catch {
    return null;
  }
}
