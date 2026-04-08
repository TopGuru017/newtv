/**
 * Xtream live TV + EPG (get_live_categories, get_live_streams, get_short_epg, …).
 */
import { decodeXtreamText, parseJsonArrayOrData } from "./parse.js";
import { xtreamGet } from "./xapi.js";
import { createLogger } from "../debug/logger.js";

const log = createLogger("iptv/xlive");

function parseCategories(arr) {
  const out = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    const id = String(o.category_id || "").trim();
    if (!id) continue;
    const name = decodeXtreamText(o.category_name) || id;
    out.push({ id, name });
  }
  return out;
}

function parseStreams(arr) {
  const out = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    const streamId = String(o.stream_id || "").trim();
    if (!streamId) continue;
    const name = decodeXtreamText(o.name) || streamId;
    const iconUrl = String(o.stream_icon || "").trim() || null;
    const categoryId = String(o.category_id || "").trim() || null;
    const epgChannelId = String(o.epg_channel_id || "").trim() || null;
    const tvArchive =
      Number(o.tv_archive) === 1 || String(o.tv_archive || "") === "1";
    out.push({
      streamId,
      name,
      iconUrl,
      categoryId,
      epgChannelId,
      tvArchive,
    });
  }
  return out;
}

function readUnix(o, keys) {
  for (const k of keys) {
    if (o[k] == null) continue;
    const n = Number(o[k]);
    if (n > 0) return n;
  }
  return 0;
}

function readDateTimeString(o, keys) {
  for (const k of keys) {
    const v = String(o[k] || "").trim();
    if (v.length >= 16 && /^\d/.test(v) && v[4] === "-") return v;
  }
  return null;
}

function parseEpgListingsFromArray(arr) {
  const out = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    let title =
      decodeXtreamText(o.title) ||
      decodeXtreamText(o.name) ||
      decodeXtreamText(o.title_base64);
    if (!title) continue;
    const description =
      decodeXtreamText(o.description) ||
      decodeXtreamText(o.description_base64) ||
      "";
    const category =
      decodeXtreamText(o.category_name).trim() ||
      decodeXtreamText(o.category).trim() ||
      null;
    const startRaw = readDateTimeString(o, ["start", "start_time"]);
    const endRaw = readDateTimeString(o, ["stop", "end", "end_time"]);
    const startUnix = readUnix(o, [
      "start_timestamp",
      "start",
      "start_time",
    ]);
    const endUnix = readUnix(o, [
      "stop_timestamp",
      "end_timestamp",
      "stop",
      "end",
      "end_time",
    ]);
    if (startUnix <= 0 || endUnix <= 0 || endUnix <= startUnix) continue;
    const imageUrl =
      String(o.cover || o.image || o.icon || "")
        .trim() || null;
    out.push({
      title,
      description: description.trim(),
      category,
      startUnix,
      endUnix,
      imageUrl,
      startRaw,
      endRaw,
    });
  }
  return out;
}

function parseEpgFlexible(jsonText) {
  const t = (jsonText || "").trim();
  if (t.startsWith("[")) {
    return parseEpgListingsFromArray(JSON.parse(t));
  }
  if (!t.startsWith("{")) return [];
  const root = JSON.parse(t);
  const keys = ["epg_listings", "listings", "programs", "data"];
  for (const k of keys) {
    const arr = root[k];
    if (Array.isArray(arr)) return parseEpgListingsFromArray(arr);
  }
  return [];
}

function parseEpgStandard(jsonText) {
  const t = (jsonText || "").trim();
  if (!t.startsWith("{")) return [];
  const root = JSON.parse(t);
  const arr = root.epg_listings;
  if (!Array.isArray(arr)) return [];
  return parseEpgListingsFromArray(arr);
}

export async function fetchLiveCategories() {
  log.debug("fetchLiveCategories()");
  const json = await xtreamGet("get_live_categories");
  const out = parseCategories(parseJsonArrayOrData(json));
  log.debug("fetchLiveCategories() done", { count: out.length });
  return out;
}

