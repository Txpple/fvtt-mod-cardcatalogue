/**
 * The finder: a search box over the scenes, opened by the keybinding. Empty, it lists the scenes
 * active lately; typing narrows, the arrows move, Enter views the pick (only the DM
 * moves, so a stray Enter never moves the table), Shift+Enter opens its chevron in the window,
 * Ctrl+Enter activates it, Escape clears and then closes. The list redraws by itself, never the
 * window, so the caret never leaves the box.
 */

import { log, MODULE_ID, t } from "./common.js";
import { matchWhy, searchFields } from "./decide.js";
import { ScenesWindow, sceneCards } from "./library.js";
import * as memory from "./memory.js";
import * as scenes from "./scenes.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const RANK = { "": 0, navName: 1, folder: 2, notes: 3, playlist: 4, file: 5 };
const MAX = 14;

const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export class Finder extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "cardcatalogue-scenes-finder",
    classes: ["cardcatalogue", "cardcatalogue-scenes-finder"],
    window: { title: `${MODULE_ID}.scenes.finder.title`, icon: "fa-solid fa-magnifying-glass", resizable: false, minimizable: false },
    position: { width: 640, height: "auto", top: 90 }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/scenes/finder.hbs` } };

  static current = null;

  /** Open the finder fresh, or close it when it is open (the key toggles it). */
  static toggle() {
    const app = Finder.current;
    if (app?.rendered) return app.close();
    Finder.current = new Finder();
    return Finder.current.render({ force: true });
  }

  #query = "";
  #at = 0;
  #rows = [];
  #cards = [];

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.#cards = sceneCards();
    const input = this.element.querySelector("input[name=find]");
    input.addEventListener("input", ev => {
      this.#query = ev.currentTarget.value;
      this.#at = 0;
      this.#draw();
    });
    input.addEventListener("keydown", ev => this.#key(ev));
    const list = this.element.querySelector(".cc-results");
    // A row is not a focus stop: the caret stays in the box, so the keys keep working.
    list.addEventListener("mousedown", ev => ev.preventDefault());
    list.addEventListener("click", ev => {
      const row = ev.target.closest("[data-index]");
      if (!row) return;
      this.#at = Number(row.dataset.index);
      if (ev.detail >= 2) void this.#act("view");
      else this.#draw();
    });
    this.#draw();
    if (options.isFirstRender) {
      const width = Math.min(640, window.innerWidth - 32);
      this.setPosition({ width, left: Math.max(16, (window.innerWidth - width) / 2), top: 90 });
    }
    input.focus();
  }

  #results() {
    const q = this.#query.trim();
    if (!q) {
      const record = memory.load();
      const byKey = new Map(this.#cards.map(c => [c.key, c]));
      const recent = record.recent
        .map(r => byKey.get(r.key))
        .filter(Boolean)
        .slice(0, 8);
      return [{ label: t("finder.recent"), rows: recent.map(card => ({ card, why: "" })) }].filter(g => g.rows.length);
    }
    const hits = [];
    for (const card of this.#cards) {
      const why = matchWhy(searchFields(card), q);
      if (why !== null) hits.push({ card, why, rank: RANK[why] ?? 9 });
    }
    hits.sort((a, b) => a.rank - b.rank || a.card.name.localeCompare(b.card.name, game.i18n.lang, { numeric: true }));
    const label = hits.length > MAX ? t("finder.matchesMore", { n: hits.length, shown: MAX }) : t("finder.matches", { n: hits.length });
    return [{ label, rows: hits.slice(0, MAX) }];
  }

  #draw() {
    const groups = this.#results();
    this.#rows = groups.flatMap(g => g.rows);
    if (this.#at >= this.#rows.length) this.#at = Math.max(0, this.#rows.length - 1);
    let i = 0;
    const html = groups
      .map(g => {
        const rows = g.rows
          .map(({ card, why }) => {
            const index = i++;
            const on = index === this.#at;
            const state = card.active ? t("badge.active") : card.viewed ? t("badge.here") : "";
            const sub = [card.folder || t("rail.noFolder"), state].filter(Boolean).join(" · ");
            const thumb = card.thumb ? `<img src="${esc(card.thumb)}" alt="" loading="lazy">` : `<i class="fa-solid fa-map" inert></i>`;
            const enter = card.viewed ? t("finder.enterHere") : t("finder.enterView");
            return `<li class="cc-res${on ? " on" : ""}" id="cardcatalogue-scenes-finder-row-${index}" data-index="${index}" role="option" aria-selected="${on}">
              <span class="cc-res-th">${thumb}</span>
              <span class="cc-res-tx"><span class="cc-res-nm">${esc(card.name)}</span><span class="cc-res-sub">${esc(sub)}${why ? ` <span class="cc-why">· ${esc(t(`why.${why}`))}</span>` : ""}</span></span>
              ${on ? `<span class="cc-res-go"><kbd>Enter</kbd> ${esc(enter)}</span>` : ""}
            </li>`;
          })
          .join("");
        return `<li class="cc-res-group" role="presentation">${esc(g.label)}</li>${rows}`;
      })
      .join("");
    const list = this.element.querySelector(".cc-results");
    list.innerHTML = html || `<li class="cc-res-none" role="presentation">${esc(this.#query.trim() ? t("finder.none") : t("finder.empty"))}</li>`;
    const input = this.element.querySelector("input[name=find]");
    if (this.#rows.length) input.setAttribute("aria-activedescendant", `cardcatalogue-scenes-finder-row-${this.#at}`);
    else input.removeAttribute("aria-activedescendant");
    list.querySelector(".cc-res.on")?.scrollIntoView({ block: "nearest" });
  }

  #key(ev) {
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        this.#at = Math.min(this.#at + 1, Math.max(0, this.#rows.length - 1));
        return this.#draw();
      case "ArrowUp":
        ev.preventDefault();
        this.#at = Math.max(this.#at - 1, 0);
        return this.#draw();
      case "Enter":
        ev.preventDefault();
        return void this.#act(ev.ctrlKey || ev.metaKey ? "activate" : ev.shiftKey ? "menu" : "view");
      case "Escape":
        ev.preventDefault();
        ev.stopPropagation();
        if (this.#query) {
          this.#query = "";
          ev.currentTarget.value = "";
          this.#at = 0;
          return this.#draw();
        }
        return void this.close();
    }
  }

  async #act(how) {
    const row = this.#rows[this.#at];
    if (!row) return;
    const { card } = row;
    try {
      await this.close();
      if (how === "menu") return ScenesWindow.open({ key: card.key, menu: true });
      if (how === "activate") {
        const res = await scenes.activate(card.scene);
        // The activation's Undo lives in the scenes case window's strip; the toast says where.
        if (res === "activated") ui.notifications.info(t("activate.doneFinder", { name: card.name }));
        else if (res === "pulled") ui.notifications.info(t("activate.pulled", { name: card.name }));
        return ScenesWindow.refresh();
      }
      if (!card.viewed) await scenes.view(card.scene);
    } catch (err) {
      log.error("the finder's action failed", err);
      ui.notifications.error(t("error.action"));
    }
  }
}
