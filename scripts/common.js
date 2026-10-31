/**
 * What every file of the module shares: the id, the logger, the strings, the settings, and a
 * case's own view of them. No imports from the module's other files, so nothing here can be caught
 * in an import cycle.
 */

import { createLogger } from "./kit/log.js";

export const MODULE_ID = "fvtt-mod-cardcatalogue";

/** Every line opens with the module's title; debug lines need CONFIG.debug["fvtt-mod-cardcatalogue"]. */
export const log = createLogger(MODULE_ID);

/** A string from lang/en.json, under this module's key; with data, formatted. */
export const t = (key, data) =>
  data ? game.i18n.format(`${MODULE_ID}.${key}`, data) : game.i18n.localize(`${MODULE_ID}.${key}`);

/** A setting of this module's. */
export const setting = key => game.settings.get(MODULE_ID, key);

/** Each case's two switches, named for the case: `journalEnabled`, `journalClassic`. */
const SWITCHES = { enabled: "Enabled", classic: "Classic" };

/** The setting key a case's switch is stored under. */
export const switchKey = (caseId, key) => (SWITCHES[key] ? `${caseId}${SWITCHES[key]}` : key);

/**
 * A case's own view of the strings and settings: its strings under `<case>.`, its switches as
 * `enabled` and `classic`, every other setting by its own key. A case's files read only these, so
 * the code each case carries over from its own module stays as it was.
 */
export function caseScope(caseId) {
  return {
    t: (key, data) => t(`${caseId}.${key}`, data),
    setting: key => game.settings.get(MODULE_ID, switchKey(caseId, key))
  };
}
