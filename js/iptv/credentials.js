/**
 * Session + panel URL storage (mirrors Android IptvCredentials / SharedPreferences).
 */
import { createLogger } from "../debug/logger.js";

const log = createLogger("iptv/credentials");
const K_USER = "iptv_username";
const K_PASS = "iptv_password";
const K_BASE = "iptv_base_url";
const K_WORKING = "iptv_last_working_base_url";
const DEFAULT_BASE = "https://ilvip.net";
const DEFAULT_USER = "roku1234";
const DEFAULT_PASS = "11111111";

function alternateScheme(url) {
  const u = (url || "").trim().replace(/\/+$/, "");
  if (!u) return null;
  if (u.toLowerCase().startsWith("https://")) return "http://" + u.slice(8);
  if (u.toLowerCase().startsWith("http://")) return "https://" + u.slice(7);
  return null;
}

export function saveSession(baseUrl, username, password) {
  log.debug("saveSession()", { baseUrl, username });
  const b = (baseUrl || "").trim().replace(/\/+$/, "");
  localStorage.setItem(K_BASE, b);
  localStorage.setItem(K_USER, (username || "").trim());
  localStorage.setItem(K_PASS, password || "");
  if (b) localStorage.setItem(K_WORKING, b);
}

export function clearSession() {
  log.debug("clearSession()");
  localStorage.removeItem(K_USER);
  localStorage.removeItem(K_PASS);
  localStorage.removeItem(K_WORKING);
  /* Keep K_BASE so the login form can still suggest the last panel URL. */
}

export function isLoggedIn() {
  const ok =
    usernameRaw().length > 0 && passwordRaw().length > 0 && baseUrl().length > 0;
  log.debug("isLoggedIn()", { ok });
  return ok;
}

export function usernameRaw() {
  return (localStorage.getItem(K_USER) || DEFAULT_USER || "").trim();
}

export function passwordRaw() {
  return localStorage.getItem(K_PASS) || DEFAULT_PASS || "";
}

/** Configured panel root (https://host or http://host), no trailing slash. */
export function baseUrl() {
  return (localStorage.getItem(K_BASE) || DEFAULT_BASE || "")
    .trim()
    .replace(/\/+$/, "");
}

export function preferredBaseUrl() {
  const w = (localStorage.getItem(K_WORKING) || "").trim().replace(/\/+$/, "");
  const b = baseUrl();
  return w || b;
}

export function markWorkingBaseUrl(url) {
  log.debug("markWorkingBaseUrl()", { url });
  const clean = (url || "").trim().replace(/\/+$/, "");
  if (clean) localStorage.setItem(K_WORKING, clean);
}

/** Try preferred, configured, then http/https alternates (order preserved, deduped). */
export function candidateBaseUrls() {
  const out = [];
  const seen = new Set();
  const push = (u) => {
    const x = (u || "").trim().replace(/\/+$/, "");
    if (x && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  };
  push(preferredBaseUrl());
  push(baseUrl());
  for (const u of [...out]) {
    const alt = alternateScheme(u);
    if (alt) push(alt);
  }
  log.debug("candidateBaseUrls()", { count: out.length, out });
  return out;
}

/**
 * Seed runtime session from Android defaults when local storage is empty.
 * Mirrors Android BuildConfig defaults:
 * - IPTV_BASE_URL = https://ilvip.net
 * - IPTV_USERNAME = roku1234
 * - IPTV_PASSWORD = 11111111
 */
export function ensureDefaultSession() {
  log.debug("ensureDefaultSession()");
  const hasBase = (localStorage.getItem(K_BASE) || "").trim().length > 0;
  const hasUser = (localStorage.getItem(K_USER) || "").trim().length > 0;
  const hasPass = (localStorage.getItem(K_PASS) || "").length > 0;
  if (!hasBase) localStorage.setItem(K_BASE, DEFAULT_BASE);
  if (!hasUser) localStorage.setItem(K_USER, DEFAULT_USER);
  if (!hasPass) localStorage.setItem(K_PASS, DEFAULT_PASS);
  if (!(localStorage.getItem(K_WORKING) || "").trim()) {
    localStorage.setItem(K_WORKING, DEFAULT_BASE);
  }
  log.debug("ensureDefaultSession() complete", {
    hasBase: !!baseUrl(),
    hasUser: !!usernameRaw(),
    hasPass: !!passwordRaw(),
  });
}
