import { createLogger } from "../debug/logger.js";

const log = createLogger("store/searchHistory");
const KEY = "iptv_search_history_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
}

export function listSearchHistory() {
  const out = readAll();
  log.debug("listSearchHistory()", { count: out.length });
  return out;
}

export function pushSearchQuery(query) {
  const q = String(query || "").trim();
  if (!q) return;
  const all = readAll().filter((x) => x.toLowerCase() !== q.toLowerCase());
  all.unshift(q);
  writeAll(all);
  log.debug("pushSearchQuery()", { query: q, count: all.length });
}

export function clearSearchHistory() {
  log.debug("clearSearchHistory()");
  localStorage.removeItem(KEY);
}
