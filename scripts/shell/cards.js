/**
 * A card picked in place: its edge and its pressed state set, the others' cleared, with no redraw, so
 * the second click of a double click lands on the same card (every case's rule: a click selects, a
 * double click, or Enter, does the case's one thing).
 */
export function markPicked(root, key) {
  const picked = key instanceof Set ? key : new Set([key]);
  for (const card of root?.querySelectorAll(".cc-card[data-key]") ?? []) {
    const on = picked.has(card.dataset.key);
    card.classList.toggle("on", on);
    card.querySelector('[data-action="pick"]')?.setAttribute("aria-pressed", String(on));
  }
}

/** The keys of the cards drawn and not hidden by the search, in the order drawn (a Shift run's order). */
export const drawnKeys = root => [...(root?.querySelectorAll(".cc-card[data-key]") ?? [])].filter(c => !c.hidden).map(c => c.dataset.key);

/** A click that adds to the pick or runs it (Ctrl, Cmd or Shift held) rather than picking one card. */
export const extends_ = event => !!(event?.ctrlKey || event?.metaKey || event?.shiftKey);

/** A pick's click: a single click selects; a double click, or Enter or Space (no click count), acts. */
export const acts = event => (event?.detail ?? 0) !== 1;
