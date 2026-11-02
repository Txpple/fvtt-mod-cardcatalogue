/**
 * The sidebar-tabs rules, moved whole from House Rules 1.3.0: players see only the tabs they use,
 * and GMs see only theirs, each its own world switch (`sidebarTabs`, `gmSidebarTabs`). The pure
 * half is rules.js; this file is the writes. A player's hidden tabs are marked `gmOnly` on
 * `CONFIG.ui.sidebar.TABS` at `setup` (after every module's init, before the UI is built), which
 * is Foundry's own way of hiding Scenes; a GM's buttons come off the strip as it is drawn. Two hooks
 * back them up: a hidden tab that becomes active sends the user to Chat, a hidden tab's popout
 * closes as it opens.
 *
 * While an older House Rules still registers its own two switches, both rules here step aside, so
 * the two modules never hide a tab twice and either can be installed first.
 */

import { log, MODULE_ID, t } from "../common.js";
import * as rules from "./rules.js";

/** House Rules up to 1.3.0 carries these two rules itself. */
const HOUSE_RULES = "fvtt-mod-houserules";

/** House Rules still runs its own copy: this one stays out of the way. */
export const steppingAside = () => game.settings.settings.has(`${HOUSE_RULES}.${rules.ID}`);

/** The tabs this client's rule marked GM-only, so turning it off unmarks only those. */
const markedTabs = new Set();

/** This client's view of the rules: both switches and whether the user is a GM. */
function sidebarUser() {
  return {
    on: game.settings.get(MODULE_ID, rules.ID),
    gmOn: game.settings.get(MODULE_ID, rules.GM_ID),
    isGM: Boolean(game.user?.isGM)
  };
}

/**
 * Take this user's hidden tabs off a sidebar already drawn: leave a hidden tab for Chat first,
 * close its popout, and remove its button, after which `changeTab` refuses it.
 */
function removeHiddenTabs(ids, user) {
  const sidebar = ui.sidebar;
  if (!ids.length || !sidebar?.rendered) return;
  try {
    const to = rules.fallback(sidebar.tabGroups?.primary, user);
    if (to) sidebar.changeTab(to, "primary");
    for (const id of ids) {
      sidebar.popouts?.[id]?.close();
      sidebar.element?.querySelector(`nav.tabs [data-tab="${id}"]`)?.closest("li")?.remove();
    }
  } catch (err) {
    log.error(t("tabs.failed"), err);
  }
}

/**
 * Bring the sidebar's tab table in line with the players' switch on a player's client. Before the
 * sidebar is built (setup) that is all it takes; on a live flip to on, the player leaves a tab
 * being taken away, its popout closes and its button goes. Off unmarks the table; the buttons
 * return when the client reloads (the setting asks for it).
 */
export function applySidebarTabs(why) {
  if (steppingAside()) return;
  const user = sidebarUser();
  if (user.isGM) return;
  const changed = rules.mark(CONFIG.ui.sidebar?.TABS, user.on, markedTabs);
  if (!changed.length) return;
  log.info(t(user.on ? "tabs.applied" : "tabs.restored", { why, n: changed.length }));
  if (user.on) removeHiddenTabs(changed, user);
}

/** The GM rule on a GM's client: `gmOnly` does not hide a tab from a GM, so the buttons come off the strip. */
export function applyGmSidebarTabs() {
  if (steppingAside()) return;
  const user = sidebarUser();
  if (!user.isGM) return;
  removeHiddenTabs(rules.hiddenFor(user), user);
}

/** The two switches, registered at init; out of the menu (the user's audit), each keeps its value. */
export function registerSettings() {
  const reg = (key, onChange) =>
    game.settings.register(MODULE_ID, key, {
      name: `${MODULE_ID}.settings.${key}.name`,
      hint: `${MODULE_ID}.settings.${key}.hint`,
      scope: "world",
      config: false,
      type: Boolean,
      default: true,
      requiresReload: true,
      onChange
    });
  reg(rules.ID, () => applySidebarTabs("setting"));
  reg(rules.GM_ID, () => applyGmSidebarTabs());
}

// setup runs after every module's init (where a module adds its own tab) and before the UI is
// built, so the sidebar draws a player's strip without the hidden buttons.
Hooks.once("setup", () => applySidebarTabs("setup"));

// The strip is drawn on the sidebar's first render, and later renders put nothing back, so a
// removal here holds; a second finds nothing.
Hooks.on("renderSidebar", () => applyGmSidebarTabs());

// A way in neither rule foresaw: a hidden tab that becomes active sends the user back to Chat (a
// tick later: Foundry fires the hook before it finishes its own change), and a hidden tab's popout
// closes as it opens.
Hooks.on("changeSidebarTab", app => {
  if (steppingAside()) return;
  const to = rules.fallback(app?.tabName, sidebarUser());
  if (to) setTimeout(() => ui.sidebar.changeTab(to, "primary"), 0);
});
Hooks.on("renderAbstractSidebarTab", app => {
  if (steppingAside()) return;
  if (app?.isPopout && rules.isHidden(app.tabName, sidebarUser())) void app.close();
});
