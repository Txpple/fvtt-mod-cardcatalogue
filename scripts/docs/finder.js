/**
 * The finder of an actors or items case: a search box over the case's cards, opened by its key.
 * Empty, it lists the pins and what was opened lately; typing narrows, the arrows move, Enter does
 * the case's one thing (opens the sheet), Shift+Enter opens the chevron in the window, Ctrl+Enter
 * the case's second action, Escape clears and then closes. The list redraws by itself, never the
 * window, so the caret never leaves the box.
 */

import { log, MODULE_ID, t as rootT } from "../common.js";
import { matchWhy, searchFields } from "./decide.js";
import { casesCards } from "./library.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MAX = 14;

const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Build a case's finder class from its spec, its window and its record. */
export function makeCaseFinder(spec, CaseWindow, record) {
  const { t } = spec;

  class CaseFinder extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `cardcatalogue-${spec.id}-finder`,
      classes: ["cardcatalogue", "cardcatalogue-docs-finder", `cardcatalogue-${spec.id}-finder`],
      window: { title: `${MODULE_ID}.${spec.id}.finder.title`, icon: "fa-solid fa-magnifying-glass", resizable: false, minimizable: false },
      position: { width: 640, height: "auto", top: 90 }
    };

    static PARTS = { main: { template: `modules/${MODULE_ID}/templates/docs/finder.hbs` } };

    static current = null;

    /** Open the finder fresh, or close it when it is open (the key toggles it). */
    static toggle() {
      const app = CaseFinder.current;
      if (app?.rendered) return app.close();
      CaseFinder.current = new CaseFinder();
      return CaseFinder.current.render({ force: true });
    }

    #query = "";
    #at = 0;
    #rows = [];
    #cards = [];

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.id = spec.id;
      context.placeholder = t("finder.placeholder");
      context.title = t("finder.title");
      context.enter = t(spec.primary.label);
      context.ctrlEnter = spec.second ? t(spec.second.label) : null;
      context.move = rootT("docs.move");
      context.more = rootT("docs.moreActions");
      return context;
    }

    /** @override */
    _onRender(context, options) {
      super._onRender(context, options);
      this.#cards = casesCards(spec);
      const input = this.element.querySelector("input[name=find]");
      input.addEventListener("input", ev => {
        this.#query = ev.currentTarget.value;
        this.#at = 0;
        this.#draw();
      });
      input.addEventListener("keydown", ev => this.#key(ev));
      const list = this.element.querySelector(".cc-results");
      list.addEventListener("mousedown", ev => ev.preventDefault());
      list.addEventListener("click", ev => {
        const row = ev.target.closest("[data-index]");
        if (!row) return;
        this.#at = Number(row.dataset.index);
        if (ev.detail >= 2) void this.#act("go");
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
        const rec = record.load();
        const byKey = new Map(this.#cards.map(c => [c.key, c]));
        const pinned = rec.pins.map(k => byKey.get(k)).filter(Boolean);
        const recent = rec.recent
          .map(r => byKey.get(r.key))
          .filter(c => c && !pinned.includes(c))
          .slice(0, 6);
        return [
          { label: rootT("docs.finderPinned"), rows: pinned.map(card => ({ card, why: "" })) },
          { label: rootT("docs.finderRecent"), rows: recent.map(card => ({ card, why: "" })) }
        ].filter(g => g.rows.length);
      }
      const hits = [];
      for (const card of this.#cards) {
        const why = matchWhy(searchFields(card, spec.fields), q, spec.fields);
        if (why !== null) hits.push({ card, why, rank: spec.fields.indexOf(why === "" ? "name" : why) });
      }
      hits.sort((a, b) => a.rank - b.rank || a.card.name.localeCompare(b.card.name, game.i18n.lang, { numeric: true }));
      const label = hits.length > MAX ? rootT("docs.matchesMore", { n: hits.length, shown: MAX }) : rootT("docs.matches", { n: hits.length });
      return [{ label, rows: hits.slice(0, MAX) }];
    }

    #draw() {
      const groups = this.#results();
      this.#rows = groups.flatMap(g => g.rows);
      if (this.#at >= this.#rows.length) this.#at = Math.max(0, this.#rows.length - 1);
      let i = 0;
      const enter = t(spec.primary.label);
      const html = groups
        .map(g => {
          const rows = g.rows
            .map(({ card, why }) => {
              const index = i++;
              const on = index === this.#at;
              const sub = [card.sub || card.folder].filter(Boolean).join(" · ");
              const thumb = card.picture ? `<img src="${esc(card.picture)}" alt="" loading="lazy">` : `<i class="fa-solid ${spec.primary.icon}" inert></i>`;
              return `<li class="cc-res${on ? " on" : ""}" id="cardcatalogue-${spec.id}-finder-row-${index}" data-index="${index}" role="option" aria-selected="${on}">
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
      list.innerHTML = html || `<li class="cc-res-none" role="presentation">${esc(this.#query.trim() ? t("empty.search") : rootT("docs.finderEmpty"))}</li>`;
      const input = this.element.querySelector("input[name=find]");
      if (this.#rows.length) input.setAttribute("aria-activedescendant", `cardcatalogue-${spec.id}-finder-row-${this.#at}`);
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
          return void this.#act(ev.ctrlKey || ev.metaKey ? "second" : ev.shiftKey ? "menu" : "go");
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
        if (how === "menu") return CaseWindow.open({ key: card.key, menu: game.user.isGM || !!spec.playerMenu });
        if (how === "second" && spec.second && game.user.isGM) return await spec.second.run(card.doc);
        await spec.primary.run(card.doc);
        record.noteOpened(card.key);
      } catch (err) {
        log.error(`the ${spec.id} finder's action failed`, err);
        ui.notifications.error(rootT("docs.failed"));
      }
    }
  }

  return CaseFinder;
}
