// @ts-check
/**
 * What the shell works out without Foundry: which cards a click leaves picked, and where a folder may
 * be dropped in the rail. Pure, tested in tests/pick.test.js.
 */

/**
 * The cards picked after a click (the user: "multiselect cards so i can mass move / drag them"). A
 * plain click picks the one card; Ctrl (or Cmd) adds it or takes it out; Shift picks the run from the
 * anchor to it, in the order drawn (added to what was picked when Ctrl is held too). The anchor is
 * where the next Shift run starts.
 * @param {{ picked: Iterable<string>, anchor: string | null, key: string, order: readonly string[], ctrl?: boolean, shift?: boolean }} click
 * @returns {{ picked: Set<string>, anchor: string }}
 */
export function pickWith({ picked, anchor, key, order, ctrl = false, shift = false }) {
  const was = new Set(picked);
  if (shift && anchor && order.includes(anchor) && order.includes(key)) {
    const [a, b] = [order.indexOf(anchor), order.indexOf(key)].sort((x, y) => x - y);
    const run = order.slice(a, b + 1);
    return { picked: new Set(ctrl ? [...was, ...run] : run), anchor };
  }
  if (ctrl) {
    if (was.has(key)) was.delete(key);
    else was.add(key);
    return { picked: was, anchor: key };
  }
  return { picked: new Set([key]), anchor: key };
}

/**
 * The cards a drag carries: every picked card when the dragged one is picked, else that one alone.
 * @param {Set<string>} picked
 * @param {string} key the card dragged
 */
export const dragged = (picked, key) => (picked.has(key) && picked.size > 1 ? [...picked] : [key]);

/**
 * Whether a folder may be dropped into another (`target` null: the top level), as the stock directory
 * allows: never into itself or a folder under it, never where it already is, and never so deep that a
 * folder under it would pass Foundry's depth.
 * @param {string} id the folder dragged
 * @param {string | null} target the folder dropped on, or null for the top
 * @param {Map<string, { parent: string | null }>} folders every folder of the type, by id
 * @param {number} maxDepth Foundry's CONST.FOLDER_MAX_DEPTH
 * @returns {"ok" | "same" | "inside" | "deep"}
 */
export function nestAs(id, target, folders, maxDepth) {
  if ((folders.get(id)?.parent ?? null) === target) return "same";
  for (let at = target; at; at = folders.get(at)?.parent ?? null) if (at === id) return "inside";
  const depthOf = f => {
    let d = 1;
    for (let at = folders.get(f)?.parent ?? null; at; at = folders.get(at)?.parent ?? null) d++;
    return d;
  };
  // How many levels the dragged folder spans: itself and its deepest folder under it.
  let span = 1;
  for (const [fid] of folders) {
    let d = 0;
    for (let at = fid; at; at = folders.get(at)?.parent ?? null) {
      d++;
      if (at === id) {
        span = Math.max(span, d);
        break;
      }
    }
  }
  const base = target ? depthOf(target) : 0;
  return base + span > maxDepth ? "deep" : "ok";
}
