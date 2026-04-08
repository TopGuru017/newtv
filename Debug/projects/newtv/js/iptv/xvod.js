/**
 * Xtream VOD + series APIs.
 */
import { parseJsonArrayOrData } from "./parse.js";
import { xtreamGet } from "./xapi.js";
import { createLogger } from "../debug/logger.js";

const log = createLogger("iptv/xvod");

function readAddedUnixSeconds(o, preferKeys) {
  for (const k of preferKeys) {
    if (o[k] == null) continue;
    const n = Number(o[k]);
    if (n > 0) return n;
  }
  return null;
}

function readTmdbRating(o) {
  const ratingStr = String(o.rating || "").trim();
  if (
    ratingStr &&
    !/^n\/a$/i.test(ratingStr) &&
    ratingStr !== "null"
  ) {
    const f = parseFloat(ratingStr);
    if (!Number.isNaN(f) && f > 0) return Math.min(10, Math.max(0, f));
  }
  const ratingNum = Number(o.rating);
  if (!Number.isNaN(ratingNum) && ratingNum > 0)
    return Math.min(10, Math.max(0, ratingNum));
  const five = Number(o.rating_5based);
  if (!Number.isNaN(five) && five > 0) return Math.min(10, Math.max(0, five * 2));
  return null;
}

export async function fetchVodCategories() {
  log.debug("fetchVodCategories()");
  const json = await xtreamGet("get_vod_categories");
  const arr = parseJsonArrayOrData(json);
  const out = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    const id = String(o.category_id || "").trim();
    if (!id) continue;
    const name = String(o.category_name || "").trim() || id;
    out.push({ id, name });
  }
  log.debug("fetchVodCategories() done", { count: out.length });
  return out;
}

export async function fetchVodStreams(categoryId) {
  log.debug("fetchVodStreams()", { categoryId });
  const json = await xtreamGet("get_vod_streams", {
    category_id: String(categoryId),
  });
  const arr = parseJsonArrayOrData(json);
  const out = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    const streamId = String(o.stream_id || "").trim();
    if (!streamId) continue;
    const name = String(o.name || "").trim() || streamId;
    const coverUrl = String(o.stream_icon || "").trim() || null;
    const plot = String(o.plot || "").trim() || null;
    const categoryId = String(o.category_id || "").trim() || null;
    const ext = String(o.container_extension || "mp4")
      .replace(/^\./, "")
      .trim() || "mp4";
    out.push({
      streamId,
      name,
      coverUrl,
      plot,
      categoryId,
      containerExtension: ext,
      tmdbRating: readTmdbRating(o),
      addedUnixSeconds: readAddedUnixSeconds(o, [
        "added",
        "last_modified",
        "created",
      ]),
    });
  }
  log.debug("fetchVodStreams() done", { categoryId, count: out.length });
  return out;
}

export async function fetchSeriesCategories() {
  log.debug("fetchSeriesCategories()");
  const json = await xtreamGet("get_series_categories");
  const arr = parseJsonArrayOrData(json);
  const out = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    const id = String(o.category_id || "").trim();
    if (!id) continue;
    const name = String(o.category_name || "").trim() || id;
    out.push({ id, name });
  }
  log.debug("fetchSeriesCategories() done", { count: out.length });
  return out;
}

export async function fetchSeries(categoryId) {
  log.debug("fetchSeries()", { categoryId });
  const json = await xtreamGet("get_series", {
    category_id: String(categoryId),
  });
  const arr = parseJsonArrayOrData(json);
  const out = [];
  for (const o of arr) {
    if (!o || typeof o !== "object") continue;
    const seriesId = String(o.series_id || "").trim();
    if (!seriesId) continue;
    const name = String(o.name || "").trim() || seriesId;
    const coverUrl =
      String(o.cover || "").trim() ||
      String(o.cover_big || "").trim() ||
      null;
    const plot = String(o.plot || "").trim() || null;
    const cat = String(o.category_id || "").trim() || null;
    out.push({
      seriesId,
      name,
      coverUrl,
      plot,
      categoryId: cat,
      addedUnixSeconds: readAddedUnixSeconds(o, [
        "last_modified",
        "added",
        "created",
      ]),
    });
  }
  log.debug("fetchSeries() done", { categoryId, count: out.length });
  return out;
}

export async function fetchAllVodStreamsForSearch() {
  log.debug("fetchAllVodStreamsForSearch()");
  try {
    const direct = parseJsonArrayOrData(await xtreamGet("get_vod_streams"));
    const list = [];
    for (const o of direct) {
      if (!o || typeof o !== "object") continue;
      const streamId = String(o.stream_id || "").trim();
      if (!streamId) continue;
      const name = String(o.name || "").trim() || streamId;
      const ext = String(o.container_extension || "mp4")
        .replace(/^\./, "")
        .trim() || "mp4";
      list.push({
        streamId,
        name,
        coverUrl: String(o.stream_icon || "").trim() || null,
        plot: String(o.plot || "").trim() || null,
        categoryId: String(o.category_id || "").trim() || null,
        containerExtension: ext,
        tmdbRating: readTmdbRating(o),
        addedUnixSeconds: readAddedUnixSeconds(o, [
          "added",
          "last_modified",
          "created",
        ]),
      });
    }
    if (list.length) {
      log.debug("fetchAllVodStreamsForSearch() direct", { count: list.length });
      return list;
    }
  } catch {
    /* aggregate */
  }
  const cats = await fetchVodCategories();
  const seen = new Set();
  const merged = [];
  for (const c of cats) {
    const rows = await fetchVodStreams(c.id).catch(() => []);
    for (const m of rows) {
      if (!seen.has(m.streamId)) {
        seen.add(m.streamId);
        merged.push(m);
      }
    }
  }
  log.debug("fetchAllVodStreamsForSearch() merged", { count: merged.length });
  return merged;
}

