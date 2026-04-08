/**
 * HTTP GET to player_api.php with base-URL fallback (like XtreamLiveApi.get).
 */
import * as cred from "./credentials.js";

export async function httpGetText(url, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      credentials: "omit",
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return text;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {string} action
 * @param {Record<string, string>} [extra]
 */
export async function xtreamGet(action, extra = {}) {
  const u = encodeURIComponent(cred.usernameRaw());
  const p = encodeURIComponent(cred.passwordRaw());
  let q = `player_api.php?username=${u}&password=${p}&action=${encodeURIComponent(action)}`;
  for (const [k, v] of Object.entries(extra)) {
    q += `&${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
  }
  let lastErr;
  for (const base of cred.candidateBaseUrls()) {
    try {
      const url = `${base.replace(/\/+$/, "")}/${q}`;
      const body = await httpGetText(url);
      cred.markWorkingBaseUrl(base);
      return body;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No panel URL reachable");
}
