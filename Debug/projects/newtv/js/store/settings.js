import { createLogger } from "../debug/logger.js";

const log = createLogger("store/settings");
const KEY = "iptv_settings_v1";
const DEFAULTS = {
  language: "en",
  sidebarCollapsedByDefault: false,
  autoplayOnSelect: true,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const out = { ...DEFAULTS, ...(parsed || {}) };
    log.debug("getSettings()", out);
    return out;
  } catch {
    const out = { ...DEFAULTS };
    log.warn("getSettings() fallback defaults", out);
    return out;
  }
}

export function updateSettings(patch) {
  const next = { ...getSettings(), ...(patch || {}) };
  localStorage.setItem(KEY, JSON.stringify(next));
  log.debug("updateSettings()", { patch, next });
  return next;
}
