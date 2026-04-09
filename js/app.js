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

/** @typedef {{ text: string, detail?: string, onSelect: () => void | Promise<void>, vodRating?: boolean, kind?: string, selected?: boolean, iconUrl?: string, categoryId?: string }} Row */

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
    signin_disabled_title: "newtv",
    signin_disabled_sub:
      "מסך ההתחברות כבוי זמנית. הגדירו ב-localStorage: iptv_base_url, iptv_username, iptv_password (ורעננו), או החזירו את מסך ההתחברות עם SKIP_SIGNIN = false ב-app.js.",
  },
};

const ICONS = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
  guide: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  live: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 14 0"/><path d="M2 12a10 10 0 0 1 20 0"/></svg>`,
  records: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h4M6 14h8"/></svg>`,
  vod: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
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

/** @type {{ title: string, sub?: string, load: () => Promise<Row[]> }[]} */
let stack = [];
let focusIndex = 0;
/** @type {'sidebar' | 'content'} */
let focusZone = "sidebar";
let sidebarFocusIndex = 0;
let vodMenuOpen = false;
/** @type {string} */
let activeNav = "live";
let liveHubCategoryId = null;
let liveHubCategoryFocusTimer = 0;
/** One-shot: after opening Live hub, focus first channel tile (first row of grid). */
let liveHubFocusFirstChannelOnLoad = false;
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
  appLoading.hidden = !on;
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
    applySidebarFocus();
    if (isLiveHubActive()) updateLiveHubPreview();
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
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const n = el.getAttribute("data-nav");
    let on = n === nav;
    if (nav === "vod-movies" && n === "vod") on = true;
    if (nav === "vod-series" && n === "vod") on = true;
    el.classList.toggle("sidebar-row--nav-active", on);
  });
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
  focusIndex = 0;
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
}

