import * as cred from "./iptv/credentials.js";
import { verify } from "./iptv/xauth.js";
import * as xlive from "./iptv/xlive.js";
import * as xvod from "./iptv/xvod.js";
import * as urls from "./iptv/streamUrls.js";
import {
  eligibleForRecordsList,
  formatTimeRangeIsrael,
} from "./iptv/timeUtils.js";
import { playUrl, stop } from "./player/iptvPlayer.js";
import * as favStore from "./store/favorites.js";
import * as lastWatchStore from "./store/lastWatch.js";
import * as searchHistoryStore from "./store/searchHistory.js";
import * as settingsStore from "./store/settings.js";
import * as liveHubCache from "./store/liveHubCache.js";
import { createLogger } from "./debug/logger.js";

/** Set to `false` to show the sign-in screen again. */
const SKIP_SIGNIN = true;

/**
 * @typedef {{
 *   text: string,
 *   detail?: string,
 *   onSelect: () => void | Promise<void>,
 *   vodRating?: boolean,
 *   kind?: string,
 *   selected?: boolean,
 *   iconUrl?: string,
 *   categoryId?: string,
 *   streamId?: string,
 *   tmdbRatingDisplay?: string,
 *   progress?: number,
 * }} Row
 */

const $ = (id) => document.getElementById(id);
const log = createLogger("app");

const LANG_KEY = "iptv_ui_lang";

const STR = {
  en: {
    login_hello: "Hello! Welcome to",
    login_subtitle: "Please sign in to your account.",
    login_panel_ph: "Panel URL",
    login_user_ph: "Username",
    login_pass_ph: "Password",
    login_btn: "Login",
    login_qr: "Login with QR code",
    login_reset: "Reset password",
    login_err_fill: "Enter panel URL, username, and password.",
    login_qr_toast: "QR login is not available in the web app yet.",
    login_reset_toast: "Use your provider’s site to reset your password.",
    search: "SEARCH",
    favorites: "FAVORITES",
    lastwatch: "LAST WATCH",
    tvguide: "TV GUIDE",
    live: "LIVE",
    records: "RECORDS",
    vod: "VOD",
    vod_series: "SERIES",
    vod_movies: "MOVIES",
    settings: "SETTINGS",
    action_play: "Play",
    action_add_fav: "Add to favorites",
    action_remove_fav: "Remove from favorites",
    action_resume: "Resume",
    action_restart: "Start from beginning",
    action_search_now: "New search",
    action_clear_history: "Clear search history",
    action_clear_favorites: "Clear favorites",
    action_clear_lastwatch: "Clear last watch",
    label_search_results: "Search results",
    label_settings_saved: "Settings updated",
    settings_language: "Language",
    settings_autoplay: "Autoplay on select",
    settings_sidebar_collapsed: "Sidebar collapsed by default",
    settings_panel: "Panel URL",
    settings_account: "Account",
    placeholder_title: "Coming soon",
    placeholder_sub: "This screen is not in the web version yet.",
    profile_title: "Profile",
    profile_logout: "Log out",
    list_empty: "Nothing here.",
    series_label: "Series",
    series_sort_aria: "Reverse episode order",
    series_fav_aria: "Toggle favorite",
    signin_disabled_title: "newtv",
    signin_disabled_sub:
      "Sign-in screen is off for now. Set localStorage keys iptv_base_url, iptv_username, iptv_password (and reload), or set SKIP_SIGNIN = false in app.js to bring the form back.",
  },
  he: {
    login_hello: "שלום! ברוכים הבאים ל",
    login_subtitle: "התחברו לחשבון שלכם.",
    login_panel_ph: "כתובת שרת (URL)",
    login_user_ph: "שם משתמש",
    login_pass_ph: "סיסמה",
    login_btn: "התחברות",
    login_qr: "התחברות עם QR",
    login_reset: "איפוס סיסמה",
    login_err_fill: "מלאו כתובת שרת, משתמש וסיסמה.",
    login_qr_toast: "התחברות QR עדיין לא זמינה בגרסת הווב.",
    login_reset_toast: "לאיפוס סיסמה השתמשו באתר הספק.",
    search: "חיפוש",
    favorites: "מועדפים",
    lastwatch: "צפייה אחרונה",
    tvguide: "מדריך טלוויזיה",
    live: "ישיר",
    records: "הקלטות",
    vod: "VOD",
    vod_series: "תוכניות",
    vod_movies: "סרטים",
    settings: "הגדרות",
    action_play: "נגן",
    action_add_fav: "הוסף למועדפים",
    action_remove_fav: "הסר ממועדפים",
    action_resume: "המשך",
    action_restart: "התחל מהתחלה",
    action_search_now: "חיפוש חדש",
    action_clear_history: "נקה היסטוריית חיפוש",
    action_clear_favorites: "נקה מועדפים",
    action_clear_lastwatch: "נקה צפייה אחרונה",
    label_search_results: "תוצאות חיפוש",
    label_settings_saved: "ההגדרות עודכנו",
    settings_language: "שפה",
    settings_autoplay: "ניגון אוטומטי בעת בחירה",
    settings_sidebar_collapsed: "סרגל צד ממוזער כברירת מחדל",
    settings_panel: "כתובת שרת",
    settings_account: "חשבון",
    placeholder_title: "בקרוב",
    placeholder_sub: "מסך זה עדיין לא בגרסת הווב.",
    profile_title: "פרופיל",
    profile_logout: "התנתקות",
    list_empty: "אין כאן פריטים.",
    series_label: "סדרות",
    series_sort_aria: "הפוך סדר פרקים",
    series_fav_aria: "הוסף או הסר ממועדפים",
    signin_disabled_title: "newtv",
    signin_disabled_sub:
      "מסך ההתחברות כבוי זמנית. הגדירו ב-localStorage: iptv_base_url, iptv_username, iptv_password (ורעננו), או החזירו את מסך ההתחברות עם SKIP_SIGNIN = false ב-app.js.",
  },
};

const SERIES_SORT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 4v16M7 4l3 3M7 4L4 7"/><path d="M17 20V4m0 16l3-3m-3 3l-3-3"/></svg>`;

const ICONS = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
  guide: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  live: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 14 0"/><path d="M2 12a10 10 0 0 1 20 0"/></svg>`,
  records: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h4M6 14h8"/></svg>`,
  vod: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>`,
  /* Heroicons solid cog-6-tooth (MIT) — filled 6-tooth gear */
  settings: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"/></svg>`,
};

const viewLogin = $("view-login");
const viewApp = $("view-app");
const viewPlayer = $("view-player");
const shell = $("shell");
const iptvSidebar = $("iptv-sidebar");
const listEl = $("list");
const mainContent = $("main-content");
const liveHubPreview = $("live-hub-preview");
const liveHubPreviewImg = /** @type {HTMLImageElement | null} */ ($("live-hub-preview-img"));
const liveHubPreviewFallback = $("live-hub-preview-fallback");
const liveHubKicker = $("live-hub-kicker");
const liveHubHeadline = $("live-hub-headline");
const liveHubMeta = $("live-hub-meta");
const liveHubTmdb = $("live-hub-tmdb");
const liveHubVodBg = $("live-hub-vod-bg");
const liveHubDesc = $("live-hub-desc");
const liveHubDuration = /** @type {HTMLParagraphElement | null} */ ($("live-hub-duration"));
const mainContentHeadings = $("main-content-headings");
const contentTitle = $("content-title");
const contentSub = $("content-sub");
const appError = $("app-error");
const appLoading = $("app-loading");
const loginError = $("login-error");
const videoEl = /** @type {HTMLVideoElement} */ ($("video"));
const playerTitle = $("player-title");
const playerError = $("player-error");
const sidebarVodSub = $("sidebar-vod-submenu");
const rowVod = $("row-vod");
const seriesDetailPanel = $("series-detail-panel");
const seriesDetailBg = $("series-detail-bg");
const seriesDetailPoster = $("series-detail-poster");
const seriesDetailKicker = $("series-detail-kicker");
const seriesDetailTitle = $("series-detail-title");
const seriesDetailMeta = $("series-detail-meta");
const seriesDetailPlot = $("series-detail-plot");
const seriesDetailFavBtn = /** @type {HTMLButtonElement | null} */ (
  $("series-detail-fav")
);
const seriesDetailSortBtn = /** @type {HTMLButtonElement | null} */ (
  $("series-detail-sort")
);

/**
 * @typedef {{
 *   title: string,
 *   sub?: string,
 *   load: () => Promise<Row[]>,
 *   seriesDetail?: {
 *     details: object,
 *     selectedSeasonNumber: number,
 *     sortEpisodesAsc: boolean,
 *   },
 * }} StackFrame
 */

/** @type {StackFrame[]} */
let stack = [];

function getTopFrame() {
  return stack[stack.length - 1] || null;
}

function isSeriesDetailFrame() {
  return Boolean(getTopFrame()?.seriesDetail);
}

function isSeriesDetailGridActive() {
  return activeNav === "vod-series" && isSeriesDetailFrame();
}
let focusIndex = 0;
/** @type {'sidebar' | 'content'} */
let focusZone = "sidebar";
let sidebarFocusIndex = 0;
let vodMenuOpen = false;
/** @type {string} */
let activeNav = "live";
let liveHubCategoryId = null;
let vodMoviesHubCategoryId = null;
let vodSeriesHubCategoryId = null;
/** rAF id for coalescing hub category → grid sync (no fixed ms delay). */
let liveHubCategoryFocusRaf = 0;
/** One-shot: after opening Live or VOD hub, focus first tile in the grid. */
let mediaHubFocusFirstTileOnLoad = false;
/** One-shot: after opening series detail or switching season, focus first episode tile. */
let seriesDetailFocusFirstEpisode = false;
/** When leaving VOD series hub for series detail, list index to restore on Back (hub grid tile). */
let vodSeriesHubFocusRestoreIndex = null;
/** Keyboard focus on series detail toolbar: null = list, 0 = favorite, 1 = sort order */
let seriesDetailToolbarIndex = null;
/** Cancels stale short-EPG preview fetches when focus changes. */
let liveHubPreviewEpgSeq = 0;
/** Short EPG programme descriptions prefetched per stream (live hub). */
const liveEpgDescriptionByStreamId = new Map();
const HOME_NAV_STORAGE_KEY = "newtv:lastHomeNav";

/**
 * @param {{ startUnix: number, endUnix: number, description?: string }[]} listings
 * @returns {string}
 */
function pickCurrentEpgDescription(listings) {
  if (!listings?.length) return "";
  const now = Math.floor(Date.now() / 1000);
  let pick = listings.find((l) => l.startUnix <= now && l.endUnix > now);
  if (!pick) pick = listings.find((l) => l.startUnix > now);
  if (!pick) pick = listings[0];
  return (pick?.description || "").trim();
}

