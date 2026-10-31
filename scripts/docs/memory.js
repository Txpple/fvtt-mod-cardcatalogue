/**
 * What only this browser remembers for an actors or items case: what was opened lately,
 * the last view and card size. Kept in localStorage under the case, the world and the user, never in
 * the world. Every read and write is guarded, and a record of the wrong shape is mended field by
 * field; a private window or blocked storage just forgets.
 */

import { MODULE_ID } from "../common.js";
import { remember } from "./decide.js";

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const strings = v => (Array.isArray(v) ? v.filter(x => typeof x === "string") : []);

function mend(raw) {
  const r = isObj(raw) ? raw : {};
  return {
    recent: Array.isArray(r.recent) ? r.recent.filter(x => isObj(x) && typeof x.key === "string") : [],
    collapsed: strings(r.collapsed),
    view: typeof r.view === "string" ? r.view : null,
    size: typeof r.size === "string" ? r.size : null
  };
}

/** One case's record. */
export function createRecord(caseId) {
  let cache = null;
  let cacheKey = null;
  const key = () => `${MODULE_ID}.${caseId}.${game.world?.id ?? "world"}.${game.user?.id ?? "user"}`;

  const load = () => {
    const k = key();
    if (cache && cacheKey === k) return cache;
    let raw = null;
    try {
      const text = globalThis.localStorage?.getItem(k);
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = null;
    }
    cache = mend(raw);
    cacheKey = k;
    return cache;
  };

  const edit = fn => {
    const record = load();
    fn(record);
    try {
      globalThis.localStorage?.setItem(cacheKey, JSON.stringify(cache));
    } catch {
      // Storage blocked or full: the record lives until the page reloads.
    }
    return record;
  };

  return {
    load,
    edit,
    noteOpened: k =>
      edit(r => {
        r.recent = remember(r.recent, { key: k, at: Date.now() });
      }),
    toggleCollapsed: k =>
      edit(r => {
        r.collapsed = r.collapsed.includes(k) ? r.collapsed.filter(c => c !== k) : [...r.collapsed, k];
      }),
    setPrefs: prefs => edit(r => Object.assign(r, prefs))
  };
}
