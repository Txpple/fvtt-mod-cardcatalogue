// @ts-check
/**
 * What the scenes case works out without Foundry: the search, the rail's views and folders, a card's
 * lines, the browser's record, Undo's check. Pure, tested in tests/scenes.test.js.
 */

/** A path's last part. */
export const fileName = path => String(path ?? "").split(/[\\/]/).pop() ?? "";

/** The fields the search reads, best first: a match in the name says nothing, the rest say where. */
export const FIELDS = Object.freeze(["name", "navName", "folder", "notes", "playlist", "file"]);

/**
 * Where a query matches: "" in the name (or an empty query), the first other field a word was found
 * in, or null when some word is found nowhere. Every word must match somewhere.
 * @param {Record<string, string>} fields lower-cased, from searchFields
 * @param {string} query
 * @returns {string | null}
 */
export function matchWhy(fields, query) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  let why = "";
  for (const word of words) {
    const at = FIELDS.find(f => (fields[f] ?? "").includes(word));
    if (!at) return null;
    if (at !== "name" && !why) why = at;
  }
  return why;
}

/**
 * A card's search fields, lower-cased once: the file is the background's name and path.
 * @param {{ name?: string, navName?: string, folder?: string, notes?: string, playlist?: string, file?: string }} card
 */
export function searchFields({ name, navName, folder, notes, playlist, file }) {
  const low = s => String(s ?? "").toLowerCase();
  return { name: low(name), navName: low(navName), folder: low(folder), notes: low(notes), playlist: low(playlist), file: low(file) };
}

/** The rail's views, in order. */
export const VIEWS = Object.freeze(["all", "here", "nav", "off"]);

/**
 * Whether a card sits in a view: All; Active and viewed (the active scene, and the one this client
 * looks at); on the players' bar; off it; a folder ("f:<id>", its subfolders too) or no folder
 * ("f:"). The active scene is always on the bar, as Foundry draws it.
 * @param {{ active: boolean, viewed: boolean, nav: boolean, folders: string[] }} card folders: the
 *   scene's folder and every folder above it, nearest first
 * @param {string} view
 */
export function inView(card, view) {
  switch (view) {
    case "all":
      return true;
    case "here":
      return card.active || card.viewed;
    case "nav":
      return card.nav || card.active;
    case "off":
      return !card.nav && !card.active;
    default:
      if (view === "f:") return !card.folders.length;
      if (view?.startsWith("f:")) return card.folders.includes(view.slice(2));
      return false;
  }
}

/**
 * The folders as the rail draws them: a tree flattened in order, each with its depth and the count
 * of scenes in it and under it; a folder with none is left out.
 * @param {{ id: string, name: string, parent: string | null, sort?: number }[]} folders
 * @param {{ folders: string[] }[]} cards
 * @param {(a: string, b: string) => number} [byName]
 */
export function folderTree(folders, cards, byName = (a, b) => a.localeCompare(b)) {
  const count = new Map();
  for (const c of cards) for (const id of c.folders) count.set(id, (count.get(id) ?? 0) + 1);
  const kids = new Map();
  for (const f of folders) {
    const p = f.parent ?? "";
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p).push(f);
  }
  const out = [];
  const walk = (parent, depth) => {
    const list = (kids.get(parent) ?? []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || byName(a.name, b.name));
    for (const f of list) {
      const n = count.get(f.id) ?? 0;
      if (!n) continue;
      out.push({ id: f.id, name: f.name, depth, n });
      walk(f.id, depth + 1);
    }
  };
  walk("", 0);
  return out;
}

/**
 * A scene's size in grid squares (or hexes), rounded: "34 × 27".
 * @param {number} width pixels
 * @param {number} height pixels
 * @param {number} size the grid's pixels per square
 */
export function squares(width, height, size) {
  if (!(width > 0 && height > 0 && size > 0)) return "";
  return `${Math.round(width / size)} × ${Math.round(height / size)}`;
}

/**
 * What the card's one button does: Activate a scene that is not active, Pull everyone back to the
 * one that is (a player who wandered off on the bar).
 * @param {{ active: boolean }} card
 */
export const activateAs = card => (card.active ? "pull" : "activate");

/** How long Undo stays in reach, in milliseconds. */
export const UNDO_FOR = 10 * 60 * 1000;

/**
 * Whether an activation can be undone now: "ok", or why not. "none" when there is nothing to undo
 * or nothing was active before it; "expired" after UNDO_FOR; "changed" when another scene has been
 * activated since; "gone" when the scene to go back to was deleted.
 * @param {{ sceneId: string, previousId: string | null, at: number } | null} record
 * @param {{ activeId: string | null, exists: (id: string) => boolean, now: number }} world
 */
export function undoCheck(record, { activeId, exists, now }) {
  if (!record?.previousId) return "none";
  if (now - record.at > UNDO_FOR) return "expired";
  if (activeId !== record.sceneId) return "changed";
  if (!exists(record.previousId)) return "gone";
  return "ok";
}

/**
 * A list of recent rows, newest first, one per key, at most `max`.
 * @param {{ key: string }[] | null | undefined} list
 * @param {{ key: string }} row
 */
export function remember(list, row, max = 30) {
  return [row, ...(list ?? []).filter(r => r.key !== row.key)].slice(0, max);
}

/**
 * The darkness line for the panel: "Daylight", "Night", or a percentage between.
 * @param {number} level 0 to 1
 * @returns {"day" | "night" | number}
 */
export function darknessOf(level) {
  const d = Number(level) || 0;
  if (d <= 0.05) return "day";
  if (d >= 0.95) return "night";
  return Math.round(d * 100);
}