/**
 * Prefetches current/next programme descriptions for all channels in the active
 * live hub category (runs with the same load as streams so grid focus is instant).
 */
async function prefetchLiveEpgDescriptionsForCurrentHubCategory() {
  const cats = liveHubCache.getLiveHubCategories();
  if (!cats.length) return;
  if (!liveHubCategoryId || !cats.some((c) => c.id === liveHubCategoryId)) {
    liveHubCategoryId = cats[0].id;
  }
  const streams = liveHubCache.getLiveHubStreamsForCategory(liveHubCategoryId);
  const ids = [...new Set(streams.map((s) => s.streamId).filter(Boolean))];
  if (!ids.length) return;

  const concurrency = 8;
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (id) => {
        if (liveEpgDescriptionByStreamId.has(id)) return;
        try {
          const listings = await xlive.fetchShortEpg(id, 16);
          liveEpgDescriptionByStreamId.set(id, pickCurrentEpgDescription(listings));
        } catch (e) {
          log.debug("prefetch EPG for preview", { id, message: e?.message });
          liveEpgDescriptionByStreamId.set(id, "");
        }
      }),
    );
  }
}
let settings = settingsStore.getSettings();
let currentPlayback = null;
let lastPersistAtMs = 0;

const KEY_BACK = new Set([10009, 461, 27, 8]);

function lang() {
  const fromSettings = settings?.language;
  if (fromSettings === "he" || fromSettings === "en") return fromSettings;
  return localStorage.getItem(LANG_KEY) === "he" ? "he" : "en";
}

function t(key) {
  return STR[lang()][key] || STR.en[key] || key;
}

function showError(el, msg) {
  log.debug("showError()", { target: el?.id, msg: msg || "" });
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function setLoading(on) {
  if (appLoading) appLoading.hidden = !on;
  if (mainContent) mainContent.setAttribute("aria-busy", on ? "true" : "false");
}

function showView(name) {
  viewLogin.hidden = name !== "login";
  viewApp.hidden = name !== "app";
  viewPlayer.hidden = name !== "player";
}

function setShellZone(zone) {
  focusZone = zone;
  shell.classList.toggle("shell--content-focused", zone === "content");
  shell.classList.toggle("shell--sidebar-focused", zone === "sidebar");
  if (zone === "sidebar") {
    seriesDetailToolbarIndex = null;
    seriesDetailFavBtn?.blur();
    seriesDetailSortBtn?.blur();
    applySidebarFocus();
    if (isMediaHubActive()) updateLiveHubPreview();
  } else {
    document
      .querySelectorAll(".sidebar-row--focus")
      .forEach((e) => e.classList.remove("sidebar-row--focus"));
  }
}

function getSidebarFocusables() {
  return Array.from(
    iptvSidebar.querySelectorAll("[data-sidebar-focus]"),
  ).filter((el) => !el.closest("[hidden]"));
}

function applySidebarFocus() {
  const els = getSidebarFocusables();
  if (sidebarFocusIndex >= els.length) sidebarFocusIndex = 0;
  els.forEach((e, i) =>
    e.classList.toggle("sidebar-row--focus", i === sidebarFocusIndex),
  );
  els[sidebarFocusIndex]?.scrollIntoView({ block: "nearest" });
}

function moveSidebarFocus(delta) {
  const els = getSidebarFocusables();
  if (!els.length) return;
  sidebarFocusIndex = (sidebarFocusIndex + delta + els.length) % els.length;
  applySidebarFocus();
}

function setActiveNav(nav) {
  activeNav = nav;
  if (nav === "live" || nav === "vod-movies" || nav === "vod-series") {
    try {
      localStorage.setItem(HOME_NAV_STORAGE_KEY, nav);
    } catch {
      /* ignore storage failures */
    }
  }
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const n = el.getAttribute("data-nav");
    let on = n === nav;
    if (nav === "vod-movies" && n === "vod") on = true;
    if (nav === "vod-series" && n === "vod") on = true;
    el.classList.toggle("sidebar-row--nav-active", on);
  });
}

function getSavedHomeNav() {
  try {
    const nav = localStorage.getItem(HOME_NAV_STORAGE_KEY);
    if (nav === "vod-movies" || nav === "vod-series" || nav === "live") {
      return nav;
    }
  } catch {
    /* ignore storage failures */
  }
  return "live";
}

function startHomeByNav(nav) {
  if (nav === "vod-movies") {
    startVodMovies();
    return;
  }
  if (nav === "vod-series") {
    startSeries();
    return;
  }
  startLive();
}

function syncVodSubmenu() {
  sidebarVodSub.hidden = !vodMenuOpen;
  iptvSidebar.classList.toggle("iptv-sidebar--vod-open", vodMenuOpen);
}

function attachPlaybackPersistence() {
  if (!currentPlayback) return;
  const pos = Number(videoEl.currentTime || 0);
  const durRaw = Number(videoEl.duration || 0);
  const dur = Number.isFinite(durRaw) ? durRaw : 0;
  lastWatchStore.updatePlaybackPosition(
    currentPlayback.type,
    currentPlayback.id,
    pos,
    dur,
  );
}

function maybePersistPlaybackTick() {
  const now = Date.now();
  if (now - lastPersistAtMs < 4000) return;
  lastPersistAtMs = now;
  attachPlaybackPersistence();
}

async function openPlayer(title, streamUrl, playbackMeta = null) {
  log.debug("openPlayer()", { title, streamUrl, playbackMeta });
  showError(playerError, "");
  playerTitle.textContent = title;
  currentPlayback = playbackMeta;
  if (currentPlayback) {
    lastWatchStore.upsertLastWatch({
      ...currentPlayback,
      title,
      streamUrl,
      positionSec: 0,
      durationSec: 0,
    });
  }
  showView("player");
  try {
    await playUrl(videoEl, streamUrl);
    if (currentPlayback?.positionSec > 5 && Number(videoEl.duration || 0) > 0) {
      videoEl.currentTime = Math.min(
        currentPlayback.positionSec,
        Number(videoEl.duration || 0) - 2,
      );
    }
  } catch (e) {
    log.error("openPlayer() failed", { title, streamUrl, message: e?.message });
    const alt = urls.alternateHttpScheme(streamUrl);
    if (alt) {
      try {
        await playUrl(videoEl, alt);
        return;
      } catch {
        /* fall through */
      }
    }
    showError(playerError, (e && e.message) || String(e));
  }
}

function closePlayer() {
  log.debug("closePlayer()");
  attachPlaybackPersistence();
  stop(videoEl);
  showError(playerError, "");
  currentPlayback = null;
  showView("app");
  requestAnimationFrame(() => {
    if (
      activeNav === "live" &&
      stack.length === 1 &&
      liveHubCache.isLiveHubCacheReady()
    ) {
      void renderFrame({ skipLoading: true });
    } else if (
      (activeNav === "vod-movies" || activeNav === "vod-series") &&
      stack.length === 1
    ) {
      void renderFrame({ skipLoading: true });
    } else {
      void renderFrame();
    }
  });
}

function pushFrame(frame) {
  log.debug("pushFrame()", { title: frame?.title, sub: frame?.sub });
  stack.push(frame);
  focusIndex = 0;
  renderFrame();
}

function popFrame() {
  log.debug("popFrame()", { stackSize: stack.length });
  if (stack.length <= 1) return false;
  stack.pop();
  if (
    vodSeriesHubFocusRestoreIndex != null &&
    activeNav === "vod-series" &&
    stack.length === 1
  ) {
    focusIndex = vodSeriesHubFocusRestoreIndex;
    vodSeriesHubFocusRestoreIndex = null;
  } else {
    focusIndex = 0;
  }
  renderFrame();
  return true;
}

/**
 * @param {{ skipLoading?: boolean }} [options]
 * Use `skipLoading: true` for live hub category switches when data is already cached (no full-screen loading).
 */
async function renderFrame(options = {}) {
  const skipLoading = options.skipLoading === true;
  log.debug("renderFrame()", { stackSize: stack.length, skipLoading });
  const top = stack[stack.length - 1];
  if (!top) return;
  seriesDetailToolbarIndex = null;
  seriesDetailFavBtn?.blur();
  seriesDetailSortBtn?.blur();
  contentTitle.textContent = top.title;
  contentSub.textContent = top.sub || "";
  showError(appError, "");
  if (!skipLoading) {
    setLoading(true);
    listEl.innerHTML = "";
  }
  let rows = [];
  try {
    rows = await top.load();
  } catch (e) {
    log.error("renderFrame() load error", { message: e?.message, title: top?.title });
    showError(appError, (e && e.message) || String(e));
    rows = [];
  } finally {
    if (!skipLoading) setLoading(false);
  }
  renderRows(rows);
  syncMediaHubHeaderVisibility();
  syncSeriesDetailPanel();
  if (mainContentHeadings && isSeriesDetailFrame()) {
    mainContentHeadings.hidden = true;
    mainContentHeadings.setAttribute("aria-hidden", "true");
  }
  if (isMediaHubActive()) {
    updateLiveHubPreview();
    requestAnimationFrame(() => ensureLiveHubCategoryFocusVisible());
  } else if (isSeriesDetailFrame()) {
    requestAnimationFrame(() => ensureLiveHubCategoryFocusVisible());
  }
}

function syncMediaHubHeaderVisibility() {
  const on = isMediaHubActive();
  const hero = $("live-hub-hero");
  const vodFull =
    on && (activeNav === "vod-movies" || activeNav === "vod-series");
  if (mainContent) {
    mainContent.classList.toggle("main-content--vod-fullbg", vodFull);
  }
  if (!vodFull && liveHubVodBg && !isSeriesDetailFrame()) {
    liveHubVodBg.hidden = true;
    liveHubVodBg.style.backgroundImage = "";
  }
  if (hero) {
    hero.hidden = !on;
    hero.setAttribute("aria-hidden", on ? "false" : "true");
    hero.classList.toggle("live-hub-hero--vod", vodFull);
  }
  if (mainContentHeadings) {
    mainContentHeadings.hidden = on;
    mainContentHeadings.setAttribute("aria-hidden", on ? "true" : "false");
  }
}

