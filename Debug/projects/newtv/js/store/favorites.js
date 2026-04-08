import { createLogger } from "../debug/logger.js";

const log = createLogger("store/favorites");
const KEY = "iptv_favorites_v1";

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
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 1000)));
}

export function listFavorites() {
  const out = readAll();
  log.debug("listFavorites()", { count: out.length });
  return out;
}

export function isFavorite(type, id) {
  const yes = readAll().some((x) => x.type === type && x.id === id);
  log.debug("isFavorite()", { type, id, yes });
  return yes;
}

export function toggleFavorite(item) {
  log.debug("toggleFavorite()", { item });
  const all = readAll();
  const idx = all.findIndex((x) => x.type === item.type && x.id === item.id);
  if (idx >= 0) {
    all.splice(idx, 1);
    writeAll(all);
    log.debug("toggleFavorite() removed", { item });
    return false;
  }
  all.unshift({
    ...item,
    addedAt: Date.now(),
  });
  writeAll(all);
  log.debug("toggleFavorite() added", { item });
  return true;
}

export function clearFavorites() {
  log.debug("clearFavorites()");
  localStorage.removeItem(KEY);
}
