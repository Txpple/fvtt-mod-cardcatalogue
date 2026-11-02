/**
 * Open Roll 5e: Card Catalogue — the entry point (module.json's `esmodules`).
 *
 * Every directory the table uses as a case of cards: the journal (Scroll Case, carried over whole),
 * the scenes (Map Case), the actors and the items, each opened by its own sidebar button and
 * switched between in place; and the sidebar itself showing only the tabs the table uses (the two
 * rules carried over from House Rules). A skin over Foundry's own directories: every world write is
 * one the stock directory or sheet makes, and what only the module needs lives in the browser.
 * Nothing is patched. The plan is the suite's docs/plans/cardcatalogue.md.
 */

import * as actors from "./actors/case.js";
import { log, MODULE_ID, setting, switchKey } from "./common.js";
import * as items from "./items/case.js";
import * as journal from "./journal/journal.js";
import * as scenes from "./scenes/case.js";
import { hasCase, setClassic } from "./shell/cases.js";
import { migrateClient, migrateWorld } from "./shell/migrate.js";
import * as tabs from "./tabs/apply.js";
import * as tabIcons from "./tabs/icons.js";

const CASES = { journal, scenes, actors, items };

/** The directory each case stands for, redrawn when its Classic Mode changes. */
const DIRECTORY = { journal: "journal", scenes: "scenes", actors: "actors", items: "items" };

/** Each case's finder key: Scroll Case's and Map Case's as they were; actors and items unbound. */
const KEYS = {
  journal: [{ key: "KeyH", modifiers: ["Control", "Shift"] }],
  scenes: [{ key: "KeyM", modifiers: ["Control", "Shift"] }],
  actors: [],
  items: []
};

Hooks.once("init", () => {
  const reg = (key, data) => game.settings.register(MODULE_ID, key, { name: `${MODULE_ID}.settings.${key}.name`, hint: `${MODULE_ID}.settings.${key}.hint`, ...data });
  for (const id of Object.keys(CASES)) {
    reg(switchKey(id, "enabled"), { scope: "world", config: true, type: Boolean, default: true, requiresReload: true });
    reg(switchKey(id, "classic"), {
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => ui[DIRECTORY[id]]?.render()
    });
    game.keybindings.register(MODULE_ID, `${id}Finder`, {
      name: `${MODULE_ID}.keys.${id}.name`,
      hint: `${MODULE_ID}.keys.${id}.hint`,
      editable: KEYS[id],
      restricted: id === "scenes",
      onDown: () => {
        if (!hasCase(id)) return false;
        void CASES[id].openFinder();
        return true;
      },
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });
  }
  journal.registerSettings();
  tabs.registerSettings();
  tabIcons.registerSettings();
  tabIcons.applyTabIcons();

  const load = foundry.applications?.handlebars?.loadTemplates ?? loadTemplates;
  const docs = ["library.hbs", "finder.hbs"].map(f => `modules/${MODULE_ID}/templates/docs/${f}`);
  load([...journal.templates, ...scenes.templates, ...docs]).catch(err => log.error("preloading the templates failed", err));
});

Hooks.once("ready", () => {
  // Foundry v14 bundles module CSS: if a rule of ours does not reach an element, load the sheet.
  try {
    const probe = document.createElement("div");
    probe.className = "cardcatalogue-css-probe";
    document.body.append(probe);
    const applied = getComputedStyle(probe).flexDirection === "column";
    probe.remove();
    if (!applied && !document.querySelector(`link[data-${MODULE_ID}-fallback]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `modules/${MODULE_ID}/styles/cardcatalogue.css`;
      link.setAttribute(`data-${MODULE_ID}-fallback`, "true");
      document.head.append(link);
      log.warn("the manifest stylesheet is not in the cascade; loading it directly.");
    }
  } catch (err) {
    log.error("the stylesheet probe failed", err);
  }

  void migrateWorld().catch(err => log.error("carrying the world's settings over failed", err));
  void migrateClient().catch(err => log.error("carrying this browser's settings over failed", err));

  if (hasCase("journal")) journal.ready();
  if (hasCase("scenes")) scenes.ready();

  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      journal: journal.api,
      scenes: scenes.api,
      actors: actors.api,
      items: items.api,
      classic: (id, on = true) => setClassic(id, on),
      hasCase,
      setting
    };
  }
});