function renderRows(rows) {
  listEl.innerHTML = "";
  const isMediaHub =
    (activeNav === "live" && stack.length === 1) ||
    (activeNav === "vod-movies" && stack.length === 1) ||
    (activeNav === "vod-series" && stack.length === 1);
  const isSeriesSplit =
    activeNav === "vod-series" && Boolean(getTopFrame()?.seriesDetail);
  if (isMediaHub && mediaHubFocusFirstTileOnLoad) {
    const firstCh = rows.findIndex((r) => r.kind === "live-channel");
    if (firstCh >= 0) focusIndex = firstCh;
    mediaHubFocusFirstTileOnLoad = false;
  }
  if (isSeriesSplit && seriesDetailFocusFirstEpisode) {
    const firstEp = rows.findIndex((r) => r.kind === "live-channel");
    if (firstEp >= 0) focusIndex = firstEp;
    seriesDetailFocusFirstEpisode = false;
  }
  if (rows.length > 0) {
    if (focusIndex < 0) focusIndex = 0;
    else if (focusIndex >= rows.length) focusIndex = rows.length - 1;
  }
  listEl.classList.toggle("content-list--live-hub", isMediaHub);
  listEl.classList.toggle("content-list--series-detail", isSeriesSplit);
  listEl.classList.toggle(
    "content-list--vod-hub",
    (activeNav === "vod-movies" || activeNav === "vod-series") &&
      stack.length === 1,
  );
  mainContent.classList.toggle("main-content--live-hub", isMediaHub);
  let liveCatsWrap = null;
  let liveChannelsWrap = null;
  if (isMediaHub || isSeriesSplit) {
    liveCatsWrap = document.createElement("div");
    liveCatsWrap.className = "live-hub-categories";
    liveChannelsWrap = document.createElement("div");
    liveChannelsWrap.className = "live-hub-channels";
    listEl.append(liveCatsWrap, liveChannelsWrap);
  }
  rows.forEach((row, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "content-list__item";
    if (row.vodRating) b.classList.add("content-list__item--vod-rating");
    if (row.kind) b.classList.add(`content-list__item--${row.kind}`);
    if (row.selected) b.classList.add("content-list__item--selected");
    if (
      i === focusIndex &&
      focusZone === "content" &&
      seriesDetailToolbarIndex === null
    )
      b.classList.add("content-list__item--focus");
    if (row.kind === "live-category" && row.categoryId) {
      b.dataset.liveCategoryId = row.categoryId;
    }
    if (row.kind === "live-channel") {
      b.dataset.liveIconUrl = row.iconUrl ? String(row.iconUrl) : "";
      if (row.streamId) b.dataset.liveStreamId = String(row.streamId);
      const logo = document.createElement("div");
      logo.className = "content-list__item-live-logo";
      if (row.iconUrl) {
        logo.style.backgroundImage = `url("${String(row.iconUrl).replace(/"/g, "%22")}")`;
      } else {
        logo.textContent = row.text.slice(0, 2).toUpperCase();
      }
      if (isSeriesSplit && row.progress != null && row.progress > 0) {
        const pct = Math.round(row.progress * 100);
        const bar = document.createElement("div");
        bar.className = "content-list__item-progress-bar";
        bar.style.setProperty("--series-ep-pct", `${pct}%`);
        const badge = document.createElement("span");
        badge.className = "content-list__item-progress-badge";
        badge.textContent = `${pct}%`;
        logo.append(bar, badge);
      }

      const textWrap = document.createElement("div");
      textWrap.className = "content-list__item-live-text";

      const title = document.createElement("span");
      title.className = "content-list__item-text";
      if (isSeriesSplit && row.kind === "live-channel") {
        title.classList.add("content-list__item-text--series-ep-num");
      }
      title.textContent = row.text;
      textWrap.appendChild(title);

      if (isMediaHub && row.tmdbRatingDisplay != null) {
        b.dataset.previewTmdb = String(row.tmdbRatingDisplay);
      }

      if (isMediaHub && row.detail) {
        b.dataset.previewDesc = row.detail;
      } else if (!isMediaHub && row.detail) {
        const detail = document.createElement("span");
        detail.className = "content-list__item-detail";
        detail.textContent = row.detail;
        textWrap.appendChild(detail);
      }

      b.append(logo, textWrap);
    } else {
      b.innerHTML = row.detail
        ? `<span class="content-list__item-text">${escapeHtml(row.text)}</span><span class="content-list__item-detail">${escapeHtml(row.detail)}</span>`
        : `<span class="content-list__item-text">${escapeHtml(row.text)}</span>`;
    }
    b.addEventListener("click", () => {
      seriesDetailToolbarIndex = null;
      seriesDetailFavBtn?.blur();
      seriesDetailSortBtn?.blur();
      focusIndex = i;
      focusZone = "content";
      setShellZone("content");
      row.onSelect();
      syncListFocusClasses();
    });
    if (
      (isMediaHub || isSeriesSplit) &&
      row.kind === "live-category" &&
      liveCatsWrap
    ) {
      liveCatsWrap.appendChild(b);
    } else if ((isMediaHub || isSeriesSplit) && liveChannelsWrap) {
      liveChannelsWrap.appendChild(b);
    } else {
      listEl.appendChild(b);
    }
  });
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "list__empty";
    p.textContent = t("list_empty");
    listEl.appendChild(p);
  }
}

/**
 * Channel tile used for the live-hub preview: focused grid channel when focus is on
 * the channel grid; otherwise the first channel in the current category (e.g. sidebar
 * or category row focused).
 * @returns {HTMLElement | null}
 */
function getLiveHubPreviewChannelEl() {
  const items = listEl.querySelectorAll(".content-list__item");
  const el = items[focusIndex];
  if (
    focusZone === "content" &&
    el?.classList.contains("content-list__item--live-channel")
  ) {
    return el;
  }
  return listEl.querySelector(
    ".live-hub-channels .content-list__item--live-channel",
  );
}

function getSelectedMediaHubCategoryName() {
  const pill = document.querySelector(
    ".live-hub-categories .content-list__item--selected .content-list__item-text",
  );
  return pill?.textContent?.trim() || "";
}

/**
 * Loads short EPG for the focused live channel and fills the hero description
 * (current or next programme).
 * @param {string} streamId
 * @param {string} fallbackDetail
 * @param {number} epgSeq
 */
async function applyLiveEpgDescriptionToPreview(streamId, fallbackDetail, epgSeq) {
  try {
    const listings = await xlive.fetchShortEpg(streamId, 16);
    if (epgSeq !== liveHubPreviewEpgSeq) return;
    if (!isMediaHubActive() || activeNav !== "live") return;
    const desc = pickCurrentEpgDescription(listings);
    liveEpgDescriptionByStreamId.set(streamId, desc);
    if (liveHubDesc) {
      if (desc) {
        liveHubDesc.textContent = desc;
        liveHubDesc.hidden = false;
      } else if (fallbackDetail) {
        liveHubDesc.textContent = fallbackDetail;
        liveHubDesc.hidden = false;
      } else {
        liveHubDesc.textContent = "";
        liveHubDesc.hidden = true;
      }
    }
  } catch (e) {
    log.debug("applyLiveEpgDescriptionToPreview()", { message: e?.message });
    if (epgSeq !== liveHubPreviewEpgSeq) return;
    if (!isMediaHubActive() || activeNav !== "live") return;
    liveEpgDescriptionByStreamId.set(streamId, "");
    if (liveHubDesc) {
      if (fallbackDetail) {
        liveHubDesc.textContent = fallbackDetail;
        liveHubDesc.hidden = false;
      } else {
        liveHubDesc.textContent = "";
        liveHubDesc.hidden = true;
      }
    }
  }
}

function updateLiveHubPreview() {
  if (!liveHubPreview || !liveHubPreviewImg) return;
  if (!isMediaHubActive()) {
    liveHubPreview.classList.remove("live-hub-preview--has-thumb");
    liveHubPreviewImg.removeAttribute("src");
    liveHubPreviewImg.alt = "";
    liveHubPreviewImg.onload = null;
    liveHubPreviewImg.onerror = null;
    /* Series detail: full-column backdrop is set in syncSeriesDetailPanel — keep it on focus moves */
    if (liveHubVodBg && !isSeriesDetailFrame()) {
      liveHubVodBg.hidden = true;
      liveHubVodBg.style.backgroundImage = "";
    }
    return;
  }
  liveHubPreviewEpgSeq += 1;
  const epgSeq = liveHubPreviewEpgSeq;
  const he = lang() === "he";
  if (liveHubPreviewFallback) {
    if (activeNav === "vod-movies") {
      liveHubPreviewFallback.textContent = he ? "סרטים" : "MOVIES";
    } else if (activeNav === "vod-series") {
      liveHubPreviewFallback.textContent = he ? "סדרות" : "SERIES";
    } else {
      liveHubPreviewFallback.textContent = "LIVE";
    }
  }

  const cat = getSelectedMediaHubCategoryName();
  const chEl = getLiveHubPreviewChannelEl();
  const primary =
    chEl?.querySelector(".content-list__item-text")?.textContent?.trim() || "";
  const detail =
    (chEl?.dataset?.previewDesc || "").trim() ||
    chEl?.querySelector(".content-list__item-detail")?.textContent?.trim() ||
    "";

  if (liveHubKicker) {
    liveHubKicker.textContent =
      cat || (he ? "קטגוריה" : "Category");
  }
  if (liveHubHeadline) {
    liveHubHeadline.textContent =
      primary || cat || contentTitle.textContent || "";
  }

  const y = String(new Date().getFullYear());
  let metaLine = "";
  if (activeNav === "live") {
    metaLine = cat ? `${cat} | ${y}` : `${he ? "שידור חי" : "Live TV"} | ${y}`;
  } else if (activeNav === "vod-movies") {
    metaLine = cat
      ? `${cat} | ${y}`
      : `${he ? "סרטים" : "Movies"} | ${y}`;
  } else if (activeNav === "vod-series") {
    metaLine = cat
      ? `${cat} | ${y}`
      : `${he ? "סדרות" : "Series"} | ${y}`;
  }
  if (liveHubMeta) liveHubMeta.textContent = metaLine;

  if (liveHubTmdb) {
    if (activeNav === "vod-movies") {
      const tmdb = (chEl?.dataset?.previewTmdb || "").trim();
      if (tmdb) {
        liveHubTmdb.textContent = `TMDB ${tmdb}`;
        liveHubTmdb.hidden = false;
      } else {
        liveHubTmdb.textContent = "";
        liveHubTmdb.hidden = true;
      }
    } else {
      liveHubTmdb.textContent = "";
      liveHubTmdb.hidden = true;
    }
  }

  if (liveHubDesc) {
    if (activeNav === "live") {
      const sid = (chEl?.dataset?.liveStreamId || "").trim();
      if (sid) {
        const cached = liveEpgDescriptionByStreamId.get(sid);
        if (cached !== undefined) {
          if (cached) {
            liveHubDesc.textContent = cached;
            liveHubDesc.hidden = false;
          } else if (detail) {
            liveHubDesc.textContent = detail;
            liveHubDesc.hidden = false;
          } else {
            liveHubDesc.textContent = "";
            liveHubDesc.hidden = true;
          }
        } else {
          liveHubDesc.textContent = detail || "";
          liveHubDesc.hidden = !detail;
          void applyLiveEpgDescriptionToPreview(sid, detail, epgSeq);
        }
      } else if (detail) {
        liveHubDesc.textContent = detail;
        liveHubDesc.hidden = false;
      } else {
        liveHubDesc.textContent = "";
        liveHubDesc.hidden = true;
      }
    } else if (detail) {
      liveHubDesc.textContent = detail;
      liveHubDesc.hidden = false;
    } else {
      liveHubDesc.textContent = "";
      liveHubDesc.hidden = true;
    }
  }

  if (liveHubDuration) {
    liveHubDuration.hidden = true;
    liveHubDuration.textContent = "";
  }

  const url = (chEl?.dataset?.liveIconUrl || "").trim();
  const isVodHub =
    activeNav === "vod-movies" || activeNav === "vod-series";
  if (
    chEl?.classList.contains("content-list__item--live-channel") &&
    url.length
  ) {
    if (isVodHub && liveHubVodBg) {
      liveHubVodBg.style.backgroundImage = `url("${String(url).replace(/"/g, "%22")}")`;
      liveHubVodBg.hidden = false;
      liveHubPreview.classList.remove("live-hub-preview--has-thumb");
      liveHubPreviewImg.removeAttribute("src");
      liveHubPreviewImg.alt = "";
      liveHubPreviewImg.onload = null;
      liveHubPreviewImg.onerror = null;
    } else {
      if (liveHubVodBg) {
        liveHubVodBg.hidden = true;
        liveHubVodBg.style.backgroundImage = "";
      }
      liveHubPreview.classList.remove("live-hub-preview--has-thumb");
      liveHubPreviewImg.alt = primary || "";
      liveHubPreviewImg.onload = () => {
        liveHubPreview.classList.add("live-hub-preview--has-thumb");
      };
      liveHubPreviewImg.onerror = () => {
        liveHubPreview.classList.remove("live-hub-preview--has-thumb");
        liveHubPreviewImg.removeAttribute("src");
      };
      liveHubPreviewImg.src = url;
      if (liveHubPreviewImg.complete && liveHubPreviewImg.naturalWidth > 0) {
        liveHubPreview.classList.add("live-hub-preview--has-thumb");
      }
    }
  } else {
    if (liveHubVodBg) {
      liveHubVodBg.hidden = true;
      liveHubVodBg.style.backgroundImage = "";
    }
    liveHubPreview.classList.remove("live-hub-preview--has-thumb");
    liveHubPreviewImg.removeAttribute("src");
    liveHubPreviewImg.alt = "";
    liveHubPreviewImg.onload = null;
    liveHubPreviewImg.onerror = null;
  }
}

