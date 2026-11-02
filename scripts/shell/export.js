/**
 * The scenes', actors' and items' export, in the journal's shape: the cards drawn and not hidden by
 * the search, in their order (or only the cards picked, when several are), saved as
 * `cardcatalogue-<case>-<view>-<date>.json`. Each case says what a card's entry holds; an actor's or
 * an item's carries the whole document as its sheet's Export Data writes it (`wholeOf`). Nothing is
 * written to the world.
 */

import { MODULE_ID, t } from "../common.js";
import { exportName, exportOf } from "../journal/decide.js";

/**
 * @param {HTMLElement} root the case's window
 * @param {{ caseId: string, heading: string, search: string, entryOf: (key: string) => object | null, only?: Set<string> | null }} what
 */
export function exportInView(root, { caseId, heading, search, entryOf, only = null }) {
  const keys = [...root.querySelectorAll(".cc-card[data-key]:not([hidden])")].map(c => c.dataset.key).filter(k => !only || only.has(k));
  const entries = keys.flatMap(k => {
    const entry = entryOf(k);
    return entry ? [entry] : [];
  });
  if (!entries.length) return ui.notifications.warn(t("export.none"));
  const q = search.trim();
  const data = exportOf({ world: game.world.title, view: heading, search: q, at: new Date().toISOString(), entries, format: `${MODULE_ID}/${caseId}` });
  // The file is named for the local day; the export's own stamp stays UTC.
  const name = exportName(q ? `${heading} ${q}` : heading, new Date().toLocaleDateString("en-CA"), `cardcatalogue-${caseId}`);
  foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), "application/json", name);
  ui.notifications.info(t(entries.length === 1 ? "export.doneOne" : "export.done", { name, n: entries.length }));
}

/**
 * A document whole, as Foundry's own Export Data on its sheet writes it (`exportToJSON`, the user: "export
 * the entire actor, as if it was exported from the char sheet"): its compendium form, every embedded
 * item and effect, the source kept, and where it came from in `_stats.exportSource`. Null for a user who
 * does not own it: the stock entry is the owners' too.
 */
export function wholeOf(doc) {
  if (!doc?.isOwner || typeof doc.toCompendium !== "function") return null;
  const data = doc.toCompendium(null, { clearSource: false });
  data._stats ??= {};
  data._stats.exportSource = {
    worldId: game.world.id,
    uuid: doc.uuid,
    coreVersion: game.version,
    systemId: game.system.id,
    systemVersion: game.system.version
  };
  return data;
}