function renderRows(rows) {
  listEl.innerHTML = "";
  const isLiveHub = activeNav === "live" && stack.length === 1;
  if (isLiveHub && liveHubFocusFirstChannelOnLoad) {
    const firstCh = rows.findIndex((r) => r.kind === "live-channel");
    if (firstCh >= 0) focusIndex = firstCh;
    liveHubFocusFirstChannelOnLoad = false;
  }
  listEl.classList.toggle("content-list--live-hub", isLiveHub);
  mainContent.classList.toggle("main-content--live-hub", isLiveHub);
  let liveCatsWrap = null;
  let liveChannelsWrap = null;
  if (isLiveHub) {
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
    if (i === focusIndex && focusZone === "content")
      b.classList.add("content-list__item--focus");
    if (row.kind === "live-category" && row.categoryId) {
      b.dataset.liveCategoryId = row.categoryId;
    }
    if (row.kind === "live-channel") {
      b.dataset.liveIconUrl = row.iconUrl ? String(row.iconUrl) : "";
      const logo = document.createElement("div");
      logo.className = "content-list__item-live-logo";
      if (row.iconUrl) {
        logo.style.backgroundImage = `url("${String(row.iconUrl).replace(/"/g, "%22")}")`;
      } else {
        logo.textContent = row.text.slice(0, 2).toUpperCase();
      }

      const textWrap = document.createElement("div");
      textWrap.className = "content-list__item-live-text";

      const title = document.createElement("span");
      title.className = "content-list__item-text";
      title.textContent = row.text;
      textWrap.appendChild(title);

      if (row.detail) {
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
      focusIndex = i;
      focusZone = "content";
      setShellZone("content");
      syncListFocusClasses();
      row.onSelect();
    });
    if (isLiveHub && row.kind === "live-category" && liveCatsWrap) {
      liveCatsWrap.appendChild(b);
    } else if (isLiveHub && liveChannelsWrap) {
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
  if (isLiveHub) updateLiveHubPreview();
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

function updateLiveHubPreview() {
  if (!liveHubPreview || !liveHubPreviewImg) return;
  if (!isLiveHubActive()) {
    liveHubPreview.hidden = true;
    liveHubPreview.classList.remove("live-hub-preview--has-thumb");
    liveHubPreviewImg.removeAttribute("src");
    liveHubPreviewImg.alt = "";
    liveHubPreviewImg.onload = null;
    liveHubPreviewImg.onerror = null;
    return;
  }
  liveHubPreview.hidden = false;
  const el = getLiveHubPreviewChannelEl();
  const url = (el?.dataset?.liveIconUrl || "").trim();
  if (
    el?.classList.contains("content-list__item--live-channel") &&
    url.length
  ) {
    liveHubPreview.classList.remove("live-hub-preview--has-thumb");
    liveHubPreviewImg.alt =
      el.querySelector(".content-list__item-text")?.textContent?.trim() || "";
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
  } else {
    liveHubPreview.classList.remove("live-hub-preview--has-thumb");
    liveHubPreviewImg.removeAttribute("src");
    liveHubPreviewImg.alt = "";
    liveHubPreviewImg.onload = null;
    liveHubPreviewImg.onerror = null;
  }
}

function queueLiveHubCategorySyncFromFocus() {
  if (!isLiveHubActive()) return;
  const items = listEl.querySelectorAll(".content-list__item");
  const el = items[focusIndex];
  if (!el?.classList.contains("content-list__item--live-category")) return;
  clearTimeout(liveHubCategoryFocusTimer);
  liveHubCategoryFocusTimer = window.setTimeout(() => {
    void applyLiveHubCategoryFromFocusIfNeeded();
  }, 120);
}

async function applyLiveHubCategoryFromFocusIfNeeded() {
  if (!isLiveHubActive()) return;
  const items = listEl.querySelectorAll(".content-list__item");
  const el = items[focusIndex];
  if (!el?.classList.contains("content-list__item--live-category")) return;
  const cid = el.dataset.liveCategoryId;
  if (!cid || cid === liveHubCategoryId) return;
  liveHubCategoryId = cid;
  await renderFrame({ skipLoading: true });
}

function syncListFocusClasses() {
  listEl.querySelectorAll(".content-list__item").forEach((el, i) => {
    el.classList.toggle("content-list__item--focus", i === focusIndex);
  });
  queueLiveHubCategorySyncFromFocus();
  updateLiveHubPreview();
}

function isLiveHubActive() {
  return activeNav === "live" && stack.length === 1;
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
  if (nextPos >= catIndices.length) {
    if (delta > 0) {
      const firstCh = items.findIndex((el) =>
        el.classList.contains("content-list__item--live-channel"),
      );
      if (firstCh >= 0) {
        focusIndex = firstCh;
        syncListFocusClasses();
        items[focusIndex]?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
        return "moved";
      }
    }
    return "at-last";
  }

  focusIndex = catIndices[nextPos];
  syncListFocusClasses();
  items[focusIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
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
  if (isLiveHubActive()) {
    const items = listEl.querySelectorAll(".content-list__item");
    const el = items[focusIndex];
    if (el?.classList.contains("content-list__item--live-category")) {
      clearTimeout(liveHubCategoryFocusTimer);
      void applyLiveHubCategoryFromFocusIfNeeded();
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
      onSelect: () => openLiveChannelActions(s),
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
  liveHubFocusFirstChannelOnLoad = true;
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
  const favItem = {
    type: "live",
    id: String(stream.streamId),
    title: stream.name,
    streamId: String(stream.streamId),
  };
  pushFrame({
    title: stream.name,
    sub: lang() === "he" ? "פעולות" : "Actions",
    load: async () => {
      const isFav = favStore.isFavorite("live", String(stream.streamId));
      return [
        {
          text: t("action_play"),
          onSelect: () =>
            openPlayer(stream.name, urls.liveStreamUrl(stream.streamId), {
              type: "live",
              id: String(stream.streamId),
              title: stream.name,
              categoryId: stream.categoryId || null,
            }),
        },
        {
          text: isFav ? t("action_remove_fav") : t("action_add_fav"),
          onSelect: () => {
            favStore.toggleFavorite(favItem);
            renderFrame();
          },
        },
        {
          text: lang() === "he" ? "EPG קצר" : "Short EPG",
          onSelect: () => openLiveShortEpg(stream),
        },
      ];
    },
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
  setActiveNav("vod-movies");
  pushFrame({
    title: lang() === "he" ? "סרטים" : "Movies",
    sub: lang() === "he" ? "קטגוריות" : "Categories",
    load: async () => {
      const cats = await xvod.fetchVodCategories();
      return cats.map((c) => ({
        text: c.name,
        onSelect: () => openVodCategory(c.id, c.name),
      }));
    },
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
  const favItem = {
    type: "vod",
    id: String(movie.streamId),
    title: movie.name,
    streamId: String(movie.streamId),
    ext: movie.containerExtension,
  };
  pushFrame({
    title: movie.name,
    sub: movie.plot || (lang() === "he" ? "סרט VOD" : "VOD movie"),
    load: async () => {
      const isFav = favStore.isFavorite("vod", String(movie.streamId));
      return [
        {
          text: t("action_play"),
          onSelect: () =>
            openPlayer(
              movie.name,
              urls.vodMovieUrl(movie.streamId, movie.containerExtension),
              {
                type: "vod",
                id: String(movie.streamId),
                title: movie.name,
                categoryId: movie.categoryId || null,
              },
            ),
        },
        {
          text: isFav ? t("action_remove_fav") : t("action_add_fav"),
          onSelect: () => {
            favStore.toggleFavorite(favItem);
            renderFrame();
          },
        },
      ];
    },
  });
}

function startSeries() {
  log.debug("startSeries()");
  if (!cred.isLoggedIn()) {
    startNoSessionHome();
    return;
  }
  stack = [];
  setActiveNav("vod-series");
  pushFrame({
    title: lang() === "he" ? "סדרות" : "Series",
    sub: lang() === "he" ? "קטגוריות" : "Categories",
    load: async () => {
      const cats = await xvod.fetchSeriesCategories();
      return cats.map((c) => ({
        text: c.name,
        onSelect: () => openSeriesCategory(c.id, c.name),
      }));
    },
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
        onSelect: () => openSeriesShowActions(s),
      }));
    },
  });
}

function openSeriesShowActions(show) {
  const favItem = {
    type: "series",
    id: String(show.seriesId),
    title: show.name,
    seriesId: String(show.seriesId),
  };
  pushFrame({
    title: show.name,
    sub: show.plot || (lang() === "he" ? "סדרה" : "Series"),
    load: async () => {
      const isFav = favStore.isFavorite("series", String(show.seriesId));
      return [
        {
          text: lang() === "he" ? "פתח עונות/פרקים" : "Open seasons / episodes",
          onSelect: () => openSeriesDetail(show.seriesId, show.name),
        },
        {
          text: isFav ? t("action_remove_fav") : t("action_add_fav"),
          onSelect: () => {
            favStore.toggleFavorite(favItem);
            renderFrame();
          },
        },
      ];
    },
  });
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
  pushFrame({
    title: details.name || name,
    sub: lang() === "he" ? "פרקים" : "Episodes",
    load: async () => {
      const rows = [];
      const seasons = details.seasons
        .slice()
        .sort((a, b) => a.seasonNumber - b.seasonNumber);
      for (const se of seasons) {
        const eps = details.episodesBySeason.get(se.seasonNumber) || [];
        for (const ep of eps) {
          rows.push({
            text: `${se.title} · E${ep.episodeNumber} — ${ep.title}`,
            detail: ep.plot ? ep.plot.slice(0, 60) + "…" : "",
            onSelect: () => openSeriesEpisodeActions(details, ep),
          });
        }
      }
      return rows;
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
        onSelect: () => openSeriesShowActions(x),
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

function applySidebarI18n() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const k = node.getAttribute("data-i18n");
    if (k) node.textContent = t(k);
  });
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
      startLive();
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

    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (isLiveHubActive()) {
        moveLiveHubFocus("down");
      } else {
        moveListFocus(1);
      }
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (isLiveHubActive()) {
        moveLiveHubFocus("up");
      } else {
        moveListFocus(-1);
      }
      return;
    }
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      if (isLiveHubActive()) {
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
      if (isLiveHubActive()) {
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
  videoEl.addEventListener("timeupdate", maybePersistPlaybackTick);
  videoEl.addEventListener("pause", attachPlaybackPersistence);
  videoEl.addEventListener("ended", attachPlaybackPersistence);

  showView("app");
  vodMenuOpen = false;
  syncVodSubmenu();

  if (cred.isLoggedIn()) {
    startLive();
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
