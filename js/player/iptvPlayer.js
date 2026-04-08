/**
 * Playback: HLS via hls.js, progressive MP4 (and similar) via native <video>.
 * MKV is rejected (container rarely supported on TV web).
 */
import { alternateHttpScheme } from "../iptv/streamUrls.js";

function isMkv(url) {
  return /\.mkv(\?|$)/i.test(url.split("?")[0] || "");
}

function isHlsUrl(url) {
  const path = (url || "").split("?")[0].toLowerCase();
  return path.endsWith(".m3u8") || path.includes(".m3u8");
}

function destroyHls(videoEl) {
  if (videoEl._hls) {
    try {
      videoEl._hls.destroy();
    } catch {
      /* ignore */
    }
    delete videoEl._hls;
  }
}

export function stop(videoEl) {
  destroyHls(videoEl);
  videoEl.removeAttribute("src");
  videoEl.load();
}

/**
 * @param {HTMLVideoElement} videoEl
 * @param {string} url
 * @param {{ triedAlt?: boolean }} [opts]
 */
export async function playUrl(videoEl, url, opts = {}) {
  stop(videoEl);
  const u = (url || "").trim();
  if (!u) throw new Error("Empty URL");

  if (isMkv(u)) {
    throw new Error(
      "MKV is not supported in the TV browser. Use HLS (.m3u8) or MP4 from your provider.",
    );
  }

  if (!isHlsUrl(u)) {
    return playNative(videoEl, u);
  }

  if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    try {
      videoEl.src = u;
      await videoEl.play();
      return;
    } catch {
      videoEl.removeAttribute("src");
    }
  }

  const Hls = globalThis.Hls;
  if (Hls && Hls.isSupported()) {
    await playHlsJs(videoEl, u);
    return;
  }

  videoEl.src = u;
  await videoEl.play();
}

function playNative(videoEl, url) {
  videoEl.src = url;
  return videoEl.play();
}

function playHlsJs(videoEl, url) {
  const Hls = globalThis.Hls;
  return new Promise((resolve, reject) => {
    const hls = new Hls({
      /* Safer default on Samsung Tizen Web (worker + MSE edge cases). */
      enableWorker: false,
      lowLatencyMode: false,
    });
    videoEl._hls = hls;
    hls.on(Hls.Events.ERROR, async (_, data) => {
      if (!data.fatal) return;
      const alt = alternateHttpScheme(url);
      if (alt && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        try {
          hls.loadSource(alt);
          return;
        } catch {
          /* fall through */
        }
      }
      destroyHls(videoEl);
      reject(new Error(data.details || data.type || "HLS error"));
    });
    hls.loadSource(url);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().then(resolve).catch(reject);
    });
  });
}
