import { createLogger } from "../debug/logger.js";

const log = createLogger("store/lastWatch");
const KEY = "iptv_last_watch_v1";

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
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
}

export function listLastWatch() {
  const out = readAll();
  log.debug("listLastWatch()", { count: out.length });
  return out;
}

export function upsertLastWatch(entry) {
  log.debug("upsertLastWatch()", { entry });
  const all = readAll();
  const idx = all.findIndex((x) => x.type === entry.type && x.id === entry.id);
  const next = {
    ...entry,
    updatedAt: Date.now(),
  };
  if (idx >= 0) all.splice(idx, 1);
  all.unshift(next);
  writeAll(all);
  log.debug("upsertLastWatch() done", { count: all.length });
}

export function clearLastWatch() {
  log.debug("clearLastWatch()");
  localStorage.removeItem(KEY);
}

export function updatePlaybackPosition(type, id, positionSec, durationSec) {
  const all = readAll();
  const idx = all.findIndex((x) => x.type === type && x.id === id);
  if (idx < 0) return;
  all[idx].positionSec = Math.max(0, Math.floor(positionSec || 0));
  all[idx].durationSec = Math.max(0, Math.floor(durationSec || 0));
  all[idx].updatedAt = Date.now();
  writeAll(all);
  log.debug("updatePlaybackPosition()", {
    type,
    id,
    positionSec: all[idx].positionSec,
    durationSec: all[idx].durationSec,
  });
}
