/**
 * The cut-over from Scroll Case and House Rules, once per world and per browser: a setting this
 * module has never stored takes the value the module it replaces stored (read from the world's own
 * Setting documents, which outlive a disabled or removed module; a document's `value` is already
 * parsed, while the browser's storage holds JSON text), and this browser's Classic Mode
 * for the journal takes Scroll Case's. A setting already stored here is never touched, so the copy
 * runs once and a GM's later choice stands. Each browser's shown history are read in
 * journal/memory.js, the first time the journal case has none.
 */

import { log, MODULE_ID } from "../common.js";

/** World settings: [the old key, this module's key]. */
const WORLD = [
  ["fvtt-mod-scrollcase.enabled", "journalEnabled"],
  ["fvtt-mod-scrollcase.showKeeps", "showKeeps"],
  ["fvtt-mod-scrollcase.assetFolders", "assetFolders"],
  ["fvtt-mod-scrollcase.handoutsJournal", "handoutsJournal"],
  ["fvtt-mod-houserules.sidebarTabs", "sidebarTabs"],
  ["fvtt-mod-houserules.gmSidebarTabs", "gmSidebarTabs"]
];

/** Client settings, kept in the browser's own storage. */
const CLIENT = [["fvtt-mod-scrollcase.classic", "journalClassic"]];

const parse = text => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};

/** The world's half, on a GM's client. */
export async function migrateWorld() {
  if (!game.user.isGM) return;
  const store = game.settings.storage.get("world");
  for (const [from, to] of WORLD) {
    try {
      if (store.getSetting(`${MODULE_ID}.${to}`)) continue;
      const old = store.getSetting(from);
      if (!old || old.value === undefined || old.value === null) continue;
      const value = old.value;
      await game.settings.set(MODULE_ID, to, value);
      log.info(`${to} carried over from ${from}: ${JSON.stringify(value)}`);
    } catch (err) {
      log.error(`carrying ${from} over failed`, err);
    }
  }
}

/** The browser's half, on every client. */
export async function migrateClient() {
  const store = globalThis.localStorage;
  if (!store) return;
  for (const [from, to] of CLIENT) {
    try {
      if (store.getItem(`${MODULE_ID}.${to}`) !== null) continue;
      const old = store.getItem(from);
      if (old === null) continue;
      const { ok, value } = parse(old);
      if (ok) await game.settings.set(MODULE_ID, to, value);
    } catch (err) {
      log.error(`carrying ${from} over failed`, err);
    }
  }
}
