/**
 * Xtream JSON helpers + text decoding (base64 / Hebrew mojibake), ported from Android.
 */

export function containsHebrew(text) {
  for (let i = 0; i < text.length; i++) {
    const c = text.codePointAt(i);
    if (c >= 0x0590 && c <= 0x05ff) return true;
    if (c > 0xffff) i++;
  }
  return false;
}

function decodeBase64IfLikely(value) {
  const compact = value.replace(/[\r\n \t]/g, "");
  if (compact.length < 8 || compact.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) return null;
  let bytes;
  try {
    const bin = atob(compact);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return null;
  }
  if (bytes.length === 0) return null;
  try {
    const utf8 = new TextDecoder("utf-8").decode(bytes).trim();
    if (containsHebrew(utf8) || /[a-zA-Z\u0400-\u04FF]/.test(utf8)) return utf8;
  } catch {
    /* ignore */
  }
  return null;
}

function recoverMisdecodedHebrew(text) {
  const bad = (text.match(/[×Ø]/g) || []).length;
  if (bad < 2) return text;
  try {
    const latin1 = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) latin1[i] = text.charCodeAt(i) & 0xff;
    const repaired = new TextDecoder("utf-8").decode(latin1);
    return containsHebrew(repaired) ? repaired : text;
  } catch {
    return text;
  }
}

export function decodeXtreamText(raw) {
  const input = (raw || "").trim();
  if (!input) return "";
  const decoded = decodeBase64IfLikely(input) || input;
  return recoverMisdecodedHebrew(decoded).trim();
}

export function parseJsonArrayOrData(jsonText) {
  const t = (jsonText || "").trim();
  if (t.startsWith("[")) return JSON.parse(t);
  const obj = JSON.parse(t);
  const user = obj.user_info;
  if (user && Number(user.auth) !== 1) {
    throw new Error(decodeXtreamText(user.message) || "Unauthorized");
  }
  if (obj.data !== undefined) {
    if (Array.isArray(obj.data)) return obj.data;
    if (obj.data && typeof obj.data === "object") return Object.values(obj.data);
  }
  return [];
}
