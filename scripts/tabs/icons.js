/**
 * The painted sidebar icons: each stock tab button (and Dice So Nice's) wears a picture from
 * styles/icons/tabs/ in place of its glyph, while one world switch (`tabIcons`) is on. The script
 * marks each button that has a picture and gives it the picture's URL; the stylesheet draws it only
 * under the body's class, so the switch flips them all without a redraw. A tab with no picture
 * keeps its glyph.
 */

import { log, MODULE_ID } from "../common.js";

export const ID = "tabIcons";

/** The class the stylesheet keys the pictures on. */
const CLASS = "cardcatalogue-tab-icons";

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

/** The switch, registered at init. */
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
