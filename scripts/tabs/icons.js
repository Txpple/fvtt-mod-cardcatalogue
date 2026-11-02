/**
 * The painted sidebar icons: each stock tab button (and Dice So Nice's) wears a picture from
 * styles/icons/tabs/ in place of its glyph, while one world switch (`tabIcons`) is on. The script
 * marks each button that has a picture and gives it the picture's URL; the stylesheet draws it only
 * under the body's class, so the switch flips them all without a redraw. A tab with no picture
 * keeps its glyph.
 *
 * The strip's size is each client's own (`tabScale`): Foundry sizes a button from `--control-size`,
 * so the stylesheet scales that on the strip alone, under the body's `cardcatalogue-tab-scale`.
 */

import { log, MODULE_ID } from "../common.js";

export const ID = "tabIcons";
export const SCALE_ID = "tabScale";

/** The class the stylesheet keys the pictures on. */
const CLASS = "cardcatalogue-tab-icons";

/** The class and the variable the stylesheet scales the strip by. */
const SCALE_CLASS = "cardcatalogue-tab-scale";
const SCALES = ["1", "1.5", "2"];

/** The tabs with a picture, each `styles/icons/tabs/<tab>.webp`. */
export const PICTURED = [
  "chat",
  "combat",
  "scenes",
  "placeables",
  "actors",
  "items",
  "journal",
  "tables",
  "cards",
  "macros",
  "playlists",
  "compendium",
  "dice-so-nice",
  "settings"
];

/** Put the pictures on or take them off. */
export function applyTabIcons() {
  document.body?.classList.toggle(CLASS, !!game.settings.get(MODULE_ID, ID));
}

/** Size the strip as this client asks. */
export function applyTabScale() {
  const body = document.body;
  if (!body) return;
  const scale = String(game.settings.get(MODULE_ID, SCALE_ID));
  const on = SCALES.includes(scale) && scale !== "1";
  body.classList.toggle(SCALE_CLASS, on);
  if (on) body.style.setProperty("--cc-tab-scale", scale);
  else body.style.removeProperty("--cc-tab-scale");
}

/** The switch and the size, registered at init. */
export function registerSettings() {
  game.settings.register(MODULE_ID, ID, {
    name: `${MODULE_ID}.settings.${ID}.name`,
    hint: `${MODULE_ID}.settings.${ID}.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: applyTabIcons
  });
  game.settings.register(MODULE_ID, SCALE_ID, {
    name: `${MODULE_ID}.settings.${SCALE_ID}.name`,
    hint: `${MODULE_ID}.settings.${SCALE_ID}.hint`,
    scope: "client",
    config: true,
    type: String,
    choices: Object.fromEntries(SCALES.map(s => [s, `${MODULE_ID}.settings.${SCALE_ID}.choices.${s.replace(".", "_")}`])),
    default: "1",
    onChange: applyTabScale
  });
}

// The strip is drawn on the sidebar's first render; marking a button twice changes nothing.
Hooks.on("renderSidebar", app => {
  try {
    for (const tab of PICTURED) {
      const button = app.element?.querySelector(`#sidebar-tabs [data-tab="${tab}"]`);
      if (!button || button.classList.contains("cc-tab-icon")) continue;
      const src = foundry.utils.getRoute(`modules/${MODULE_ID}/styles/icons/tabs/${tab}.webp`);
      button.style.setProperty("--cc-tab-icon", `url("${src}")`);
      button.classList.add("cc-tab-icon");
    }
  } catch (err) {
    log.error("putting the pictures on the sidebar's buttons failed", err);
  }
});