function queueMediaHubCategorySyncFromFocus() {
  if (!isMediaHubActive()) return;
  const items = listEl.querySelectorAll(".content-list__item");
  const el = items[focusIndex];
  if (!el?.classList.contains("content-list__item--live-category")) return;
  if (liveHubCategoryFocusRaf !== 0) {
    cancelAnimationFrame(liveHubCategoryFocusRaf);
    liveHubCategoryFocusRaf = 0;
  }
  liveHubCategoryFocusRaf = requestAnimationFrame(() => {
    liveHubCategoryFocusRaf = 0;
    void applyMediaHubCategoryFromFocusIfNeeded();
  });
}

/**
 * Keeps the focused category pill inside the horizontal strip. TV browsers often
 * do not scroll `.live-hub-categories` correctly with `scrollIntoView` alone.
 */
function ensureLiveHubCategoryFocusVisible() {
  if (!isMediaHubActive() && !isSeriesDetailFrame()) return;
  const items = listEl.querySelectorAll(".content-list__item");
  const el = items[focusIndex];
  if (!el?.classList.contains("content-list__item--live-category")) return;
  const strip = el.closest(".live-hub-categories");
  if (!strip) return;
  const padding = 16;
  const elRect = el.getBoundingClientRect();
  const stripRect = strip.getBoundingClientRect();
  let delta = 0;
  if (elRect.left < stripRect.left + padding) {
    delta = elRect.left - stripRect.left - padding;
  } else if (elRect.right > stripRect.right - padding) {
    delta = elRect.right - stripRect.right + padding;
  }
  if (delta !== 0) strip.scrollLeft += delta;
}

async function applyMediaHubCategoryFromFocusIfNeeded() {
  const items = listEl.querySelectorAll(".content-list__item");
  const el = items[focusIndex];
  if (!el?.classList.contains("content-list__item--live-category")) return;
  const cid = (el.dataset.liveCategoryId || "").trim();
  if (!cid) return;

  if (isLiveHubActive()) {
    if (cid === liveHubCategoryId) return;
    liveHubCategoryId = cid;
    await renderFrame({ skipLoading: true });
  } else if (isVodMoviesHubActive()) {
    if (cid === vodMoviesHubCategoryId) return;
    vodMoviesHubCategoryId = cid;
    await renderFrame({ skipLoading: true });
  } else if (isVodSeriesHubActive()) {
    if (cid === vodSeriesHubCategoryId) return;
    vodSeriesHubCategoryId = cid;
    await renderFrame({ skipLoading: true });
  } else {
    return;
  }

  /* Focus may have moved to another pill while VOD/network load ran — catch up once. */
  const items2 = listEl.querySelectorAll(".content-list__item");
  const el2 = items2[focusIndex];
  if (!el2?.classList.contains("content-list__item--live-category")) return;
  const cid2 = (el2.dataset.liveCategoryId || "").trim();
  if (!cid2 || cid2 === cid) return;
  if (isLiveHubActive() && cid2 !== liveHubCategoryId) {
    void applyMediaHubCategoryFromFocusIfNeeded();
  } else if (isVodMoviesHubActive() && cid2 !== vodMoviesHubCategoryId) {
    void applyMediaHubCategoryFromFocusIfNeeded();
  } else if (isVodSeriesHubActive() && cid2 !== vodSeriesHubCategoryId) {
    void applyMediaHubCategoryFromFocusIfNeeded();
  }
}

/**
 * Series folder: focused season pill drives the episode list (same as selecting it).
 */
function syncSeriesDetailSeasonFromFocus() {
  if (!isSeriesDetailGridActive()) return;
  const top = getTopFrame();
  const sd = top?.seriesDetail;
  if (!sd) return;
  const items = listEl.querySelectorAll(".content-list__item");
  const el = items[focusIndex];
  if (!el?.classList.contains("content-list__item--live-category")) return;
  const cid = (el.dataset.liveCategoryId || "").trim();
  if (!cid) return;
  const n = Number(cid);
  if (Number.isNaN(n)) return;
  if (sd.selectedSeasonNumber === n) return;
  sd.selectedSeasonNumber = n;
  void renderFrame({ skipLoading: true });
}

function syncListFocusClasses() {
  const listFocusOn =
    focusZone === "content" && seriesDetailToolbarIndex === null;
  listEl.querySelectorAll(".content-list__item").forEach((el, i) => {
    el.classList.toggle(
      "content-list__item--focus",
      listFocusOn && i === focusIndex,
    );
  });
  queueMediaHubCategorySyncFromFocus();
  updateLiveHubPreview();
  syncSeriesDetailSeasonFromFocus();
  if (isMediaHubActive()) {
    requestAnimationFrame(() => ensureLiveHubCategoryFocusVisible());
  }
}

function isLiveHubActive() {
  return activeNav === "live" && stack.length === 1;
}

function isVodMoviesHubActive() {
  return activeNav === "vod-movies" && stack.length === 1;
}

function isVodSeriesHubActive() {
  return activeNav === "vod-series" && stack.length === 1;
}

function isMediaHubActive() {
  return (
    isLiveHubActive() || isVodMoviesHubActive() || isVodSeriesHubActive()
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moveListFocus(delta) {
  const items = listEl.querySelectorAll(".content-list__item");
  const n = items.length;
  if (n <= 0) return;
  focusIndex = (focusIndex + delta + n) % n;
  syncListFocusClasses();
  items[focusIndex]?.scrollIntoView({ block: "nearest" });
}

/**
 * When focus is on a category pill, move only along the category row (left/right).
 * @param {number} delta -1 = previous category, +1 = next
 * @returns {"moved" | "at-first" | "at-last" | "not-category"}
 */
function moveLiveHubCategoryHorizontal(delta) {
  const items = Array.from(listEl.querySelectorAll(".content-list__item"));
  if (!items.length) return "not-category";
  if (focusIndex < 0 || focusIndex >= items.length) focusIndex = 0;

  const activeEl = items[focusIndex];
  if (!activeEl?.classList.contains("content-list__item--live-category")) {
    return "not-category";
  }

  const catIndices = items
    .map((el, i) =>
      el.classList.contains("content-list__item--live-category") ? i : -1,
    )
    .filter((i) => i >= 0);
  const pos = catIndices.indexOf(focusIndex);
  if (pos < 0) return "not-category";

  const nextPos = pos + delta;
  if (nextPos < 0) return "at-first";
  if (nextPos >= catIndices.length) return "at-last";

  focusIndex = catIndices[nextPos];
  syncListFocusClasses();
  items[focusIndex]?.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });
  return "moved";
}

/**
 * Spatial move among a subset of indices only (e.g. channel grid).
 * @param {HTMLElement[]} items
 * @param {number} fromIndex
 * @param {"left" | "right" | "up" | "down"} direction
 * @param {number[]} allowedTargets candidate indices (must include only valid targets)
 */
