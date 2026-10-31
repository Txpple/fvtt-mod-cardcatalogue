/** The journal case's view of the module's id, logger, strings and settings (../common.js). */

import { caseScope, log, MODULE_ID } from "../common.js";

export const CASE = "journal";
export const { t, setting } = caseScope(CASE);
export { log, MODULE_ID };
