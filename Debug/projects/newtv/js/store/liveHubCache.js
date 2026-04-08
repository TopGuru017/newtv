/**
 * In-memory cache for Live hub: categories + streams per category.
 * First load fetches everything (bulk get_live_streams when possible, else parallel per category).
 */
import * as xlive from "../iptv/xlive.js";
import { createLogger } from "../debug/logger.js";

const log = createLogger("store/liveHubCache");

let cachePromise = null;
/** @type {{ id: string, name: string }[] | null} */
let categories = null;
/** @type {Map<string, object[]>} */
const streamsByCategoryId = new Map();

export function isLiveHubCacheReady() {
  return categories != null;
}

export function getLiveHubCategories() {
  return categories || [];
}

export function getLiveHubStreamsForCategory(categoryId) {
  return streamsByCategoryId.get(String(categoryId)) || [];
}

/**
 * Loads categories and all streams into memory. Safe to call multiple times.
 */
export function ensureLiveHubCache() {
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    try {
      const cats = await xlive.fetchLiveCategories();
      categories = cats;
      streamsByCategoryId.clear();
      for (const c of cats) {
        streamsByCategoryId.set(c.id, []);
      }

      let bulk = [];
      try {
        bulk = await xlive.fetchAllLiveStreams();
      } catch (e) {
        log.debug("fetchAllLiveStreams failed, will try per-category", {
          message: e?.message,
        });
      }

      if (bulk.length) {
        for (const s of bulk) {
          const cid = String(s.categoryId || "").trim();
          if (!streamsByCategoryId.has(cid)) {
            streamsByCategoryId.set(cid, []);
          }
          streamsByCategoryId.get(cid).push(s);
        }
        log.debug("ensureLiveHubCache() bulk", {
          categories: cats.length,
          streams: bulk.length,
        });
        return;
      }

      const lists = await Promise.all(
        cats.map((c) => xlive.fetchLiveStreams(c.id).catch(() => [])),
      );
      cats.forEach((c, i) => {
        streamsByCategoryId.set(c.id, lists[i] || []);
      });
      log.debug("ensureLiveHubCache() per-category", {
        categories: cats.length,
      });
    } catch (e) {
      cachePromise = null;
      categories = null;
      streamsByCategoryId.clear();
      throw e;
    }
  })();
  return cachePromise;
}

export function clearLiveHubCache() {
  cachePromise = null;
  categories = null;
  streamsByCategoryId.clear();
}
