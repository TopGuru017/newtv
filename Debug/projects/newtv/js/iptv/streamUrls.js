/**
 * Xtream-style stream URLs (live / movie / series / timeshift).
 */
import * as cred from "./credentials.js";
import { formatTimeshiftStartIsrael, rawDurationMinutes } from "./timeUtils.js";
import { createLogger } from "../debug/logger.js";

const log = createLogger("iptv/streamUrls");

function encPath(s) {
  return encodeURIComponent(s || "").replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function alternateHttpScheme(url) {
  const u = (url || "").trim();
  if (u.toLowerCase().startsWith("https://")) return "http://" + u.slice(8);
  if (u.toLowerCase().startsWith("http://")) return "https://" + u.slice(7);
  return null;
}

export function liveStreamUrl(streamId) {
  const base = cred.preferredBaseUrl();
  const u = encPath(cred.usernameRaw());
  const p = encPath(cred.passwordRaw());
  const id = String(streamId || "").trim().replace(/^\/+/, "");
  const out = `${base}/live/${u}/${p}/${id}.m3u8`;
  log.debug("liveStreamUrl()", { streamId, out });
  return out;
}

export function vodMovieUrl(streamId, containerExtension) {
  const base = cred.preferredBaseUrl();
  const u = encPath(cred.usernameRaw());
  const p = encPath(cred.passwordRaw());
  const id = String(streamId || "").trim().replace(/^\/+/, "");
  const ext = String(containerExtension || "mp4").replace(/^\./, "") || "mp4";
  const out = `${base}/movie/${u}/${p}/${id}.${ext}`;
  log.debug("vodMovieUrl()", { streamId, containerExtension, out });
  return out;
}

export function seriesEpisodeUrl(episodeStreamId, containerExtension) {
  const base = cred.preferredBaseUrl();
  const u = encPath(cred.usernameRaw());
  const p = encPath(cred.passwordRaw());
  const id = String(episodeStreamId || "").trim().replace(/^\/+/, "");
  const ext = String(containerExtension || "mp4").replace(/^\./, "") || "mp4";
  const out = `${base}/series/${u}/${p}/${id}.${ext}`;
  log.debug("seriesEpisodeUrl()", { episodeStreamId, containerExtension, out });
  return out;
}

function rawToUrlSegment(raw) {
  const s = (raw || "").trim();
  const spaceIdx = s.indexOf(" ");
  if (spaceIdx < 1) return null;
  const date = s.substring(0, spaceIdx);
  const timePart = s.substring(spaceIdx + 1).substring(0, 5);
  if (timePart.length < 5 || timePart[2] !== ":") return null;
  const hhmm = timePart.replace(":", "-");
  return `${date}:${hhmm}`;
}

export function timeshiftStreamUrl(streamId, startUnix, endUnix, startRaw, endRaw) {
  const base = cred.preferredBaseUrl().replace(/\/+$/, "");
  const u = encPath(cred.usernameRaw());
  const p = encPath(cred.passwordRaw());
  const id = String(streamId || "").trim().replace(/^\/+/, "");
  const startFmt = startRaw ? rawToUrlSegment(startRaw) : null;
  const durationMinutes =
    startFmt && endRaw ? rawDurationMinutes(startRaw, endRaw) : null;
  if (startFmt != null && durationMinutes != null) {
    const out = `${base}/timeshift/${u}/${p}/${durationMinutes}/${startFmt}/${id}.m3u8`;
    log.debug("timeshiftStreamUrl() raw", { streamId, startRaw, endRaw, out });
    return out;
  }
  const durationMinutesFallback = 8 * 60;
  const startFmtFallback = formatTimeshiftStartIsrael(startUnix);
  const out = `${base}/timeshift/${u}/${p}/${durationMinutesFallback}/${startFmtFallback}/${id}.m3u8`;
  log.debug("timeshiftStreamUrl() fallback", { streamId, startUnix, endUnix, out });
  return out;
}

export function isPanelLiveStreamUrl(url) {
  const path = tryPath(url);
  return path.split("/").some((seg) => seg.toLowerCase() === "live");
}

export function isTimeshiftUrl(url) {
  const path = tryPath(url);
  return path.split("/").some((seg) => seg.toLowerCase() === "timeshift");
}

function tryPath(url) {
  try {
    return new URL(url).pathname || "";
  } catch {
    return "";
  }
}
