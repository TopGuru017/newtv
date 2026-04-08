/**
 * Israel-oriented display + Xtream timeshift segments (Asia/Jerusalem).
 */

const IL_TZ = "Asia/Jerusalem";

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatTimeIsrael(unixSeconds, pattern = "time") {
  const d = new Date(unixSeconds * 1000);
  if (pattern === "time") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: IL_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  }
  return new Intl.DateTimeFormat(undefined, {
    timeZone: IL_TZ,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatTimeRangeIsrael(startUnix, endUnix) {
  return `${formatTimeIsrael(startUnix)} – ${formatTimeIsrael(endUnix)}`;
}

export function nowIsraelSeconds() {
  return Math.floor(Date.now() / 1000);
}

/** Xtream path segment e.g. 2026-03-22:04-20 */
export function formatTimeshiftStartIsrael(unixSeconds) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(unixSeconds * 1000));
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const y = get("year");
  const mo = get("month");
  const da = get("day");
  const hh = get("hour");
  const mm = get("minute");
  if (!y || !mo || !da || !hh || !mm) return "";
  return `${y}-${mo}-${da}:${hh}-${mm}`;
}

/**
 * Parses timeshift segment back to Unix seconds (approximate via formatter round-trip).
 */
export function parseTimeshiftStartIsrael(startFmt) {
  const m = String(startFmt).match(/^(\d{4})-(\d{2})-(\d{2}):(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guessUtc = Date.UTC(y, mo - 1, d, h - 2, mi, 0);
  for (let delta = -4; delta <= 4; delta++) {
    const cand = guessUtc + delta * 3600 * 1000;
    if (formatTimeshiftStartIsrael(Math.floor(cand / 1000)) === startFmt) {
      return Math.floor(cand / 1000);
    }
  }
  const rough = new Date(`${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:00`);
  return Math.floor(rough.getTime() / 1000);
}

export function eligibleForRecordsList(programEndUnix, nowUnix = nowIsraelSeconds()) {
  return nowUnix >= programEndUnix;
}

/** Duration in minutes from server datetime strings; uses device-local parse (set TV to Israel for best match). */
export function rawDurationMinutes(startRaw, endRaw) {
  function parseLoose(s) {
    const t = (s || "").trim();
    const m = t.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    const date = m[1];
    const time = m[2].length === 5 ? `${m[2]}:00` : `${m[2]}:${m[3] || "00"}`;
    const ms = Date.parse(`${date}T${time}`);
    return Number.isFinite(ms) ? ms : null;
  }
  const tStart = parseLoose(startRaw);
  const tEnd = parseLoose(endRaw);
  if (tStart == null || tEnd == null || tEnd <= tStart) return 8 * 60;
  return Math.min(8 * 60, Math.max(1, Math.round((tEnd - tStart) / 60000)));
}
