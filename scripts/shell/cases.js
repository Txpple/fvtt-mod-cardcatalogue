/**
 * The cases and what they share: the strip across the top of each case's rail that switches cases
 * in place, and the takeover of each sidebar button. Each case registers itself (its id, its
 * sidebar tab, its icon, how to open it and who sees it); this file imports none of them, so
 * nothing here can be caught in an import cycle.
 *
 * A sidebar button is intercepted, never patched: a listener on the button itself stops a click
 * before it reaches the sidebar's own handler, unless the case is off or in Classic Mode on this
 * client, so the window opens and the sidebar stays where it was (the chat, most of the time; the
 * user's ruling after trying the tab lit behind the window); if the case fails to open, the stock tab
 * opens instead. A right-click is still the sidebar's (its popout). In Classic Mode, the stock
 * directory carries one button back.
 */

import { log, MODULE_ID, setting, switchKey, t } from "../common.js";

/** The registered cases, in the strip's order. */
const CASES = new Map();

/**
 * A case: `id`, `tab` (the sidebar tab it stands for), `icon`, `open(options)` (opens or raises its
 * window; options may carry `position`), `visible()` (whether this user has it at all), and
 * `aside()` (the module it replaces is still active: the case stays out of the way).
 */
export function registerCase(def) {
  CASES.set(def.id, def);
}

/** The strip's order: the sidebar's own (Scenes, Actors, Items, Journal, Playlists, Compendium). */
const ORDER = ["scenes", "actors", "items", "journal", "playlists", "compendium"];
const ordered = () => [...CASES.values()].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

/** Whether this user has a case: on for the world and for them. */
export const hasCase = id => {
  const def = CASES.get(id);
  return !!def && setting(switchKey(id, "enabled")) && !def.aside?.() && def.visible();
};

/** Whether a case replaces its sidebar tab on this client. */
const takesOver = id => hasCase(id) && !setting(switchKey(id, "classic"));

/** The strip's buttons for a case's window. */
export function stripContext(current) {
  const list = ordered().filter(def => hasCase(def.id));
  // One case alone needs no strip.
  if (list.length < 2) return [];
  return list.map(def => ({ id: def.id, icon: def.icon, label: t(`cases.${def.id}`), on: def.id === current }));
}

/** Open another case where this window stands, and close this one. */
export async function switchCase(app, id) {
  const def = CASES.get(id);
  if (!def || id === app.caseId) return;
  const { left, top, width, height } = app.position ?? {};
  def.open({ position: { left, top, width, height } });
  await app.close({ animate: false });
}

/** Open Foundry's own directory for a case: the sidebar's tab, the sidebar expanded. */
export function openClassic(id) {
  const tab = CASES.get(id)?.tab ?? id;
  ui.sidebar?.changeTab(tab, "primary");
  if (ui.sidebar && !ui.sidebar.expanded) ui.sidebar.expand();
}

/** Put a case in Classic Mode on this client, or take it out; the way it opens follows. */
export async function setClassic(id, on) {
  await game.settings.set(MODULE_ID, switchKey(id, "classic"), !!on);
  if (on) {
    openClassic(id);
    ui.notifications.info(t("classic.on", { case: t(`cases.${id}`) }));
  } else CASES.get(id)?.open();
}

/**
 * The sidebar's buttons: each case's tab button opens the case. The sidebar acts on `click` and on
 * a middle button's `auxclick` alike; a right-click is its popout and is left to it.
 */
Hooks.on("renderSidebar", app => {
  for (const def of CASES.values()) {
    try {
      const button = app.element?.querySelector(`#sidebar-tabs [data-tab="${def.tab}"], nav.tabs [data-tab="${def.tab}"]`);
      if (!button || button.dataset.cardcatalogue) continue;
      button.dataset.cardcatalogue = def.id;
      const open = ev => {
        if (!takesOver(def.id) || (ev.type === "click" ? ev.button !== 0 : ev.button !== 1)) return;
        ev.preventDefault();
        ev.stopPropagation();
        // Fail open: whatever goes wrong in the window, the stock directory still opens.
        try {
          def.open();
        } catch (err) {
          log.error(`the ${def.id} case failed to open; Foundry's directory opens instead`, err);
          openClassic(def.id);
        }
      };
      button.addEventListener("click", open);
      button.addEventListener("auxclick", open);
    } catch (err) {
      log.error(`taking over the ${def.tab} button failed`, err);
    }
  }
});

/** The way back from Classic Mode: one button in the stock directory's header, only while Classic is on. */
export function wayBack(id, app, html) {
  try {
    const def = CASES.get(id);
    if (!def) return;
    const root = html instanceof HTMLElement ? html : (html?.[0] ?? app.element);
    const buttonId = `cardcatalogue-back-${id}`;
    root?.querySelector(`#${buttonId}`)?.remove();
    if (!hasCase(id) || !setting(switchKey(id, "classic"))) return;
    const actions = root?.querySelector(".header-actions, .directory-header .action-buttons");
    if (!actions) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = buttonId;
    button.className = "cardcatalogue-directory-button";
    button.innerHTML = `<i class="fa-solid ${def.icon}" inert></i> <span>${t("classic.back")}</span>`;
    button.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      void setClassic(id, false);
    });
    actions.append(button);
  } catch (err) {
    log.error(`adding the way back to the ${id} directory failed`, err);
  }
}
