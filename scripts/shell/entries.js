/**
 * A card's right-click menu: the stock directory's own entry menu, the same entries Classic Mode
 * shows (Foundry's, the system's and every module's through the directory's own hook), on any card
 * keyed by a document's UUID. Nothing is copied: the entries come from the directory each time the
 * window is first drawn, and each runs against a stand-in of the directory's row (`li.directory-item`
 * carrying the document's id, or what a case's `row` puts on it: a pack's `data-pack`), so an entry
 * that looks for the row finds what it would in the sidebar.
 * The right-click also selects the card, as a click does.
 *
 * The stock entries place what they open for the sidebar (Delete's confirmation and the ownership
 * dialog at the screen's right edge, at the row's height); a card is no sidebar row, so the first
 * window an entry opens is put in the middle of the screen instead.
 */

import { log } from "../common.js";

/** Until when the next window to open came from a card's menu, and is centred. */
let centreUntil = 0;

function centre(app) {
  if (!centreUntil || Date.now() > centreUntil || String(app?.id ?? "").startsWith("cardcatalogue-")) return;
  centreUntil = 0;
  // Foundry places a window once its render hooks have run: centre it after that.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      try {
        const el = app.element instanceof HTMLElement ? app.element : app.element?.[0];
        const r = el?.getBoundingClientRect();
        if (!r?.width) return;
        app.setPosition({ left: Math.max(0, (window.innerWidth - r.width) / 2), top: Math.max(0, (window.innerHeight - r.height) / 2) });
      } catch (err) {
        log.debug("centring a window from a card's menu failed", err);
      }
    })
  );
}

Hooks.on("renderApplicationV2", (app, _el, _context, options) => {
  if (options?.isFirstRender) centre(app);
});
Hooks.on("renderApplication", app => centre(app));

/** A row as the stock directory draws it, for the entry behind a card. */
function standIn(card, row) {
  const li = document.createElement("li");
  li.className = "directory-item entry document";
  if (row) {
    row(li, card.dataset.key);
    return li;
  }
  const doc = fromUuidSync(card.dataset.key);
  if (doc?.id) {
    li.dataset.entryId = doc.id;
    li.dataset.documentId = doc.id;
  }
  return li;
}

/**
 * Bind the menu once on a window's element (it outlives every redraw). `directory()` is the stock
 * directory the cards belong to (`ui.items`, `ui.actors`, `ui.scenes`, `ui.compendium`); `select(key)`
 * marks the card; `row(li, key)`, when given, makes the stand-in row instead of a document's id.
 */
export function entryMenu(element, directory, select, row) {
  try {
    const app = directory();
    if (!app?._getEntryContextOptions) return;
    const entries = app._doEvent(app._getEntryContextOptions, {
      hookName: `get${app.documentName}ContextOptions`,
      parentClassHooks: false,
      hookResponse: true
    });
    if (!entries?.length) return;
    const rows = new WeakMap();
    const rowFor = card => {
      if (!rows.has(card)) rows.set(card, standIn(card, row));
      return rows.get(card);
    };
    const swap = args => args.map(a => (a instanceof HTMLElement && a.matches(".cc-card[data-key]") ? rowFor(a) : a));
    // An entry that throws on the stand-in is left out, never the whole menu.
    const wrapped = entries.map(entry => {
      const e = { ...entry };
      for (const k of ["visible", "condition"]) {
        const fn = entry[k];
        if (typeof fn !== "function") continue;
        e[k] = (...args) => {
          try {
            return fn(...swap(args));
          } catch (err) {
            log.debug(`a card menu entry (${entry.label ?? entry.name}) could not check its card`, err);
            return false;
          }
        };
      }
      for (const k of ["onClick", "callback"]) {
        const fn = entry[k];
        if (typeof fn === "function")
          e[k] = (...args) => {
            centreUntil = Date.now() + 3000;
            return fn(...swap(args));
          };
      }
      return e;
    });
    const Menu = foundry.applications.ux.ContextMenu.implementation ?? foundry.applications.ux.ContextMenu;
    new Menu(element, ".cc-card[data-key]", wrapped, {
      jQuery: false,
      fixed: true,
      onOpen: card => {
        rows.delete(card);
        if (card?.dataset.key) select(card.dataset.key);
      }
    });
  } catch (err) {
    log.error("the cards' right-click menu could not be built", err);
  }
}
