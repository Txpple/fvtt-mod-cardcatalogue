/**
 * Foundry's own ownership dialog, opened from a case window (an actor's Ownership in the chevron, a
 * card's right-click Configure Ownership, a rail folder's): the stock dialog, its rows and its write
 * Foundry's, its hint in the case's words. Foundry's speaks of "this specific Document" (the user
 * circled the word); from a case, an actor's or an item's says what each level shows a player, a
 * folder's which cards its change reaches. Only a dialog a case window asked for is reworded, from
 * its first render on: the stock directory and the sheets open their own, which keep Foundry's text,
 * and a dialog with no hint where Foundry draws it is left as it is. Nothing is patched: the dialog's
 * own render hook, registered at `init`. `ownershipHint`, `askedFor` and `sayHint` are pure, tested
 * in tests/ownership.test.js.
 */

import { t } from "../common.js";

/** The hint's string by what the dialog configures; a folder's by the kind of card it holds. */
const HINTS = new Map([
  ["Actor", "actors.menu.ownershipDialog"],
  ["Item", "items.menu.ownershipDialog"]
]);
const FOLDER_HINTS = new Map([
  ["Actor", "folders.ownership.actors"],
  ["Item", "folders.ownership.items"]
]);

/**
 * The string a case's ownership dialog says as its hint, or null to keep Foundry's own.
 * @param {string} documentName the configured document's, `Folder` for a folder
 * @param {string} [type] a folder's: the document name of what it holds
 * @returns {string | null}
 */
export function ownershipHint(documentName, type) {
  return (documentName === "Folder" ? FOLDER_HINTS.get(type) : HINTS.get(documentName)) ?? null;
}

/**
 * Whether a dialog, on its first render, is the one a card's right-click asked for: the same
 * document, within the moment the stock entry takes to open it.
 * @param {{ uuid: string, until: number } | null} asked
 * @param {string | undefined} uuid the dialog's document's
 * @param {number} now
 */
export const askedFor = (asked, uuid, now) => !!asked && !!uuid && asked.uuid === uuid && now <= asked.until;

/** The dialog's hint (Foundry's `p.instructions`) said again; false, nothing changed, when it is not there. */
export function sayHint(root, text) {
  const hint = root?.querySelector?.("p.instructions");
  if (!hint) return false;
  hint.textContent = text;
  return true;
}

/** The dialogs a case window opened or asked for, said in the case's words on every render. */
const ours = new WeakSet();

/** The card a right-click's stock Configure Ownership is opening the dialog for, until when. */
let asked = null;

const FOR_MS = 2500;

/** A card's stock Configure Ownership was clicked: the dialog it opens for `uuid` is the case's. */
export function noteOwnership(uuid) {
  asked = uuid ? { uuid, until: Date.now() + FOR_MS } : null;
}

/** Foundry's ownership dialog for an actor or a folder, as a case window opens it. */
export function configureOwnership(doc) {
  const app = new foundry.applications.apps.DocumentOwnershipConfig({ document: doc });
  ours.add(app);
  return app.render({ force: true });
}

/** At `init`: a dialog a case window opened or asked for says the case's words on each render. */
export function watchOwnership() {
  Hooks.on("renderDocumentOwnershipConfig", (app, element, _context, options) => {
    const doc = app.document;
    if (options?.isFirstRender && askedFor(asked, doc?.uuid, Date.now())) {
      asked = null;
      ours.add(app);
    }
    if (!ours.has(app)) return;
    const key = ownershipHint(doc?.documentName, doc?.type);
    if (key) sayHint(element, t(key, { name: doc.name }));
  });
}
