/**
 * HTTP GET to player_api.php with base-URL fallback (like XtreamLiveApi.get).
 */
import * as cred from "./credentials.js";
import { createLogger } from "../debug/logger.js";

const log = createLogger("iptv/xapi");

export async function httpGetText(url, timeoutMs = 25000) {
  log.debug("httpGetText() start", { url, timeoutMs });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = timeoutMs;
    xhr.withCredentials = false;
    xhr.onreadystatechange = function onReadyStateChange() {
      if (xhr.readyState !== 4) return;
      const status = Number(xhr.status || 0);
      const text = xhr.responseText || "";
      const ok = status >= 200 && status < 300;
      log.debug("httpGetText() response", { url, status, ok });
      if (ok) {
        resolve(text);
      } else {
        reject(new Error(`HTTP ${status}: ${text.slice(0, 200)}`));
      }
    };
    xhr.onerror = function onError() {
      log.error("httpGetText() xhr error", { url });
      reject(new Error("Failed to fetch"));
    };
    xhr.ontimeout = function onTimeout() {
      log.error("httpGetText() xhr timeout", { url, timeoutMs });
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    };
    try {
      xhr.send();
    } catch (e) {
      log.error("httpGetText() xhr send exception", { url, message: e?.message });
      reject(e);
    }
  });
}

/**
 * @param {string} action
 * @param {Record<string, string>} [extra]
 */
export async function xtreamGet(action, extra = {}) {
  log.debug("xtreamGet() start", { action, extra });
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
      log.debug("xtreamGet() try", { action, base, url });
      const body = await httpGetText(url);
      cred.markWorkingBaseUrl(base);
      log.debug("xtreamGet() success", { action, base });
      return body;
    } catch (e) {
      log.warn("xtreamGet() failed candidate", { action, base, message: e?.message });
      lastErr = e;
    }
  }
  log.error("xtreamGet() exhausted candidates", { action, message: lastErr?.message });
  throw lastErr || new Error("No panel URL reachable");
}
