// @ts-check
/**
 * What the actors and items cases work out without Foundry: the search over a case's own fields,
 * the rail's views, a challenge rating's words. Pure, tested in tests/docs.test.js.
 */

/**
 * Where a query matches, over the fields a case names, best first: "" in the name (or an empty
 * query), the first other field a word was found in, or null when some word is found nowhere.
 * @param {Record<string, string>} fields lower-cased
 * @param {string} query
 * @param {readonly string[]} order the case's fields, "name" first
 * @returns {string | null}
 */
export function matchWhy(fields, query, order) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  let why = "";
  for (const word of words) {
    const at = order.find(f => (fields[f] ?? "").includes(word));
    if (!at) return null;
    if (at !== "name" && !why) why = at;
  }
  return why;
}

/**
 * A card's search fields, lower-cased once.
 * @param {Record<string, unknown>} card
 * @param {readonly string[]} order
 */
export function searchFields(card, order) {
  return Object.fromEntries(order.map(f => [f, String(card[f] ?? "").toLowerCase()]));
}

/**
 * Whether a card sits in a view: All; a type ("t:<type>"); a folder ("f:<id>", its subfolders
 * too) or no folder ("f:"); the user's own ("mine"); on the viewed scene ("here").
 * @param {{ type: string, folders: string[], mine?: boolean, here?: boolean }} card
 * @param {string} view
 */
export function inView(card, view) {
  if (view === "all") return true;
  if (view === "mine") return !!card.mine;
  if (view === "here") return !!card.here;
  if (view?.startsWith("t:")) return card.type === view.slice(2);
  if (view === "f:") return !card.folders.length;
  if (view?.startsWith("f:")) return card.folders.includes(view.slice(2));
  return false;
}

/**
 * The types the cards hold, in the order a case lists them (a type the case does not list comes
 * after, in the order met), each with its count.
 * @param {{ type: string }[]} cards
 * @param {readonly string[]} order
 */
export function typeCounts(cards, order = []) {
  const n = new Map();
  for (const c of cards) n.set(c.type, (n.get(c.type) ?? 0) + 1);
  const known = order.filter(t => n.has(t));
  const rest = [...n.keys()].filter(t => !order.includes(t));
  return [...known, ...rest].map(type => ({ type, n: n.get(type) ?? 0 }));
}

/**
 * Cards in a case's type order (a type it does not list after, by its name), then by name.
 * @param {readonly string[]} order
 * @param {(a: string, b: string) => number} byName
 * @returns {(a: { type: string, name: string }, b: { type: string, name: string }) => number}
 */
export function byType(order, byName) {
  const rank = type => {
    const i = order.indexOf(type);
    return i < 0 ? order.length : i;
  };
  return (a, b) => rank(a.type) - rank(b.type) || (rank(a.type) === order.length ? byName(a.type, b.type) : 0) || byName(a.name, b.name);
}

/**
 * Is this actor dnd5e's own world copy of a summoned creature (its import, flagged `isAutoImported`;
 * `summonedCopy` on older systems)? By the Books keeps the same mark; a creature the table made
 * itself never carries it.
 * @param {{ flags?: { dnd5e?: { isAutoImported?: boolean, summonedCopy?: boolean } } } | null | undefined} actor
 */
export const isSummonCopy = actor => !!(actor?.flags?.dnd5e?.isAutoImported || actor?.flags?.dnd5e?.summonedCopy);

/**
 * A challenge rating in the book's words: 1/8, 1/4, 1/2, then whole numbers.
 * @param {unknown} cr
 */
export function crLabel(cr) {
  const n = Number(cr);
  if (cr === null || cr === undefined || cr === "" || !Number.isFinite(n)) return "";
  if (n === 0.125) return "1/8";
  if (n === 0.25) return "1/4";
  if (n === 0.5) return "1/2";
  return String(n);
}

/**
 * A card in an export: who it is and where it lives, its card line, its picture's file, then each of
 * the case's search fields it has (read for the exporting user, so a player's carries no owners and
 * no text they cannot read).
 * @param {{ key: string, name: string, type: string, sub?: string, folder?: string, picture?: string | null } & Record<string, unknown>} card
 * @param {readonly string[]} fields
 */
export function docEntry(card, fields) {
  /** @type {Record<string, unknown>} */
  const entry = {
    name: card.name,
    uuid: card.key,
    type: card.type,
    line: card.sub || "",
    folder: card.folder || null,
    img: card.picture || null
  };
  for (const f of fields) if (!(f in entry) && card[f]) entry[f] = card[f];
  return entry;
}

/**
 * The recent list: newest first, one per key, at most `max`.
 * @param {{ key: string }[] | null | undefined} list
 * @param {{ key: string }} row
 */
export function remember(list, row, max = 30) {
  return [row, ...(list ?? []).filter(r => r.key !== row.key)].slice(0, max);
}