function findBestSpatialTarget(items, fromIndex, direction, allowedTargets) {
  const allow = new Set(allowedTargets);
  const activeEl = items[fromIndex];
  const a = activeEl.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < items.length; i += 1) {
    if (i === fromIndex || !allow.has(i)) continue;
    const r = items[i].getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dx = x - ax;
    const dy = y - ay;
    if (direction === "left" && dx >= -2) continue;
    if (direction === "right" && dx <= 2) continue;
    if (direction === "up" && dy >= -2) continue;
    if (direction === "down" && dy <= 2) continue;
    const primary =
      direction === "left" || direction === "right" ? Math.abs(dx) : Math.abs(dy);
    const secondary =
      direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary * 10 + secondary;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function moveLiveHubFocus(direction) {
  /** @type {HTMLElement[]} */
  const items = Array.from(listEl.querySelectorAll(".content-list__item"));
  if (!items.length) return false;
  if (focusIndex < 0 || focusIndex >= items.length) focusIndex = 0;

  const activeEl = items[focusIndex];
  const catIndices = items
    .map((el, i) =>
      el.classList.contains("content-list__item--live-category") ? i : -1,
    )
    .filter((i) => i >= 0);
  const chIndices = items
    .map((el, i) =>
      el.classList.contains("content-list__item--live-channel") ? i : -1,
    )
    .filter((i) => i >= 0);

  /* Category row: left/right = linear; down = enter grid */
  if (activeEl?.classList.contains("content-list__item--live-category")) {
    if (direction === "left" || direction === "right") {
      const d = direction === "left" ? -1 : 1;
      const r = moveLiveHubCategoryHorizontal(d);
      return r === "moved";
    }
    if (direction === "down" && chIndices.length) {
      let best = findBestSpatialTarget(items, focusIndex, "down", chIndices);
      if (best < 0) best = chIndices[0];
      focusIndex = best;
      syncListFocusClasses();
      items[focusIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
      return true;
    }
    if (direction === "up" && isSeriesDetailGridActive() && seriesDetailFavBtn) {
      seriesDetailToolbarIndex = 0;
      syncListFocusClasses();
      updateLiveHubPreview();
      requestAnimationFrame(() => ensureLiveHubCategoryFocusVisible());
      seriesDetailFavBtn.focus();
      return true;
    }
    return false;
  }

  /* Channel grid: move only between channels; top row + up → selected category */
  if (activeEl?.classList.contains("content-list__item--live-channel")) {
    if (!chIndices.length) return false;
    const best = findBestSpatialTarget(items, focusIndex, direction, chIndices);
    if (best >= 0) {
      focusIndex = best;
      syncListFocusClasses();
      items[focusIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
      return true;
    }
    if (direction === "up") {
      let catIdx = items.findIndex(
        (el) =>
          el.classList.contains("content-list__item--live-category") &&
          el.classList.contains("content-list__item--selected"),
      );
      if (catIdx < 0 && catIndices.length) catIdx = catIndices[0];
      if (catIdx >= 0) {
        focusIndex = catIdx;
        syncListFocusClasses();
        items[focusIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
        return true;
      }
    }
    return false;
  }

  return false;
}

function activateListFocus() {
  if (isMediaHubActive()) {
    const items = listEl.querySelectorAll(".content-list__item");
    const el = items[focusIndex];
    if (el?.classList.contains("content-list__item--live-category")) {
      if (liveHubCategoryFocusRaf !== 0) {
        cancelAnimationFrame(liveHubCategoryFocusRaf);
        liveHubCategoryFocusRaf = 0;
      }
      void applyMediaHubCategoryFromFocusIfNeeded();
    }
  }
  listEl.querySelectorAll(".content-list__item")[focusIndex]?.click();
}

/* ——— Sections ——— */

function buildLiveHubRows() {
  const cats = liveHubCache.getLiveHubCategories();
  if (!cats.length) return [];
  if (!liveHubCategoryId || !cats.some((c) => c.id === liveHubCategoryId)) {
    liveHubCategoryId = cats[0].id;
  }
  const streams = liveHubCache.getLiveHubStreamsForCategory(liveHubCategoryId);
  /** @type {Row[]} */
  const rows = cats.map((c) => ({
    text: c.name,
    kind: "live-category",
    categoryId: c.id,
    selected: c.id === liveHubCategoryId,
    onSelect: () => {},
  }));
  rows.push(
    ...streams.map((s) => ({
      text: s.name,
      detail: s.tvArchive ? (lang() === "he" ? "ארכיון" : "Catch-up") : "",
      kind: "live-channel",
      iconUrl: s.iconUrl || "",
      streamId: s.streamId,
      onSelect: () => openLiveChannelActions(s),
    })),
  );
  return rows;
}

async function buildVodMoviesHubRows() {
  const cats = await xvod.fetchVodCategories();
  if (!cats.length) return [];
  if (
    !vodMoviesHubCategoryId ||
    !cats.some((c) => c.id === vodMoviesHubCategoryId)
  ) {
    vodMoviesHubCategoryId = cats[0].id;
  }
  const movies = await xvod.fetchVodStreams(vodMoviesHubCategoryId);
  /** @type {Row[]} */
  const rows = cats.map((c) => ({
    text: c.name,
    kind: "live-category",
    categoryId: c.id,
    selected: c.id === vodMoviesHubCategoryId,
    onSelect: () => {},
  }));
  rows.push(
    ...movies.map((m) => ({
      text: m.name,
      detail: m.plot
        ? m.plot.slice(0, 160) + (m.plot.length > 160 ? "…" : "")
        : m.containerExtension || "",
      kind: "live-channel",
      iconUrl: m.coverUrl || "",
      vodRating: m.tmdbRating != null,
      tmdbRatingDisplay:
        m.tmdbRating != null ? m.tmdbRating.toFixed(1) : undefined,
      onSelect: () => openVodMovieActions(m),
    })),
  );
  return rows;
}

async function buildSeriesHubRows() {
  const cats = await xvod.fetchSeriesCategories();
  if (!cats.length) return [];
  if (
    !vodSeriesHubCategoryId ||
    !cats.some((c) => c.id === vodSeriesHubCategoryId)
  ) {
    vodSeriesHubCategoryId = cats[0].id;
  }
  const shows = await xvod.fetchSeries(vodSeriesHubCategoryId);
  /** @type {Row[]} */
  const rows = cats.map((c) => ({
    text: c.name,
    kind: "live-category",
    categoryId: c.id,
    selected: c.id === vodSeriesHubCategoryId,
    onSelect: () => {},
  }));
  rows.push(
    ...shows.map((s) => ({
      text: s.name,
      detail: s.plot
        ? s.plot.slice(0, 80) + (s.plot.length > 80 ? "…" : "")
        : "",
      kind: "live-channel",
      iconUrl: s.coverUrl || "",
      onSelect: () => void openSeriesDetail(s.seriesId, s.name),
    })),
  );
  return rows;
}

function startNoSessionHome() {
  log.warn("startNoSessionHome()");
  stack = [];
  setActiveNav("live");
  pushFrame({
    title: t("signin_disabled_title"),
    sub: t("signin_disabled_sub"),
    load: async () => [],
  });
}

function startLive() {
  log.debug("startLive()");
  if (!cred.isLoggedIn()) {
    startNoSessionHome();
    return;
  }
  stack = [];
  liveHubCategoryId = null;
  mediaHubFocusFirstTileOnLoad = true;
  setActiveNav("live");
  pushFrame({
    title: lang() === "he" ? "שידור חי" : "Live Stream",
    sub: lang() === "he" ? "בחרו קטגוריה וערוץ" : "Choose a category and channel",
    load: async () => {
      await liveHubCache.ensureLiveHubCache();
      return buildLiveHubRows();
    },
  });
}

function openLiveCategory(categoryId, name) {
  pushFrame({
    title: name,
    sub: lang() === "he" ? "ערוצים" : "Channels",
    load: async () => {
      await liveHubCache.ensureLiveHubCache();
      let streams = liveHubCache.getLiveHubStreamsForCategory(categoryId);
      if (!streams.length) {
        streams = await xlive.fetchLiveStreams(categoryId);
      }
      return streams.map((s) => ({
        text: s.name,
        detail: s.tvArchive ? (lang() === "he" ? "ארכיון" : "Catch-up") : "",
        onSelect: () => openLiveChannelActions(s),
      }));
    },
  });
}

function openLiveChannelActions(stream) {
  openPlayer(stream.name, urls.liveStreamUrl(stream.streamId), {
    type: "live",
    id: String(stream.streamId),
    title: stream.name,
    categoryId: stream.categoryId || null,
  });
}

function openLiveShortEpg(stream) {
  pushFrame({
    title: stream.name,
    sub: lang() === "he" ? "לוח שידורים קצר" : "Short EPG",
    load: async () => {
      const epg = await xlive.fetchShortEpg(stream.streamId, 12);
      return epg.map((row) => ({
        text: row.title,
        detail: formatTimeRangeIsrael(row.startUnix, row.endUnix),
        onSelect: () => {},
      }));
    },
  });
}

function startVodMovies() {
  log.debug("startVodMovies()");
  if (!cred.isLoggedIn()) {
    startNoSessionHome();
    return;
  }
  stack = [];
  vodMoviesHubCategoryId = null;
  mediaHubFocusFirstTileOnLoad = true;
  setActiveNav("vod-movies");
  pushFrame({
    title: lang() === "he" ? "סרטים" : "Movies",
    sub: lang() === "he" ? "בחרו קטגוריה ותוכן" : "Choose a category and title",
    load: async () => buildVodMoviesHubRows(),
  });
}

function openVodCategory(categoryId, name) {
  pushFrame({
    title: name,
    sub: lang() === "he" ? "סרטים" : "Movies",
    load: async () => {
      const movies = await xvod.fetchVodStreams(categoryId);
      return movies.map((m) => ({
        text:
          m.tmdbRating != null
            ? `TMDB ${m.tmdbRating.toFixed(1)} ${m.name}`
            : m.name,
        vodRating: m.tmdbRating != null,
        detail: m.plot
          ? m.plot.slice(0, 80) + (m.plot.length > 80 ? "…" : "")
          : m.containerExtension,
        onSelect: () => openVodMovieActions(m),
      }));
    },
  });
}

function openVodMovieActions(movie) {
  openPlayer(
    movie.name,
    urls.vodMovieUrl(movie.streamId, movie.containerExtension),
    {
      type: "vod",
      id: String(movie.streamId),
      title: movie.name,
      categoryId: movie.categoryId || null,
    },
  );
}

function startSeries() {
  log.debug("startSeries()");
  if (!cred.isLoggedIn()) {
    startNoSessionHome();
    return;
  }
  stack = [];
  vodSeriesHubCategoryId = null;
  vodSeriesHubFocusRestoreIndex = null;
  mediaHubFocusFirstTileOnLoad = true;
  setActiveNav("vod-series");
  pushFrame({
    title: lang() === "he" ? "סדרות" : "Series",
    sub: lang() === "he" ? "בחרו קטגוריה ותוכן" : "Choose a category and title",
    load: async () => buildSeriesHubRows(),
  });
}

function openSeriesCategory(categoryId, name) {
  pushFrame({
    title: name,
    sub: lang() === "he" ? "סדרות" : "Shows",
    load: async () => {
      const shows = await xvod.fetchSeries(categoryId);
      return shows.map((s) => ({
        text: s.name,
        detail: s.plot
          ? s.plot.slice(0, 80) + (s.plot.length > 80 ? "…" : "")
          : "",
        onSelect: () => void openSeriesDetail(s.seriesId, s.name),
      }));
    },
  });
}

/**
 * @param {{ details: object, selectedSeasonNumber: number, sortEpisodesAsc: boolean }} sd
 * @returns {Row[]}
 */
function buildSeriesDetailRows(sd) {
  const details = /** @type {{ name?: string, seriesId?: string, seasons: { seasonNumber: number, title: string }[], episodesBySeason: Map<number, { episodeId: string, episodeNumber: number, title: string, plot?: string | null, coverUrl?: string | null, containerExtension: string, seasonNumber: number }[]>, coverUrl?: string | null }} */ (
    sd.details
  );
  let { selectedSeasonNumber, sortEpisodesAsc } = sd;
  const he = lang() === "he";
  const lwList = lastWatchStore.listLastWatch();
  /** @type {Row[]} */
  const rows = [];
  const seasonsWithEpisodes = details.seasons
    .filter(
      (se) =>
        (details.episodesBySeason.get(se.seasonNumber) || []).length > 0,
    )
    .slice()
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  if (
    seasonsWithEpisodes.length &&
    !seasonsWithEpisodes.some((s) => s.seasonNumber === selectedSeasonNumber)
  ) {
    selectedSeasonNumber = seasonsWithEpisodes[0].seasonNumber;
    sd.selectedSeasonNumber = selectedSeasonNumber;
  }
  for (const se of seasonsWithEpisodes) {
    rows.push({
      text: se.title,
      kind: "live-category",
      categoryId: String(se.seasonNumber),
      selected: se.seasonNumber === selectedSeasonNumber,
      onSelect: () => {
        const top = getTopFrame();
        if (top?.seriesDetail) {
          top.seriesDetail.selectedSeasonNumber = se.seasonNumber;
          seriesDetailFocusFirstEpisode = true;
          void renderFrame({ skipLoading: true });
        }
      },
    });
  }
  let eps = details.episodesBySeason.get(selectedSeasonNumber) || [];
  eps = eps.slice().sort((a, b) =>
    sortEpisodesAsc
      ? a.episodeNumber - b.episodeNumber
      : b.episodeNumber - a.episodeNumber,
  );
  for (const ep of eps) {
    const lwEp = lwList.find(
      (x) => x.type === "series-episode" && x.id === String(ep.episodeId),
    );
    let progress = 0;
    if (
      lwEp &&
      lwEp.durationSec > 0 &&
      lwEp.positionSec > 0
    ) {
      progress = Math.min(1, lwEp.positionSec / lwEp.durationSec);
    }
    const epLabel = he ? `פרק ${ep.episodeNumber}` : `Episode ${ep.episodeNumber}`;
    rows.push({
      text: epLabel,
      detail: ep.title,
      kind: "live-channel",
      iconUrl: ep.coverUrl || details.coverUrl || "",
      progress: progress > 0.02 ? progress : undefined,
      onSelect: () => openSeriesEpisodeActions(details, ep),
    });
  }
  return rows;
}

function syncSeriesDetailPanel() {
  const top = getTopFrame();
  const sd = top?.seriesDetail;
  if (!seriesDetailPanel) return;
  if (!sd?.details) {
    seriesDetailToolbarIndex = null;
    seriesDetailFavBtn?.blur();
    seriesDetailSortBtn?.blur();
    seriesDetailPanel.hidden = true;
    if (seriesDetailBg) {
      seriesDetailBg.style.backgroundImage = "";
    }
    if (seriesDetailPoster) {
      seriesDetailPoster.style.backgroundImage = "";
    }
    mainContent?.classList.remove("main-content--series-detail");
    mainContent?.classList.remove("main-content--series-detail-fullbg");
    const vodHubRoot =
      (activeNav === "vod-movies" || activeNav === "vod-series") &&
      stack.length === 1;
    /* VOD hub root repaints backdrop in updateLiveHubPreview(); avoid wiping it here */
    if (liveHubVodBg && !vodHubRoot) {
      liveHubVodBg.hidden = true;
      liveHubVodBg.style.backgroundImage = "";
    }
    return;
  }
  const details = /** @type {{ name?: string, seriesId?: string, plot?: string | null, genre?: string | null, coverUrl?: string | null }} */ (
    sd.details
  );
  seriesDetailPanel.hidden = false;
  mainContent?.classList.add("main-content--series-detail");
  mainContent?.classList.add("main-content--series-detail-fullbg");
  const cover = (details.coverUrl || "").trim();
  const esc = cover ? String(cover).replace(/"/g, "%22") : "";
  /* Same full-column dimmed poster layer as VOD hub */
  if (esc && liveHubVodBg) {
    liveHubVodBg.style.backgroundImage = `url("${esc}")`;
    liveHubVodBg.hidden = false;
  } else if (liveHubVodBg) {
    liveHubVodBg.hidden = true;
    liveHubVodBg.style.backgroundImage = "";
  }
  if (seriesDetailBg) {
    seriesDetailBg.style.backgroundImage = "";
  }
  if (esc && seriesDetailPoster) {
    seriesDetailPoster.style.backgroundImage = `url("${esc}")`;
  } else if (seriesDetailPoster) {
    seriesDetailPoster.style.backgroundImage = "";
  }
  if (seriesDetailKicker) seriesDetailKicker.textContent = t("series_label");
  if (seriesDetailTitle) seriesDetailTitle.textContent = details.name || "";
  if (seriesDetailMeta) {
    const g = (details.genre || "").trim();
    seriesDetailMeta.textContent = g;
    seriesDetailMeta.hidden = !g;
  }
  if (seriesDetailPlot) {
    const p = (details.plot || "").trim();
    seriesDetailPlot.textContent = p;
    seriesDetailPlot.hidden = !p;
  }
  if (seriesDetailSortBtn) {
    seriesDetailSortBtn.setAttribute("aria-label", t("series_sort_aria"));
    seriesDetailSortBtn.title = t("series_sort_aria");
  }
  if (seriesDetailFavBtn) {
    seriesDetailFavBtn.setAttribute("aria-label", t("series_fav_aria"));
    seriesDetailFavBtn.title = t("series_fav_aria");
  }
  updateSeriesDetailFavButton();
}

function updateSeriesDetailFavButton() {
  const top = getTopFrame();
  const id = /** @type {{ seriesId?: string }} */ (top?.seriesDetail?.details)
    ?.seriesId;
  if (!seriesDetailFavBtn || !id) return;
  const isFav = favStore.isFavorite("series", String(id));
  seriesDetailFavBtn.classList.toggle("series-detail-panel__icon-btn--active", isFav);
}

async function openSeriesDetail(seriesId, name) {
  setLoading(true);
  showError(appError, "");
  let details;
  try {
    details = await xvod.fetchSeriesDetails(seriesId);
  } catch (e) {
    showError(appError, (e && e.message) || String(e));
    setLoading(false);
    return;
  }
  setLoading(false);
  const seasons = details.seasons
    .filter(
      (se) =>
        (details.episodesBySeason.get(se.seasonNumber) || []).length > 0,
    )
    .slice()
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  const firstSeason = seasons[0]?.seasonNumber ?? 0;
  if (isVodSeriesHubActive()) {
    const items = listEl.querySelectorAll(".content-list__item");
    const fel = items[focusIndex];
    if (fel?.classList.contains("content-list__item--live-channel")) {
      vodSeriesHubFocusRestoreIndex = focusIndex;
    } else {
      vodSeriesHubFocusRestoreIndex = null;
    }
  } else {
    vodSeriesHubFocusRestoreIndex = null;
  }
  seriesDetailFocusFirstEpisode = true;
  pushFrame({
    title: details.name || name,
    sub: lang() === "he" ? "פרקים" : "Episodes",
    seriesDetail: {
      details,
      selectedSeasonNumber: firstSeason,
      sortEpisodesAsc: true,
    },
    load: async () => {
      const top = getTopFrame();
      const sd = top?.seriesDetail;
      if (!sd) return [];
      return buildSeriesDetailRows(sd);
    },
  });
}

function openSeriesEpisodeActions(details, ep) {
  const title = `${details.name} — ${ep.title}`;
  const streamUrl = urls.seriesEpisodeUrl(ep.episodeId, ep.containerExtension);
  pushFrame({
    title,
    sub: ep.plot || (lang() === "he" ? "פרק" : "Episode"),
    load: async () => [
      {
        text: t("action_play"),
        onSelect: () =>
          openPlayer(title, streamUrl, {
            type: "series-episode",
            id: String(ep.episodeId),
            title,
            seasonNumber: ep.seasonNumber,
          }),
      },
    ],
  });
}

function startRecords() {
  log.debug("startRecords()");
  if (!cred.isLoggedIn()) {
    startNoSessionHome();
    return;
  }
  stack = [];
  setActiveNav("records");
  const allLabel =
    lang() === "he" ? "כל הערוצים עם ארכיון" : "All archive channels";
  pushFrame({
    title: lang() === "he" ? "הקלטות" : "Records",
    sub: lang() === "he" ? "בחר קטגוריה" : "Choose category",
    load: async () => {
      const cats = await xlive.fetchLiveCategories();
      /** @type {Row[]} */
      const rows = [
        {
          text: allLabel,
          onSelect: () => openCatchupStreams(null, allLabel),
        },
      ];
      cats.forEach((c) =>
        rows.push({
          text: c.name,
          onSelect: () => openCatchupStreams(c.id, c.name),
        }),
      );
      return rows;
    },
  });
}

function openCatchupStreams(categoryId, title) {
  pushFrame({
    title,
    sub: lang() === "he" ? "ערוצים" : "Channels",
    load: async () => {
      const streams = await xlive.fetchTvArchiveStreamsForCategory(categoryId);
      return streams.map((s) => ({
        text: s.name,
        onSelect: () => openCatchupEpg(s),
      }));
    },
  });
}

function openCatchupEpg(stream) {
  pushFrame({
    title: stream.name,
    sub: lang() === "he" ? "תוכניות קודמות" : "Past programmes",
    load: async () => {
      const listings = await xlive.fetchArchiveEpgTable(stream.streamId);
      const now = Math.floor(Date.now() / 1000);
      const past = listings
        .filter((e) => eligibleForRecordsList(e.endUnix, now))
        .sort((a, b) => b.startUnix - a.startUnix);
      return past.map((e) => ({
        text: e.title,
        detail: formatTimeRangeIsrael(e.startUnix, e.endUnix),
        onSelect: () => {
          const u = urls.timeshiftStreamUrl(
            stream.streamId,
            e.startUnix,
            e.endUnix,
            e.startRaw,
            e.endRaw,
          );
          openPlayer(e.title, u, {
            type: "record",
            id: `${stream.streamId}:${e.startUnix}`,
            title: e.title,
            streamId: String(stream.streamId),
            startUnix: e.startUnix,
            endUnix: e.endUnix,
          });
        },
      }));
    },
  });
}

async function runSearchFlow(initialQuery) {
  let query = String(initialQuery || "").trim();
  if (!query) {
    const q = globalThis.prompt?.(
      lang() === "he" ? "חיפוש" : "Search",
      "",
    );
    query = String(q || "").trim();
  }
  if (!query) return;
  searchHistoryStore.pushSearchQuery(query);
  setLoading(true);
  showError(appError, "");
  try {
    const [live, vod, series] = await Promise.all([
      xlive.fetchAllLiveStreamsForSearch().catch(() => []),
      xvod.fetchAllVodStreamsForSearch().catch(() => []),
      xvod.fetchAllSeriesForSearch().catch(() => []),
    ]);
    const qLower = query.toLowerCase();
    const liveRows = live
      .filter((x) => String(x.name || "").toLowerCase().includes(qLower))
      .slice(0, 30)
      .map((x) => ({
        text: `[LIVE] ${x.name}`,
        detail: x.categoryId || "",
        onSelect: () => openLiveChannelActions(x),
      }));
    const vodRows = vod
      .filter((x) => String(x.name || "").toLowerCase().includes(qLower))
      .slice(0, 30)
      .map((x) => ({
        text: `[VOD] ${x.name}`,
        detail: x.plot ? x.plot.slice(0, 80) : "",
        onSelect: () => openVodMovieActions(x),
      }));
    const seriesRows = series
      .filter((x) => String(x.name || "").toLowerCase().includes(qLower))
      .slice(0, 30)
      .map((x) => ({
        text: `[SERIES] ${x.name}`,
        detail: x.plot ? x.plot.slice(0, 80) : "",
        onSelect: () => void openSeriesDetail(x.seriesId, x.name),
      }));
    const resultRows = [
      {
        text: t("action_search_now"),
        onSelect: () => runSearchFlow(""),
      },
      ...liveRows,
      ...vodRows,
      ...seriesRows,
    ];
    pushFrame({
      title: t("label_search_results"),
      sub: `"${query}"`,
      load: async () => resultRows,
    });
  } finally {
    setLoading(false);
  }
}

function startSearch() {
  log.debug("startSearch()");
  stack = [];
  setActiveNav("search");
  pushFrame({
    title: t("search"),
    sub: lang() === "he" ? "היסטוריה וחיפוש" : "History and search",
    load: async () => {
      const history = searchHistoryStore.listSearchHistory();
      /** @type {Row[]} */
      const rows = [
        {
          text: t("action_search_now"),
          onSelect: () => runSearchFlow(""),
        },
      ];
      for (const q of history) {
        rows.push({
          text: q,
          onSelect: () => runSearchFlow(q),
        });
      }
      rows.push({
        text: t("action_clear_history"),
        onSelect: () => {
          searchHistoryStore.clearSearchHistory();
          renderFrame();
        },
      });
      return rows;
    },
  });
}

function startFavorites() {
  log.debug("startFavorites()");
  stack = [];
  setActiveNav("favorites");
  pushFrame({
    title: t("favorites"),
    sub: lang() === "he" ? "כל המועדפים" : "All favorites",
    load: async () => {
      const all = favStore.listFavorites();
      /** @type {Row[]} */
      const rows = all.map((f) => ({
        text: `[${String(f.type || "").toUpperCase()}] ${f.title || f.id}`,
        onSelect: () => openFavoriteItem(f),
      }));
      rows.push({
        text: t("action_clear_favorites"),
        onSelect: () => {
          favStore.clearFavorites();
          renderFrame();
        },
      });
      return rows;
    },
  });
}

function openFavoriteItem(f) {
  if (f.type === "live") {
    openPlayer(
      f.title || f.id,
      urls.liveStreamUrl(f.streamId || f.id),
      { type: "live", id: String(f.streamId || f.id), title: f.title || f.id },
    );
    return;
  }
  if (f.type === "vod") {
    openPlayer(
      f.title || f.id,
      urls.vodMovieUrl(f.streamId || f.id, f.ext || "mp4"),
      { type: "vod", id: String(f.streamId || f.id), title: f.title || f.id },
    );
    return;
  }
  if (f.type === "series") {
    openSeriesDetail(String(f.seriesId || f.id), f.title || String(f.id));
    return;
  }
}

function startLastWatch() {
  log.debug("startLastWatch()");
  stack = [];
  setActiveNav("lastwatch");
  pushFrame({
    title: t("lastwatch"),
    sub: lang() === "he" ? "המשך צפייה" : "Continue watching",
    load: async () => {
      const all = lastWatchStore.listLastWatch();
      const rows = all.map((x) => ({
        text: x.title || x.id,
        detail:
          x.positionSec > 0
            ? `${lang() === "he" ? "התקדמות" : "Progress"}: ${Math.floor(
                x.positionSec,
              )}s`
            : "",
        onSelect: () => openLastWatchActions(x),
      }));
      rows.push({
        text: t("action_clear_lastwatch"),
        onSelect: () => {
          lastWatchStore.clearLastWatch();
          renderFrame();
        },
      });
      return rows;
    },
  });
}

function openLastWatchActions(item) {
  pushFrame({
    title: item.title || item.id,
    sub: lang() === "he" ? "בחירה" : "Select action",
    load: async () => [
      {
        text: t("action_resume"),
        onSelect: () =>
          openPlayer(item.title || item.id, item.streamUrl, {
            ...item,
            positionSec: item.positionSec || 0,
          }),
      },
      {
        text: t("action_restart"),
        onSelect: () =>
          openPlayer(item.title || item.id, item.streamUrl, {
            ...item,
            positionSec: 0,
          }),
      },
    ],
  });
}

function startTvGuide() {
  log.debug("startTvGuide()");
  stack = [];
  setActiveNav("tvguide");
  pushFrame({
    title: t("tvguide"),
    sub: lang() === "he" ? "בחר ערוץ להצגת EPG" : "Choose a channel for EPG",
    load: async () => {
      const streams = await xlive.fetchAllLiveStreams().catch(() => []);
      const rows = streams.slice(0, 200).map((s) => ({
        text: s.name,
        onSelect: () => openTvGuideChannel(s),
      }));
      return rows;
    },
  });
}

function openTvGuideChannel(stream) {
  pushFrame({
    title: stream.name,
    sub: lang() === "he" ? "לוח שידורים מלא" : "Full EPG",
    load: async () => {
      const epg = await xlive.fetchFullEpg(stream.streamId, 80).catch(() => []);
      return epg.map((row) => ({
        text: row.title,
        detail: formatTimeRangeIsrael(row.startUnix, row.endUnix),
        onSelect: () => {},
      }));
    },
  });
}

function startSettings() {
  log.debug("startSettings()");
  stack = [];
  setActiveNav("settings");
  pushFrame({
    title: t("settings"),
    sub: lang() === "he" ? "אפשרויות מערכת" : "System options",
    load: async () => {
      const s = settingsStore.getSettings();
      settings = s;
      return [
        {
          text: `${t("settings_language")}: ${s.language.toUpperCase()}`,
          onSelect: () => {
            const nextLang = s.language === "he" ? "en" : "he";
            settings = settingsStore.updateSettings({ language: nextLang });
            localStorage.setItem(LANG_KEY, nextLang);
            applyLoginI18n();
            applySidebarI18n();
            renderFrame();
          },
        },
        {
          text: `${t("settings_autoplay")}: ${
            s.autoplayOnSelect ? "ON" : "OFF"
          }`,
          onSelect: () => {
            settings = settingsStore.updateSettings({
              autoplayOnSelect: !s.autoplayOnSelect,
            });
            renderFrame();
          },
        },
        {
          text: `${t("settings_sidebar_collapsed")}: ${
            s.sidebarCollapsedByDefault ? "ON" : "OFF"
          }`,
          onSelect: () => {
            settings = settingsStore.updateSettings({
              sidebarCollapsedByDefault: !s.sidebarCollapsedByDefault,
            });
            renderFrame();
          },
        },
        { text: `${t("settings_panel")}: ${cred.baseUrl() || "-"}`, onSelect: () => {} },
        {
          text: `${t("settings_account")}: ${cred.usernameRaw() || "-"}`,
          onSelect: () => {},
        },
      ];
    },
  });
}

function startProfile() {
  log.debug("startProfile()");
  stack = [];
  setActiveNav("profile");
  const name = cred.usernameRaw().trim() || t("profile_title");
  pushFrame({
    title: t("profile_title"),
    sub: name,
    load: async () => [
      {
        text: t("profile_logout"),
        onSelect: () => {
          cred.clearSession();
          liveHubCache.clearLiveHubCache();
          liveEpgDescriptionByStreamId.clear();
          stack = [];
          vodMenuOpen = false;
          syncVodSubmenu();
          startNoSessionHome();
          setShellZone("content");
          focusIndex = 0;
          syncListFocusClasses();
        },
      },
    ],
  });
}

function handleSidebarNav(nav) {
  log.debug("handleSidebarNav()", { nav });
  if (nav === "vod") {
    vodMenuOpen = !vodMenuOpen;
    syncVodSubmenu();
    applySidebarFocus();
    return;
  }
  vodMenuOpen = false;
  syncVodSubmenu();

  switch (nav) {
    case "profile":
      startProfile();
      break;
    case "search":
      startSearch();
      break;
    case "favorites":
      startFavorites();
      break;
    case "lastwatch":
      startLastWatch();
      break;
    case "tvguide":
      startTvGuide();
      break;
    case "settings":
      startSettings();
      break;
    case "live":
      startLive();
      break;
    case "records":
      startRecords();
      break;
    case "vod-series":
      startSeries();
      break;
    case "vod-movies":
      startVodMovies();
      break;
    default:
      return;
  }
  setShellZone("content");
  focusIndex = 0;
  syncListFocusClasses();
}

function activateSidebarSelection() {
  log.debug("activateSidebarSelection()", { sidebarFocusIndex });
  const els = getSidebarFocusables();
  const el = els[sidebarFocusIndex];
  const nav = el?.getAttribute("data-nav");
  if (!nav) return;
  if (nav === "vod") {
    handleSidebarNav("vod");
    return;
  }
  handleSidebarNav(nav);
}

function updateClock() {
  const el = $("sidebar-clock");
  if (!el) return;
  const now = new Date();
  const opt = {
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    timeZone: "Asia/Jerusalem",
  };
  try {
    el.textContent = new Intl.DateTimeFormat(
      lang() === "he" ? "he-IL" : "en-US",
      opt,
    ).format(now);
  } catch {
    el.textContent = now.toLocaleString();
  }
}

function applyDocumentTextDirection() {
  document.documentElement.setAttribute("dir", "ltr");
  document.documentElement.setAttribute(
    "lang",
    lang() === "he" ? "he" : "en",
  );
}

function applySidebarI18n() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const k = node.getAttribute("data-i18n");
    if (k) node.textContent = t(k);
  });
  applyDocumentTextDirection();
}

function injectSidebarIcons() {
  iptvSidebar.querySelectorAll("[data-icon]").forEach((wrap) => {
    const name = wrap.getAttribute("data-icon");
    if (name && ICONS[name]) wrap.innerHTML = ICONS[name];
  });
}

function applyLoginI18n() {
  if (SKIP_SIGNIN) return;
  $("login-hello").textContent = t("login_hello");
  $("login-subtitle").textContent = t("login_subtitle");
  $("login-base").placeholder = t("login_panel_ph");
  $("login-user").placeholder = t("login_user_ph");
  $("login-pass").placeholder = t("login_pass_ph");
  $("login-btn").textContent = t("login_btn");
  $("login-qr").textContent = t("login_qr");
  $("login-reset").textContent = t("login_reset");
  const d = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Jerusalem" });
  $("login-build").textContent = `Build: ${d}, web 0.2.1`;
  applyDocumentTextDirection();
}

function bindLogin() {
  if (SKIP_SIGNIN) return;
  const base = $("login-base");
  const user = $("login-user");
  const pass = $("login-pass");
  const btn = $("login-btn");
  const qr = $("login-qr");
  const reset = $("login-reset");

  base.value = cred.baseUrl();
  if (cred.isLoggedIn()) user.value = cred.usernameRaw();

  $("login-lang-he").addEventListener("click", () => {
    localStorage.setItem(LANG_KEY, "he");
    settings = settingsStore.updateSettings({ language: "he" });
    applyLoginI18n();
    applySidebarI18n();
  });
  $("login-lang-en").addEventListener("click", () => {
    localStorage.setItem(LANG_KEY, "en");
    settings = settingsStore.updateSettings({ language: "en" });
    applyLoginI18n();
    applySidebarI18n();
  });

  qr.addEventListener("click", () => {
    showError(loginError, t("login_qr_toast"));
  });
  reset.addEventListener("click", () => {
    showError(loginError, t("login_reset_toast"));
  });

  btn.addEventListener("click", async () => {
    showError(loginError, "");
    const b = base.value.trim();
    const u = user.value.trim();
    const p = pass.value;
    if (!b || !u || !p) {
      showError(loginError, t("login_err_fill"));
      return;
    }
    btn.disabled = true;
    $("login-progress").hidden = false;
    try {
      await verify(b, u, p);
      cred.saveSession(b, u, p);
      showView("app");
      vodMenuOpen = false;
      syncVodSubmenu();
      startHomeByNav(getSavedHomeNav());
      setShellZone("content");
      focusIndex = 0;
      sidebarFocusIndex = getSidebarFocusables().findIndex(
        (e) => e.getAttribute("data-nav") === "live",
      );
      if (sidebarFocusIndex < 0) sidebarFocusIndex = 0;
      applySidebarFocus();
    } catch (e) {
      showError(loginError, (e && e.message) || String(e));
    } finally {
      btn.disabled = false;
      $("login-progress").hidden = true;
    }
  });
}

function bindSidebarPointer() {
  iptvSidebar.addEventListener("click", (e) => {
    const row = e.target.closest("[data-sidebar-focus]");
    if (!row) return;
    const els = getSidebarFocusables();
    const idx = els.indexOf(row);
    if (idx < 0) return;
    log.debug("sidebar click", { nav: row.getAttribute("data-nav"), idx });
    sidebarFocusIndex = idx;
    applySidebarFocus();
    activateSidebarSelection();
  });
}

function bindKeys() {
  document.addEventListener("keydown", (ev) => {
    log.debug("keydown", { key: ev.key, keyCode: ev.keyCode, focusZone });
    if (!viewPlayer.hidden) {
      if (KEY_BACK.has(ev.keyCode)) {
        ev.preventDefault();
        closePlayer();
      }
      return;
    }
    if (viewApp.hidden) return;

    if (focusZone === "sidebar") {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        moveSidebarFocus(1);
        return;
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        moveSidebarFocus(-1);
        return;
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        activateSidebarSelection();
        return;
      }
      if (ev.key === "ArrowRight") {
        const n = listEl.querySelectorAll(".content-list__item").length;
        if (n > 0) {
          ev.preventDefault();
          setShellZone("content");
          syncListFocusClasses();
        }
        return;
      }
      if (KEY_BACK.has(ev.keyCode)) {
        ev.preventDefault();
        /* stay on sidebar at root */
      }
      return;
    }

    /* content */
    const items = listEl.querySelectorAll(".content-list__item");
    const n = items.length;

    if (isSeriesDetailFrame() && seriesDetailToolbarIndex !== null) {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        seriesDetailToolbarIndex = null;
        seriesDetailFavBtn?.blur();
        seriesDetailSortBtn?.blur();
        const all = listEl.querySelectorAll(".content-list__item");
        let catIdx = Array.from(all).findIndex(
          (el) =>
            el.classList.contains("content-list__item--live-category") &&
            el.classList.contains("content-list__item--selected"),
        );
        if (catIdx < 0) {
          catIdx = Array.from(all).findIndex((el) =>
            el.classList.contains("content-list__item--live-category"),
          );
        }
        if (catIdx >= 0) focusIndex = catIdx;
        syncListFocusClasses();
        all[focusIndex]?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
        return;
      }
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        if (seriesDetailToolbarIndex === 1 && seriesDetailFavBtn) {
          seriesDetailToolbarIndex = 0;
          seriesDetailFavBtn.focus();
        } else {
          seriesDetailToolbarIndex = null;
          seriesDetailFavBtn?.blur();
          seriesDetailSortBtn?.blur();
          setShellZone("sidebar");
          applySidebarFocus();
        }
        return;
      }
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        if (seriesDetailToolbarIndex === 0 && seriesDetailSortBtn) {
          seriesDetailToolbarIndex = 1;
          seriesDetailSortBtn.focus();
        }
        return;
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        return;
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        (seriesDetailToolbarIndex === 0
          ? seriesDetailFavBtn
          : seriesDetailSortBtn
        )?.click();
        return;
      }
      if (KEY_BACK.has(ev.keyCode)) {
        ev.preventDefault();
        seriesDetailToolbarIndex = null;
        seriesDetailFavBtn?.blur();
        seriesDetailSortBtn?.blur();
        if (!popFrame()) {
          setShellZone("sidebar");
          applySidebarFocus();
        } else {
          syncListFocusClasses();
        }
        return;
      }
      return;
    }

    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (isMediaHubActive() || isSeriesDetailGridActive()) {
        moveLiveHubFocus("down");
      } else {
        moveListFocus(1);
      }
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (isMediaHubActive() || isSeriesDetailGridActive()) {
        moveLiveHubFocus("up");
      } else {
        moveListFocus(-1);
      }
      return;
    }
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      if (isMediaHubActive() || isSeriesDetailGridActive()) {
        const moved = moveLiveHubFocus("left");
        if (!moved) {
          setShellZone("sidebar");
          applySidebarFocus();
        }
      } else {
        setShellZone("sidebar");
        applySidebarFocus();
      }
      return;
    }
    if (ev.key === "ArrowRight") {
      if (isMediaHubActive() || isSeriesDetailGridActive()) {
        ev.preventDefault();
        moveLiveHubFocus("right");
      }
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      activateListFocus();
      return;
    }
    if (KEY_BACK.has(ev.keyCode)) {
      ev.preventDefault();
      if (!popFrame()) {
        setShellZone("sidebar");
        applySidebarFocus();
      } else {
        syncListFocusClasses();
      }
    }
  });
}

