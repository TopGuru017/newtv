/**
 * Xtream live TV + EPG (get_live_categories, get_live_streams, get_short_epg, …).
 */
import { decodeXtreamText, parseJsonArrayOrData } from "./parse.js";
import { xtreamGet } from "./xapi.js";

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
  const json = await xtreamGet("get_live_categories");
  return parseCategories(parseJsonArrayOrData(json));
}

export async function fetchLiveStreams(categoryId) {
  const json = await xtreamGet("get_live_streams", {
    category_id: String(categoryId),
  });
  return parseStreams(parseJsonArrayOrData(json));
}

export async function fetchAllLiveStreams() {
  const json = await xtreamGet("get_live_streams");
  return parseStreams(parseJsonArrayOrData(json));
}

export async function fetchAllLiveStreamsForSearch() {
  try {
    const direct = parseStreams(
      parseJsonArrayOrData(await xtreamGet("get_live_streams")),
    );
    if (direct.length) return direct;
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
  return merged;
}

export async function fetchTvArchiveStreams() {
  const all = await fetchAllLiveStreamsForSearch();
  return all.filter((s) => s.tvArchive);
}

export async function fetchTvArchiveStreamsForCategory(categoryId) {
  if (categoryId != null && categoryId !== "") {
    return (await fetchLiveStreams(categoryId)).filter((s) => s.tvArchive);
  }
  const bulk = (await fetchAllLiveStreams().catch(() => [])).filter(
    (s) => s.tvArchive,
  );
  if (bulk.length) return bulk;
  return fetchTvArchiveStreams();
}

export async function fetchShortEpg(streamId, limit = 8) {
  const json = await xtreamGet("get_short_epg", {
    stream_id: String(streamId),
    limit: String(limit),
  });
  return parseEpgStandard(json);
}

export async function fetchFullEpg(streamId, limit = 50) {
  return fetchShortEpg(streamId, limit);
}

export async function fetchArchiveEpgTable(streamId) {
  let table = [];
  try {
    const json = await xtreamGet("get_simple_data_table", {
      stream_id: String(streamId),
    });
    table = parseEpgFlexible(json);
  } catch {
    table = [];
  }
  if (table.length) return table;
  const json = await xtreamGet("get_short_epg", {
    stream_id: String(streamId),
    limit: "500",
  });
  return parseEpgStandard(json);
}
