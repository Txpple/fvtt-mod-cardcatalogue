/**
 * The scenes case, Map Case 0.1.0 carried over whole: the Scenes directory as wide cards, one-click
 * Activate with an Undo, the rest behind the chevron. GM only, as the Scenes tab is. Every write is
 * one the stock directory makes (scenes.js); what only it needs lives in the browser (memory.js).
 * The case registers itself with the shell (the strip, the Scenes button, Classic Mode's way back);
 * this file holds the refresh hooks and the record of the scenes active lately.
 */

import { registerCase, wayBack } from "../shell/cases.js";
import { MODULE_ID } from "./common.js";
import { Finder } from "./finder.js";
import { ScenesWindow } from "./library.js";
import * as memory from "./memory.js";
import * as scenes from "./scenes.js";

registerCase({
  id: "scenes",
  tab: "scenes",
  icon: "fa-map",
  visible: () => !!game.user?.isGM,
  // The Map Case prototype still on beside it: two windows would answer the Scenes button.
  aside: () => !!game.modules.get("fvtt-mod-mapcase")?.active,
  open: options => ScenesWindow.open(options)
});

export const templates = ["library.hbs", "finder.hbs"].map(f => `modules/${MODULE_ID}/templates/scenes/${f}`);

export const openFinder = () => Finder.toggle();

Hooks.on("renderSceneDirectory", (app, html) => wayBack("scenes", app, html));

const refresh = () => ScenesWindow.refresh();
for (const verb of ["create", "update", "delete"]) Hooks.on(`${verb}Scene`, refresh);
for (const hook of ["createFolder", "updateFolder", "deleteFolder"]) {
  Hooks.on(hook, folder => {
    if (folder.type === "Scene") refresh();
  });
}
// "You are here" follows the canvas.
Hooks.on("canvasReady", refresh);
// A scene that becomes active, from here, the stock directory or another GM, is recent.
Hooks.on("updateScene", (scene, changes) => {
  if (changes.active === true && game.user.isGM) memory.noteActive(scene.uuid);
});

/** The scenes' part of `ready`: the active scene at load is the first recent one. */
export function ready() {
  if (!game.user.isGM) return;
  if (game.scenes.active && !memory.load().recent.length) memory.noteActive(game.scenes.active.uuid);
}

/** The scenes' part of the API. */
export const api = {
  open: options => ScenesWindow.open(options),
  finder: () => Finder.toggle(),
  memory,
  scenes
};
