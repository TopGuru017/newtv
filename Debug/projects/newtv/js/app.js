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

/** Set to `false` to show the sign-in screen again. */
const SKIP_SIGNIN = true;

/** @typedef {{ text: string, detail?: string, onSelect: () => void | Promise<void>, vodRating?: boolean }} Row */

const $ = (id) => document.getElementById(id);

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

const KEY_BACK = new Set([10009, 461, 27, 8]);

function lang() {
  return localStorage.getItem(LANG_KEY) === "he" ? "he" : "en";
}

function t(key) {
  return STR[lang()][key] || STR.en[key] || key;
}

function showError(el, msg) {
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

async function openPlayer(title, streamUrl) {
  showError(playerError, "");
  playerTitle.textContent = title;
  showView("player");
  try {
    await playUrl(videoEl, streamUrl);
  } catch (e) {
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
  stop(videoEl);
  showError(playerError, "");
  showView("app");
  requestAnimationFrame(() => renderFrame());
}

function pushFrame(frame) {
  stack.push(frame);
  focusIndex = 0;
  renderFrame();
}

function popFrame() {
  if (stack.length <= 1) return false;
  stack.pop();
  focusIndex = 0;
  renderFrame();
  return true;
}

async function renderFrame() {
  const top = stack[stack.length - 1];
  if (!top) return;
  contentTitle.textContent = top.title;
  contentSub.textContent = top.sub || "";
  showError(appError, "");
  setLoading(true);
  listEl.innerHTML = "";
  let rows = [];
  try {
    rows = await top.load();
  } catch (e) {
    showError(appError, (e && e.message) || String(e));
    rows = [];
  } finally {
    setLoading(false);
  }
  renderRows(rows);
}

function renderRows(rows) {
  listEl.innerHTML = "";
  rows.forEach((row, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "content-list__item";
    if (row.vodRating) b.classList.add("content-list__item--vod-rating");
    if (i === focusIndex && focusZone === "content")
      b.classList.add("content-list__item--focus");
    b.innerHTML = row.detail
      ? `<span class="content-list__item-text">${escapeHtml(row.text)}</span><span class="content-list__item-detail">${escapeHtml(row.detail)}</span>`
      : `<span class="content-list__item-text">${escapeHtml(row.text)}</span>`;
    b.addEventListener("click", () => {
      focusIndex = i;
      focusZone = "content";
      setShellZone("content");
      syncListFocusClasses();
      row.onSelect();
    });
    listEl.appendChild(b);
  });
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "list__empty";
    p.textContent = t("list_empty");
    listEl.appendChild(p);
  }
}

function syncListFocusClasses() {
  listEl.querySelectorAll(".content-list__item").forEach((el, i) => {
    el.classList.toggle("content-list__item--focus", i === focusIndex);
  });
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

function activateListFocus() {
  listEl.querySelectorAll(".content-list__item")[focusIndex]?.click();
}

/* ——— Sections ——— */
function startNoSessionHome() {
  stack = [];
  setActiveNav("live");
  $("sidebar-profile-name").textContent = t("profile_title").toUpperCase();
  $("sidebar-avatar-initial").textContent = "?";
  pushFrame({
    title: t("signin_disabled_title"),
    sub: t("signin_disabled_sub"),
    load: async () => [],
  });
}

function startLive() {
  if (!cred.isLoggedIn()) {
    startNoSessionHome();
    return;
  }
  stack = [];
  setActiveNav("live");
  pushFrame({
    title: lang() === "he" ? "טלוויזיה חיה" : "Live TV",
    sub: lang() === "he" ? "קטגוריות" : "Categories",
    load: async () => {
      const cats = await xlive.fetchLiveCategories();
      return cats.map((c) => ({
        text: c.name,
        onSelect: () => openLiveCategory(c.id, c.name),
      }));
    },
  });
}

function openLiveCategory(categoryId, name) {
  pushFrame({
    title: name,
    sub: lang() === "he" ? "ערוצים" : "Channels",
    load: async () => {
      const streams = await xlive.fetchLiveStreams(categoryId);
      return streams.map((s) => ({
        text: s.name,
        detail: s.tvArchive ? (lang() === "he" ? "ארכיון" : "Catch-up") : "",
        onSelect: () => openPlayer(s.name, urls.liveStreamUrl(s.streamId)),
      }));
    },
  });
}

function startVodMovies() {
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
        onSelect: () =>
          openPlayer(m.name, urls.vodMovieUrl(m.streamId, m.containerExtension)),
      }));
    },
  });
}

function startSeries() {
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
        onSelect: () => openSeriesDetail(s.seriesId, s.name),
      }));
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
            onSelect: () =>
              openPlayer(
                `${details.name} — ${ep.title}`,
                urls.seriesEpisodeUrl(ep.episodeId, ep.containerExtension),
              ),
          });
        }
      }
      return rows;
    },
  });
}

function startRecords() {
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
          openPlayer(e.title, u);
        },
      }));
    },
  });
}

function startPlaceholder() {
  stack = [];
  setActiveNav("none");
  pushFrame({
    title: t("placeholder_title"),
    sub: t("placeholder_sub"),
    load: async () => [],
  });
}

function startProfile() {
  stack = [];
  setActiveNav("profile");
  const name = cred.usernameRaw().trim() || t("profile_title");
  $("sidebar-avatar-initial").textContent = name.charAt(0).toUpperCase() || "?";
  pushFrame({
    title: t("profile_title"),
    sub: name,
    load: async () => [
      {
        text: t("profile_logout"),
        onSelect: () => {
          cred.clearSession();
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
    case "favorites":
    case "lastwatch":
    case "tvguide":
    case "settings":
      startPlaceholder();
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
    applyLoginI18n();
    applySidebarI18n();
  });
  $("login-lang-en").addEventListener("click", () => {
    localStorage.setItem(LANG_KEY, "en");
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
      $("sidebar-profile-name").textContent = u.toUpperCase();
      $("sidebar-avatar-initial").textContent = u.charAt(0).toUpperCase() || "?";
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
    sidebarFocusIndex = idx;
    applySidebarFocus();
    activateSidebarSelection();
  });
}

function bindKeys() {
  document.addEventListener("keydown", (ev) => {
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
      moveListFocus(1);
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      moveListFocus(-1);
      return;
    }
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      setShellZone("sidebar");
      applySidebarFocus();
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
  injectSidebarIcons();
  applyLoginI18n();
  applySidebarI18n();
  updateClock();
  setInterval(updateClock, 30_000);

  bindLogin();
  bindSidebarPointer();
  bindKeys();

  showView("app");
  vodMenuOpen = false;
  syncVodSubmenu();

  if (cred.isLoggedIn()) {
    const u = cred.usernameRaw();
    $("sidebar-profile-name").textContent = u.toUpperCase();
    $("sidebar-avatar-initial").textContent = u.charAt(0).toUpperCase() || "?";
    startLive();
    setShellZone("content");
    focusIndex = 0;
    sidebarFocusIndex = getSidebarFocusables().findIndex(
      (e) => e.getAttribute("data-nav") === "live",
    );
    if (sidebarFocusIndex < 0) sidebarFocusIndex = 0;
  } else {
    startNoSessionHome();
    setShellZone("content");
    focusIndex = 0;
    sidebarFocusIndex = getSidebarFocusables().findIndex(
      (e) => e.getAttribute("data-nav") === "live",
    );
    if (sidebarFocusIndex < 0) sidebarFocusIndex = 0;
  }
}

boot();
