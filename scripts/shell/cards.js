/**
 * A card picked in place: its edge and its pressed state set, the others' cleared, with no redraw, so
 * the second click of a double click lands on the same card (every case's rule: a click selects, a
 * double click, or Enter, does the case's one thing).
 */
export function markPicked(root, key) {
  for (const card of root?.querySelectorAll(".cc-card[data-key]") ?? []) {
    const on = card.dataset.key === key;
    card.classList.toggle("on", on);
    card.querySelector('[data-action="pick"]')?.setAttribute("aria-pressed", String(on));
  }
}

/** A pick's click: a single click selects; a double click, or Enter or Space (no click count), acts. */
export const acts = event => (event?.detail ?? 0) !== 1;
