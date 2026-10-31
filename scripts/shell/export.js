/**
 * The scenes', actors' and items' export, in the journal's shape: the cards drawn and not hidden by
 * the search, in their order, saved as `cardcatalogue-<case>-<view>-<date>.json`. Each case says
 * what a card's entry holds; nothing is written to the world.
 */

import { MODULE_ID, t } from "../common.js";
import { exportName, exportOf } from "../journal/decide.js";

/**
 * @param {HTMLElement} root the case's window
 * @param {{ caseId: string, heading: string, search: string, entryOf: (key: string) => object | null }} what
 */
export function exportInView(root, { caseId, heading, search, entryOf }) {
  const keys = [...root.querySelectorAll(".cc-card[data-key]:not([hidden])")].map(c => c.dataset.key);
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
