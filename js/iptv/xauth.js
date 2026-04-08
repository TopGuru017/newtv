/**
 * Xtream auth check via player_api.php (no action).
 */
import * as cred from "./credentials.js";
import { httpGetText } from "./xapi.js";
import { decodeXtreamText } from "./parse.js";
import { createLogger } from "../debug/logger.js";

const log = createLogger("iptv/xauth");

export async function verify(baseUrl, username, password) {
  log.debug("verify() start", { baseUrl, username });
  const base = (baseUrl || "").trim().replace(/\/+$/, "");
  const u = encodeURIComponent((username || "").trim());
  const p = encodeURIComponent(password || "");
  const url = `${base}/player_api.php?username=${u}&password=${p}`;
  const text = await httpGetText(url);
  const root = JSON.parse(text.trim());
  const user = root.user_info;
  if (!user) {
    const msg = decodeXtreamText(root.message) || "Invalid server response";
    throw new Error(msg);
  }
  if (Number(user.auth) !== 1) {
    throw new Error(decodeXtreamText(user.message) || "Unauthorized");
  }
  log.debug("verify() success", { baseUrl: base, username });
}