export async function fetchLiveStreams(categoryId) {
  log.debug("fetchLiveStreams()", { categoryId });
  const json = await xtreamGet("get_live_streams", {
    category_id: String(categoryId),
  });
  const out = parseStreams(parseJsonArrayOrData(json));
  log.debug("fetchLiveStreams() done", { categoryId, count: out.length });
  return out;
}

export async function fetchAllLiveStreams() {
  log.debug("fetchAllLiveStreams()");
  const json = await xtreamGet("get_live_streams");
  const out = parseStreams(parseJsonArrayOrData(json));
  log.debug("fetchAllLiveStreams() done", { count: out.length });
  return out;
}

export async function fetchAllLiveStreamsForSearch() {
  log.debug("fetchAllLiveStreamsForSearch()");
  try {
    const direct = parseStreams(
      parseJsonArrayOrData(await xtreamGet("get_live_streams")),
    );
    if (direct.length) {
      log.debug("fetchAllLiveStreamsForSearch() direct", { count: direct.length });
      return direct;
    }
  } catch {
    /* fall through */
  }
  const cats = await fetchLiveCategories();
  const seen = new Set();
  const merged = [];
  for (const c of cats) {
    const list = await fetchLiveStreams(c.id).catch(() => []);
    for (const s of list) {
      if (!seen.has(s.streamId)) {
        seen.add(s.streamId);
        merged.push(s);
      }
    }
  }
  log.debug("fetchAllLiveStreamsForSearch() merged", { count: merged.length });
  return merged;
}

export async function fetchTvArchiveStreams() {
  log.debug("fetchTvArchiveStreams()");
  const all = await fetchAllLiveStreamsForSearch();
  const out = all.filter((s) => s.tvArchive);
  log.debug("fetchTvArchiveStreams() done", { count: out.length });
  return out;
}

export async function fetchTvArchiveStreamsForCategory(categoryId) {
  log.debug("fetchTvArchiveStreamsForCategory()", { categoryId });
  if (categoryId != null && categoryId !== "") {
    const out = (await fetchLiveStreams(categoryId)).filter((s) => s.tvArchive);
    log.debug("fetchTvArchiveStreamsForCategory() category", {
      categoryId,
      count: out.length,
    });
    return out;
  }
  const bulk = (await fetchAllLiveStreams().catch(() => [])).filter(
    (s) => s.tvArchive,
  );
  if (bulk.length) {
    log.debug("fetchTvArchiveStreamsForCategory() all bulk", { count: bulk.length });
    return bulk;
  }
  return fetchTvArchiveStreams();
}

export async function fetchShortEpg(streamId, limit = 8) {
  log.debug("fetchShortEpg()", { streamId, limit });
  const json = await xtreamGet("get_short_epg", {
    stream_id: String(streamId),
    limit: String(limit),
  });
  const out = parseEpgStandard(json);
  log.debug("fetchShortEpg() done", { streamId, count: out.length });
  return out;
}

export async function fetchFullEpg(streamId, limit = 50) {
  log.debug("fetchFullEpg()", { streamId, limit });
  return fetchShortEpg(streamId, limit);
}

export async function fetchArchiveEpgTable(streamId) {
  log.debug("fetchArchiveEpgTable()", { streamId });
  let table = [];
  try {
    const json = await xtreamGet("get_simple_data_table", {
      stream_id: String(streamId),
    });
    table = parseEpgFlexible(json);
  } catch {
    table = [];
  }
  if (table.length) {
    log.debug("fetchArchiveEpgTable() simple_data_table", { streamId, count: table.length });
    return table;
  }
  const json = await xtreamGet("get_short_epg", {
    stream_id: String(streamId),
    limit: "500",
  });
  const out = parseEpgStandard(json);
  log.debug("fetchArchiveEpgTable() fallback", { streamId, count: out.length });
  return out;
}
