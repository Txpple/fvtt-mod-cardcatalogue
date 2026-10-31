/**
 * What only this browser remembers: what was shown (by this GM, or to this player), what
 * this player has opened, the last view, type and card size. Kept in localStorage under the world
 * and the user, never in the world: switching the module off leaves nothing behind but this
 * browser's key. Every read and write is guarded, and a record of the wrong shape is mended field
 * by field; a private window or blocked storage just forgets.
 */

import { MODULE_ID } from "./common.js";
import { remember } from "./decide.js";

const MAX_SEEN = 3000;

const key = () => `${MODULE_ID}.journal.${game.world?.id ?? "world"}.${game.user?.id ?? "user"}`;

/** Scroll Case's record for this world and user, read once when this case has none yet. */
const scrollCaseKey = () => `fvtt-mod-scrollcase.${game.world?.id ?? "world"}.${game.user?.id ?? "user"}`;

const isObj = v => v && typeof v === "object" && !Array.isArray(v);

/** A stored record, each field checked: a bad field is reset alone, so one bad value loses nothing else. */
function mend(raw) {
  const r = isObj(raw) ? raw : {};
  return {
    recent: Array.isArray(r.recent) ? r.recent.filter(x => isObj(x) && typeof x.key === "string") : [],
    seen: isObj(r.seen) ? r.seen : {},
    baseline: r.baseline === true,
    view: typeof r.view === "string" ? r.view : null,
    type: typeof r.type === "string" ? r.type : null,
    size: typeof r.size === "string" ? r.size : null
  };
}

let cache = null;
let cacheKey = null;

/** The whole record for this world and user, read again when the storage key changes. */
export function load() {
  const k = key();
  if (cache && cacheKey === k) return cache;
  let raw = null;
  try {
    const text = globalThis.localStorage?.getItem(k) ?? globalThis.localStorage?.getItem(scrollCaseKey());
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }
  cache = mend(raw);
  cacheKey = k;
  return cache;
}

function save() {
  try {
    const seen = Object.entries(cache.seen);
    if (seen.length > MAX_SEEN) cache.seen = Object.fromEntries(seen.sort((a, b) => b[1] - a[1]).slice(0, MAX_SEEN));
    globalThis.localStorage?.setItem(cacheKey, JSON.stringify(cache));
  } catch {
    // Storage blocked or full: the record lives until the page reloads.
  }
}

/** Change the record and keep it. */
export function edit(fn) {
  const record = load();
  fn(record);
  save();
  return record;
}


/**
 * Note that something was shown: `k` a page's uuid or a file's path, `to` a few words, `ids` the
 * users it went to (null: everyone), so it can be shown again to the same players.
 */
export function noteShown(k, to, ids = null) {
  edit(r => {
    r.recent = remember(r.recent, { key: k, at: Date.now(), to, ids: Array.isArray(ids) ? ids : null });
  });
}

export function noteSeen(k) {
  edit(r => {
    r.seen[k] = Date.now();
  });
}

export const isSeen = k => k in load().seen;

export function setPrefs(prefs) {
  edit(r => Object.assign(r, prefs));
}
