/**
 * The sidebar-tabs rule, the pure half: which sidebar tabs a player loses, and the edit to
 * Foundry's tab table that takes them away (or gives them back). No Foundry here;
 * scripts/houserules.js hands it the table and the user.
 *
 * Foundry 14's sidebar builds its tab buttons from `Sidebar.TABS` (`CONFIG.ui.sidebar.TABS`), a
 * record of tab id to descriptor, and leaves out the button of a descriptor marked `gmOnly` on a
 * player's client (Scenes is marked so by Foundry itself). With no button there is no way in: the
 * strip, open or collapsed, has nothing to click or right-click to pop out, and `changeTab` to the
 * tab throws, as it does for Scenes. The rule marks the tabs in HIDDEN so, and only those: a tab a
 * module adds (Dice So Nice's) stays.
 *
 * The GM half is its own rule and setting (GM_ID) with its own list (GM_HIDDEN). `gmOnly` never
 * hides a tab from a GM, so scripts/houserules.js takes those buttons off a GM's strip once the
 * sidebar draws it; with the button gone `changeTab` refuses the tab the same way.
 */

export const ID = "sidebarTabs";

/** The GM rule's setting. */
export const GM_ID = "gmSidebarTabs";

/** The tab a player falls back to when the tab they are on is taken away. */
export const FALLBACK = "chat";

/** The tabs players lose: Combat, Placeables, Items, Rollable Tables, Cards, Macros. */
export const HIDDEN = ["combat", "placeables", "items", "tables", "cards", "macros"];

/** The tabs GMs lose: Combat, Rollable Tables, Cards, Macros. */
export const GM_HIDDEN = ["combat", "tables", "cards", "macros"];

/**
 * The tabs taken from this user: HIDDEN for a player while `on`, GM_HIDDEN for a GM while `gmOn`.
 *
 * @param {{ on: boolean, gmOn?: boolean, isGM: boolean }} user  The two settings and the user.
 */
export function hiddenFor({ on, gmOn = false, isGM }) {
  if (isGM) return gmOn ? GM_HIDDEN : [];
  return on ? HIDDEN : [];
}

/** Whether a rule keeps this user from this tab. */
export function isHidden(tab, user) {
  return hiddenFor(user).includes(tab);
}

/**
 * Mark or unmark the HIDDEN tabs in `tabs` (the TABS record, edited in place). On: each HIDDEN tab
 * present and not already `gmOnly` is marked and its id added to `marked`. Off: each id in `marked`
 * is unmarked and dropped from it, so a tab Foundry or a module made GM-only stays so.
 *
 * @param {object} tabs     `CONFIG.ui.sidebar.TABS`.
 * @param {boolean} on      The rule's setting.
 * @param {Set<string>} marked  The tabs this rule marked, kept by the caller between calls.
 * @returns {string[]}      The tab ids changed.
 */
export function mark(tabs, on, marked) {
  const changed = [];
  if (!tabs || typeof tabs !== "object") return changed;
  for (const id of HIDDEN) {
    const tab = tabs[id];
    if (!tab || typeof tab !== "object") continue;
    if (on && !tab.gmOnly) {
      tab.gmOnly = true;
      marked.add(id);
      changed.push(id);
    } else if (!on && marked.has(id)) {
      delete tab.gmOnly;
      marked.delete(id);
      changed.push(id);
    }
  }
  return changed;
}

/** The tab to change to when `active` is taken from this user, or null when it may stay. */
export function fallback(active, user) {
  return isHidden(active, user) ? FALLBACK : null;
}
