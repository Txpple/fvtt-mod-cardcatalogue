/**
 * Every world write and every scene action, each one the stock Scenes directory makes itself:
 * Activate (and the pull back to the active scene), View, the config sheet, the notes, Preload for
 * everyone, the players' bar, Generate Thumbnail, and a scene filed in a folder. Undo puts the
 * scene that was active before back, only while nothing else has been activated since. Nothing
 * here writes a flag or a document of its own.
 */

import { log, t } from "./common.js";
import { undoCheck } from "./decide.js";

/** The last activation from this window, for its Undo: in memory, gone with the page. */
let last = null;

/** One activation at a time per scene, so a double click activates once. */
const busy = new Set();

const activeScene = () => game.scenes.active ?? null;

/**
 * Activate the scene (everyone online goes there, as the stock Activate does), or, when it is the
 * active scene already, pull everyone back to it. Returns what was done, or null when nothing was.
 */
export async function activate(scene) {
  if (busy.has(scene.id)) return null;
  busy.add(scene.id);
  try {
    if (scene.active) {
      scene.pullUsers(game.users);
      return "pulled";
    }
    const previous = activeScene();
    await scene.activate();
    last = previous ? { sceneId: scene.id, previousId: previous.id, name: scene.name, previousName: previous.name, at: Date.now() } : null;
    Hooks.callAll(`${shortId()}.activated`, scene, previous);
    return "activated";
  } finally {
    busy.delete(scene.id);
  }
}

const shortId = () => "cardcatalogue";

/** The activation Undo would take back, while it still can. */
export function lastActivation() {
  const state = undoCheck(last, { activeId: activeScene()?.id ?? null, exists: id => !!game.scenes.get(id), now: Date.now() });
  if (state !== "ok") {
    if (state !== "none") last = null;
    return null;
  }
  return last;
}

export function forgetActivation() {
  last = null;
}

/** Undo: activate the scene that was active before, unless another has been activated since. */
export async function undoActivation() {
  const record = last;
  const state = undoCheck(record, { activeId: activeScene()?.id ?? null, exists: id => !!game.scenes.get(id), now: Date.now() });
  last = null;
  if (state !== "ok") return state;
  const previous = game.scenes.get(record.previousId);
  await previous.activate();
  // Foundry refuses this client's own move while its canvas is still drawing the scene just left, so
  // the players go back and the GM stays: follow once the canvas is idle.
  if (canvas?.ready && canvas.scene?.id !== previous.id) {
    for (let i = 0; i < 300 && canvas.loading; i++) await new Promise(r => setTimeout(r, 100));
    if (canvas.scene?.id !== previous.id) await previous.view();
  }
  return "undone";
}

/** View it on this client only; the players stay where they are. */
export function view(scene) {
  return scene.view();
}

/** The stock config sheet. */
export function edit(scene) {
  return scene.sheet.render(true);
}

/** The scene's notes, on their page. */
export function notes(scene) {
  if (!scene.journal) return null;
  return scene.journal.sheet.render(true, { pageId: scene.journalEntryPage });
}

/** Every client loads the scene's art and first track ahead of the move. */
export function preload(scene) {
  return game.scenes.preload(scene.id, { broadcast: true });
}

/** On or off the players' bar (the active scene is always on it). */
export function toggleNav(scene) {
  return scene.update({ navigation: !scene.navigation });
}

/** Whether the stock Generate Thumbnail can run for this scene here. */
export function canThumb(scene) {
  if (game.settings.get("core", "noCanvas")) return false;
  return !!(scene.isView ? canvas.level?.background?.src : scene.initialLevel?.background?.src);
}

/** The stock Generate Thumbnail: rendered from the scene, uploaded, written to `thumb`. */
export async function makeThumb(scene) {
  const { thumb } = (await scene.createThumbnail({ level: scene._view })) ?? {};
  if (thumb) await scene.update({ thumb }, { diff: false });
  return !!thumb;
}

/** File the scene in a folder (null: no folder), as the stock directory's drop does. */
export function setFolder(scene, folderId) {
  return scene.update({ folder: folderId || null });
}

/** A scene's background file, from its first level (v14). */
export function backgroundOf(scene) {
  try {
    return scene.initialLevel?.background?.src || null;
  } catch (err) {
    log.debug("reading a background failed", err);
    return null;
  }
}

/** Run an action with the window's notices: an error is logged and told, never thrown. */
export async function guarded(name, fn) {
  try {
    return await fn();
  } catch (err) {
    log.error(`${name} failed`, err);
    ui.notifications.error(err?.message || t("error.action"));
    return null;
  }
}