function bindSeriesDetailPanel() {
  const favIcon = document.querySelector("[data-series-fav-icon]");
  const sortIcon = document.querySelector("[data-series-sort-icon]");
  if (favIcon && ICONS.heart) favIcon.innerHTML = ICONS.heart;
  if (sortIcon) sortIcon.innerHTML = SERIES_SORT_ICON;
  seriesDetailFavBtn?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const det = /** @type {{ seriesId?: string, name?: string }} */ (
      getTopFrame()?.seriesDetail?.details
    );
    const id = det?.seriesId;
    if (!id) return;
    favStore.toggleFavorite({
      type: "series",
      id: String(id),
      title: String(det.name || id),
      seriesId: String(id),
    });
    updateSeriesDetailFavButton();
  });
  seriesDetailSortBtn?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const top = getTopFrame();
    if (top?.seriesDetail) {
      top.seriesDetail.sortEpisodesAsc = !top.seriesDetail.sortEpisodesAsc;
      seriesDetailFocusFirstEpisode = true;
      void renderFrame({ skipLoading: true });
    }
  });
}

function boot() {
  log.debug("boot()");
  if (SKIP_SIGNIN) {
    cred.ensureDefaultSession();
  }
  injectSidebarIcons();
  applyLoginI18n();
  applySidebarI18n();
  updateClock();
  setInterval(updateClock, 30_000);

  bindLogin();
  bindSidebarPointer();
  bindKeys();
  bindSeriesDetailPanel();
  videoEl.addEventListener("timeupdate", maybePersistPlaybackTick);
  videoEl.addEventListener("pause", attachPlaybackPersistence);
  videoEl.addEventListener("ended", attachPlaybackPersistence);

  showView("app");
  vodMenuOpen = false;
  syncVodSubmenu();

  if (cred.isLoggedIn()) {
    startHomeByNav(getSavedHomeNav());
    setShellZone(settings.sidebarCollapsedByDefault ? "content" : "sidebar");
    focusIndex = 0;
    sidebarFocusIndex = getSidebarFocusables().findIndex(
      (e) => e.getAttribute("data-nav") === "live",
    );
    if (sidebarFocusIndex < 0) sidebarFocusIndex = 0;
  } else {
    startNoSessionHome();
    setShellZone(settings.sidebarCollapsedByDefault ? "content" : "sidebar");
    focusIndex = 0;
    sidebarFocusIndex = getSidebarFocusables().findIndex(
      (e) => e.getAttribute("data-nav") === "live",
    );
    if (sidebarFocusIndex < 0) sidebarFocusIndex = 0;
  }
}

boot();