export async function fetchAllSeriesForSearch() {
  log.debug("fetchAllSeriesForSearch()");
  try {
    const direct = parseJsonArrayOrData(await xtreamGet("get_series"));
    const list = [];
    for (const o of direct) {
      if (!o || typeof o !== "object") continue;
      const seriesId = String(o.series_id || "").trim();
      if (!seriesId) continue;
      list.push({
        seriesId,
        name: String(o.name || "").trim() || seriesId,
        coverUrl:
          String(o.cover || "").trim() ||
          String(o.cover_big || "").trim() ||
          null,
        plot: String(o.plot || "").trim() || null,
        categoryId: String(o.category_id || "").trim() || null,
        addedUnixSeconds: readAddedUnixSeconds(o, [
          "last_modified",
          "added",
          "created",
        ]),
      });
    }
    if (list.length) {
      log.debug("fetchAllSeriesForSearch() direct", { count: list.length });
      return list;
    }
  } catch {
    /* aggregate */
  }
  const cats = await fetchSeriesCategories();
  const seen = new Set();
  const merged = [];
  for (const c of cats) {
    const rows = await fetchSeries(c.id).catch(() => []);
    for (const s of rows) {
      if (!seen.has(s.seriesId)) {
        seen.add(s.seriesId);
        merged.push(s);
      }
    }
  }
  log.debug("fetchAllSeriesForSearch() merged", { count: merged.length });
  return merged;
}

function readSeriesPlotFromInfo(info, root) {
  const candidates = [];
  function addFrom(o, keys) {
    if (!o) return;
    for (const k of keys) {
      const s = String(o[k] || "").trim();
      if (s) candidates.push(s);
    }
  }
  addFrom(info, ["plot", "description", "overview", "storyline"]);
  addFrom(root, ["plot", "description", "overview"]);
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a.length >= b.length ? a : b));
}

export async function fetchSeriesDetails(seriesId) {
  log.debug("fetchSeriesDetails()", { seriesId });
  const json = await xtreamGet("get_series_info", {
    series_id: String(seriesId),
  });
  const t = json.trim();
  if (!t.startsWith("{")) throw new Error("Invalid series info");
  const root = JSON.parse(t);
  const info = root.info || {};
  const seriesName = String(info.name || "").trim() || String(seriesId);
  const seriesPlot = readSeriesPlotFromInfo(info, root);
  const seriesCover =
    String(info.cover || "").trim() ||
    String(info.cover_big || "").trim() ||
    null;

  const seasonTitles = new Map();
  const seasonsArr = root.seasons;
  if (Array.isArray(seasonsArr)) {
    for (const o of seasonsArr) {
      if (!o || typeof o !== "object") continue;
      const number = Number(o.season_number);
      if (number < 0 || Number.isNaN(number)) continue;
      const title = String(o.name || "").trim() || `Season ${number}`;
      seasonTitles.set(number, title);
    }
  }

  const episodesBySeason = new Map();
  const episodesObj = root.episodes;
  if (episodesObj && typeof episodesObj === "object") {
    for (const seasonKey of Object.keys(episodesObj)) {
      const seasonNum = parseInt(seasonKey, 10);
      if (Number.isNaN(seasonNum)) continue;
      const arr = episodesObj[seasonKey];
      if (!Array.isArray(arr)) continue;
      const bucket = [];
      for (let i = 0; i < arr.length; i++) {
        const ep = arr[i];
        if (!ep || typeof ep !== "object") continue;
        const episodeId = String(ep.id || ep.stream_id || "").trim();
        if (!episodeId) continue;
        const episodeNum =
          Number(ep.episode_num) > 0 ? Number(ep.episode_num) : i + 1;
        const title =
          String(ep.title || "").trim() ||
          String(ep.name || "").trim() ||
          `Episode ${episodeNum}`;
        const plot = String(ep.plot || "").trim() || null;
        const coverUrl =
          String(ep.movie_image || "").trim() ||
          String(ep.cover || "").trim() ||
          null;
        const ext = String(ep.container_extension || "mp4")
          .replace(/^\./, "")
          .trim() || "mp4";
        bucket.push({
          episodeId,
          episodeNumber: episodeNum,
          title,
          plot,
          coverUrl,
          containerExtension: ext,
          seasonNumber: seasonNum,
        });
      }
      bucket.sort((a, b) => a.episodeNumber - b.episodeNumber);
      episodesBySeason.set(seasonNum, bucket);
    }
  }

  const seasonNumbers = new Set([
    ...seasonTitles.keys(),
    ...episodesBySeason.keys(),
  ]);
  const seasons = [...seasonNumbers]
    .sort((a, b) => a - b)
    .map((num) => ({
      seasonNumber: num,
      title: seasonTitles.get(num) || `Season ${num}`,
    }));

  const out = {
    seriesId: String(seriesId),
    name: seriesName,
    plot: seriesPlot,
    coverUrl: seriesCover,
    seasons,
    episodesBySeason,
  };
  log.debug("fetchSeriesDetails() done", {
    seriesId,
    seasons: out.seasons.length,
    episodeBuckets: out.episodesBySeason.size,
  });
  return out;
}
