const LOG_KEY = "iptv_debug_logs";

function nowIso() {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
}

function canLog() {
  try {
    const v = localStorage.getItem(LOG_KEY);
    if (v == null) return true;
    return v !== "0" && v.toLowerCase() !== "false";
  } catch {
    return true;
  }
}

function scrub(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 260) return `${value.slice(0, 260)}...`;
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 8).map((v) => scrub(v));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/pass(word)?|token|secret/i.test(k)) out[k] = "***";
      else out[k] = scrub(v);
    }
    return out;
  }
  return value;
}

export function createLogger(scope) {
  function emit(level, msg, data) {
    if (!canLog()) return;
    const stamp = nowIso();
    const tag = `[${stamp}] [${scope}]`;
    if (data === undefined) {
      console[level](`${tag} ${msg}`);
    } else {
      console[level](`${tag} ${msg}`, scrub(data));
    }
  }

  return {
    debug(msg, data) {
      emit("log", msg, data);
    },
    warn(msg, data) {
      emit("warn", msg, data);
    },
    error(msg, data) {
      emit("error", msg, data);
    },
  };
}

