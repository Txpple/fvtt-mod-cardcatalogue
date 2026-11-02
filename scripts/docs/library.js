/**
 * The window the actors, items and compendium cases share: a collection's entries as cards, in the
 * journal case's look and with its habits. A rail (the case's views, its types, its folders), the cards
 * (each with the case's one button and a chevron of the rest; a click does the one thing), a search that
 * filters the drawn cards and never redraws. Each case gives a spec (actors.js, items.js): its
 * collection, its fields, how a document becomes a card, its one action and its chevron. The
 * window writes nothing itself: every write is a spec's action, each one the stock directory or
 * sheet makes. What only it needs (opened lately, the view, the size) lives in the browser.
 *
 * An entry is a document by default: keyed by its UUID, its `img` its picture, filed by its `folder`.
 * A spec whose entries are not documents (the compendium case's packs) says how instead: `keyOf`,
 * `resolve`, `nameOf`, `pictureOf`, `canSee`, `dragData`, `file`, `directory` and `row` (its
 * right-click's stand-in row).
 */

import { log, MODULE_ID, t as rootT } from "../common.js";
import { collapseTree, folderTree } from "../scenes/decide.js";
import { openClassic, setClassic, stripContext, switchCase } from "../shell/cases.js";
import { acts, markPicked } from "../shell/cards.js";
import { entryMenu } from "../shell/entries.js";
import { exportInView } from "../shell/export.js";
import { folderMenu, newFolder } from "../shell/folders.js";
import { byType, docEntry, inView, matchWhy, searchFields, typeCounts } from "./decide.js";
import { createRecord } from "./memory.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SIZES = ["s", "m", "l"];

const byName = (a, b) => a.localeCompare(b, game.i18n.lang, { sensitivity: "base", numeric: true });

/** A folder's chain, nearest first. */
function chainOf(folder) {
  const list = [];
  for (let f = folder; f; f = f.folder) list.push(f);
  return list;
}

/**
 * The cards of a case: one per document the user can see, in the directory's shape (by folder
 * path, then by name), or by type, then name, for a case whose spec says `order: "type"`. A spec's
 * `card(doc)` adds the case's own fields.
 */
export function casesCards(spec, user = game.user) {
  const canSee = spec.canSee ?? ((doc, u) => u.isGM || doc.testUserPermission(u, "LIMITED"));
  return spec
    .collection()
    .contents.filter(doc => canSee(doc, user) && !spec.hidden?.(doc, user))
    .map(doc => {
      const chain = chainOf(doc.folder);
      // A player is not told the name of a folder the stock directory hides from them.
      const folders = user.isGM ? chain : chain.filter(f => f.visible !== false);
      return {
        key: spec.keyOf ? spec.keyOf(doc) : doc.uuid,
        doc,
        name: spec.nameOf ? spec.nameOf(doc) : doc.name,
        picture: (spec.pictureOf ? spec.pictureOf(doc) : doc.img) || null,
        folder: folders
          .map(f => f.name)
          .reverse()
          .join(" › "),
        folders: folders.map(f => f.id),
        ...spec.card(doc, user)
      };
    })
    .sort(spec.order === "type" ? byType(spec.typeOrder, byName) : (a, b) => byName(a.folder, b.folder) || byName(a.name, b.name));
}

/** A card's entry from its key: a document by its UUID, unless the spec resolves its own. */
export const resolveOf = spec => key => (spec.resolve ? spec.resolve(key) : fromUuidSync(key));

/** Build a case's window class from its spec. */
export function makeCaseWindow(spec) {
  const record = createRecord(spec.id);
  const resolve = resolveOf(spec);
  const { t } = spec;
  const counted = (n, base) => t(n === 1 ? `${base}One` : base, { n });

  class CaseWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `cardcatalogue-${spec.id}-library`,
      classes: ["cardcatalogue", "cardcatalogue-docs", `cardcatalogue-${spec.id}-library`],
      window: { title: `${MODULE_ID}.cases.${spec.id}`, icon: `fa-solid ${spec.icon}`, resizable: true },
      position: { width: 1180, height: 800 },
      actions: {
        size(_ev, target) {
          this.size = target.dataset.size;
          record.setPrefs({ size: this.size });
          this.render();
        },
        rail(_ev, target) {
          this.view = target.dataset.view;
          this.sticky = null;
          record.setPrefs({ view: this.view });
          this.render();
        },
        searchAll() {
          this.view = "all";
          this.sticky = null;
          record.setPrefs({ view: "all" });
          this.render();
        },
        pick(event, target) {
          const key = target.closest("[data-key]")?.dataset.key;
          if (!key) return;
          // A click selects; a double click, or Enter, does the case's one thing (the user's ruling).
          this.selected = key;
          if (this.sticky !== key) this.sticky = null;
          if (!acts(event)) return markPicked(this.element, key);
          return this.go(key);
        },
        go(event, target) {
          event.stopPropagation();
          if (event.detail > 1) return;
          const key = target.closest("[data-key]")?.dataset.key ?? this.selected;
          if (key) return this.go(key);
        },
        openMenu(event, target) {
          event.stopPropagation();
          const key = target.closest("[data-key]")?.dataset.key ?? this.selected;
          if (!key) return;
          this.menu = key;
          this.menuFresh = true;
          this.render();
        },
        closeMenu() {
          this.closeMenu();
        },
        act(_ev, target) {
          return this.act(target.dataset.act, target.dataset.arg ?? null, target);
        },
        classic() {
          return this.close().then(() => setClassic(spec.id, true));
        },
        case(_ev, target) {
          return switchCase(this, target.dataset.case);
        },
        /** A folder's caret: what is under it shown or hidden, remembered in this browser. */
        toggleFolder(event, target) {
          event.stopPropagation();
          record.toggleCollapsed(target.dataset.folder);
          this.render();
        },
        /** The cards in view, as the search leaves them, saved as a JSON file. */
        export() {
          const cards = new Map(casesCards(spec).map(c => [c.key, c]));
          exportInView(this.element, {
            caseId: spec.id,
            heading: this.#heading(this.view),
            search: this.query,
            entryOf: key => (cards.has(key) ? docEntry(cards.get(key), spec.fields) : null)
          });
        },
        /** A new folder, inside the one in view when it can be; the rail then shows it, to drop cards on. */
        async newFolder() {
          const parent = this.view?.startsWith("f:") ? this.view.slice(2) || null : null;
          let folder = null;
          try {
            folder = await newFolder(spec.documentName, parent);
          } catch (err) {
            log.error("making the folder failed", err);
            ui.notifications.error(rootT("docs.failed"));
          }
          if (!folder) return;
          this.view = `f:${folder.id}`;
          this.sticky = null;
          record.setPrefs({ view: this.view });
          this.render();
        }
      }
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/docs/library.hbs`, scrollable: [".cc-cards", ".cc-rail"] }
    };

    static current = null;

    /** Open the window, or bring it forward; `key` picks a card, `menu` opens its chevron. */
    static open({ key = null, menu = false, position = null } = {}) {
      CaseWindow.current ??= new CaseWindow();
      const app = CaseWindow.current;
      if (key) {
        app.selected = key;
        app.sticky = key;
        app.query = "";
        if (menu) {
          app.menu = key;
          app.menuFresh = true;
        }
      }
      if (app.rendered) {
        app.bringToFront();
        if (position) app.setPosition(position);
        if (key) app.render();
        return app;
      }
      app.render({ force: true, ...(position ? { position } : {}) }).catch(err => {
        log.error(`the ${spec.id} case failed to open; Foundry's directory opens instead`, err);
        openClassic(spec.id);
      });
      return app;
    }

    static #timer = null;

    /** Redraw when open, once per burst of changes. */
    static refresh() {
      clearTimeout(CaseWindow.#timer);
      CaseWindow.#timer = setTimeout(() => {
        const app = CaseWindow.current;
        if (app?.rendered && !app.minimized) app.render();
      }, 200);
    }

    static #dragging = null;

    view = "all";
    size = "m";
    query = "";
    selected = null;
    menu = null;
    menuFresh = false;
    sticky = null;
    #fields = new Map();
    #inView = new Set();
    #focus = null;
    #returnTo = null;
    #busy = new Set();

    constructor(options) {
      super(options);
      const prefs = record.load();
      this.size = SIZES.includes(prefs.size) ? prefs.size : "m";
      this.view = prefs.view ?? "all";
    }

    /** The case this window is, for the strip. */
    get caseId() {
      return spec.id;
    }

    /** The case's views for this user: its fixed ones, then its types, then the folders. */
    #validView(view, fixed, types) {
      if (fixed.includes(view)) return true;
      if (view.startsWith("t:")) return types.includes(view.slice(2));
      if (view === "f:") return true;
      if (view.startsWith("f:")) return game.folders.get(view.slice(2))?.type === spec.documentName;
      return false;
    }

    #heading(view) {
      if (view === "f:") return t("rail.noFolder");
      if (view.startsWith("f:")) return game.folders.get(view.slice(2))?.name ?? "";
      if (view.startsWith("t:")) return spec.typeLabel(view.slice(2), true);
      return t(`view.${view}`);
    }

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const gm = game.user.isGM;
      const all = casesCards(spec);
      const fixed = ["all", ...spec.views(game.user)];
      const types = typeCounts(all, spec.typeOrder);
      if (!this.#validView(this.view, fixed, types.map(x => x.type))) this.view = "all";
      const view = this.view;
      const list = all.filter(c => c.key === this.sticky || inView(c, view));
      this.#fields = new Map(all.map(c => [c.key, searchFields(c, spec.fields)]));
      this.#inView = new Set(list.map(c => c.key));

      const folders = game.folders
        .filter(f => f.type === spec.documentName && (gm || f.visible !== false))
        .map(f => ({ id: f.id, name: f.name, parent: f.folder?.id ?? null, sort: f.sort }));
      const tree = folderTree(folders, all, byName, { keepEmpty: gm });
      const loose = all.filter(c => !c.folders.length).length;

      context.cases = stripContext(spec.id);
      context.isGM = gm;
      context.iconCards = !!spec.iconCards;
      context.size = this.size;
      context.query = this.query;
      context.placeholder = t("search.placeholder");
      context.railLabel = t("rail.label");
      context.railKey = t("rail.key");
      context.sizes = SIZES.map(id => ({ id, label: rootT(`size.${id}`), aria: rootT(`size.${id}Aria`), on: this.size === id }));
      context.views = fixed.map(id => ({ id, label: t(`view.${id}`), n: all.filter(c => inView(c, id)).length, on: view === id }));
      context.types = types.length > 1 ? types.map(x => ({ id: `t:${x.type}`, label: spec.typeLabel(x.type, true), n: x.n, on: view === `t:${x.type}` })) : [];
      context.folders = collapseTree(tree, new Set(record.load().collapsed)).map(f => ({ ...f, on: view === `f:${f.id}`, indent: f.depth }));
      // For the GM, Unfiled stays a drop target while there are folders, even with nothing in it.
      context.loose = tree.length && (loose || gm) ? { n: loose, on: view === "f:", label: t("rail.noFolder") } : null;
      context.showFolders = gm || tree.length > 0;
      context.heading = this.#heading(view);
      context.cards = list.map(c => this.#cardContext(c));
      context.countBase = counted(list.filter(c => inView(c, view)).length, "count.cards");
      context.emptyText = t(`empty.${view.startsWith("f:") ? "folder" : view.startsWith("t:") ? "type" : view}`);
      context.menu = this.menu ? this.#menuContext(all) : null;
      context.goIcon = spec.primary.icon;
      context.goLabel = t(spec.primary.label);
      context.hasMenu = gm || spec.playerMenu;
      context.labels = {
        menu: t("menu.label"),
        classic: rootT("docs.classic"),
        classicHint: t("classic.hint"),
        exportHint: rootT("export.hint")
      };
      return context;
    }

    #cardContext(card) {
      return {
        key: card.key,
        name: card.name,
        picture: card.picture,
        sub: card.sub || card.folder,
        badge: card.badge ?? null,
        badgeCls: card.badgeCls ?? "",
        icons: card.icons ?? [],
        selected: this.selected === card.key,
        folderId: card.folders[0] ?? ""
      };
    }

    #menuContext(all) {
      const card = all.find(c => c.key === this.menu);
      if (!card) {
        this.menu = null;
        return null;
      }
      return {
        name: card.name,
        picture: card.picture,
        rows: spec.menu(card.doc, game.user).map(r => ({
          ...r,
          label: t(r.label),
          hint: r.hint ? t(r.hint) : "",
          empty: r.empty ? t(r.empty) : "",
          choices: r.choices?.map(c => ({ ...c, act: r.act })) ?? null
        }))
      };
    }

    /** The case's one thing: the spec's primary action, noted as opened lately. */
    async go(key) {
      if (this.#busy.has(key)) return;
      const doc = resolve(key);
      if (!doc) return;
      this.#busy.add(key);
      try {
        await spec.primary.run(doc);
        record.noteOpened(key);
      } catch (err) {
        log.error(`the ${spec.id} case's action failed`, err);
        ui.notifications.error(rootT("docs.failed"));
      } finally {
        this.#busy.delete(key);
      }
    }

    /** A chevron or panel action by name: the chevron closes first, focus goes back to its card. */
    async act(name, arg, target) {
      const key = target?.closest?.("[data-key]")?.dataset.key ?? this.menu ?? this.selected;
      const doc = key ? resolve(key) : null;
      if (this.menu) {
        this.#returnTo = this.menu;
        this.menu = null;
      }
      const row = doc ? spec.menu(doc, game.user).find(r => r.act === name) : null;
      if (row && !row.disabled) {
        try {
          await row.run(doc, arg);
        } catch (err) {
          log.error(`the ${spec.id} case's ${name} failed`, err);
          ui.notifications.error(err?.message || rootT("docs.failed"));
        }
      }
      this.render();
    }

    closeMenu() {
      if (!this.menu) return;
      this.#returnTo = this.menu;
      this.menu = null;
      this.render();
    }

    /** @override */
    async _preRender(context, options) {
      await super._preRender(context, options);
      const active = this.element?.contains(document.activeElement) ? document.activeElement : null;
      this.#focus = active
        ? {
            name: active.name || null,
            action: active.dataset?.action ?? null,
            key: active.closest("[data-key]")?.dataset.key ?? null,
            view: active.dataset?.view ?? null,
            start: active.selectionStart ?? null
          }
        : null;
    }

    /** @override */
    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      folderMenu(this.element);
      // A right-click selects the card and opens the stock directory's own menu for it.
      entryMenu(
        this.element,
        () => spec.directory?.() ?? spec.collection().directory,
        key => {
          this.selected = key;
          if (this.sticky !== key) this.sticky = null;
          markPicked(this.element, key);
        },
        spec.row
      );
      this.element.addEventListener("keydown", ev => {
        if (this.menu && ev.key === "Escape") {
          ev.preventDefault();
          ev.stopPropagation();
          return this.closeMenu();
        }
        const typing = ev.target.closest?.("input, textarea, select, [contenteditable]");
        if (ev.key === "/" && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
          ev.preventDefault();
          this.element.querySelector("input[name=search]")?.focus();
        }
      });
    }

    /** @override */
    _onRender(context, options) {
      super._onRender(context, options);
      const root = this.element;
      const input = root.querySelector("input[name=search]");
      input?.addEventListener("input", ev => {
        this.query = ev.currentTarget.value;
        this.#filter();
      });
      input?.addEventListener("keydown", ev => {
        if (ev.key === "Escape" && this.query) {
          ev.preventDefault();
          ev.stopPropagation();
          ev.currentTarget.value = "";
          this.query = "";
          this.#filter();
        }
      });
      root.querySelector(".cc-veil")?.addEventListener("click", ev => {
        if (ev.target === ev.currentTarget) this.closeMenu();
      });
      this.#wireDrag(root);
      this.#filter();
      this.#restoreFocus(options, context);
    }

    #restoreFocus(options, context) {
      const root = this.element;
      if (context.menu && this.menuFresh) {
        this.menuFresh = false;
        return root.querySelector(".cc-opts .cc-menu button:not([disabled])")?.focus();
      }
      const back = this.#returnTo;
      this.#returnTo = null;
      if (back) {
        const el = root.querySelector(`.cc-card[data-key="${CSS.escape(back)}"] [data-action="openMenu"]`) ?? root.querySelector('.cc-detail [data-action="openMenu"]');
        if (el && !el.closest("[hidden]")) return el.focus({ preventScroll: true });
      }
      const f = this.#focus;
      this.#focus = null;
      if (!f) {
        if (options.isFirstRender) root.querySelector("input[name=search]")?.focus();
        return;
      }
      let el = null;
      if (f.name) el = root.querySelector(`[name="${CSS.escape(f.name)}"]`);
      else if (f.action) {
        const scope = f.key ? root.querySelector(`[data-key="${CSS.escape(f.key)}"]`) : root;
        el = scope?.querySelector(`[data-action="${CSS.escape(f.action)}"]${f.view ? `[data-view="${CSS.escape(f.view)}"]` : ""}`);
      }
      if (!el || el.closest("[hidden]")) el = root.querySelector("input[name=search]");
      el?.focus({ preventScroll: true });
      if (f.start !== null && typeof el?.setSelectionRange === "function") {
        try {
          el.setSelectionRange(f.start, f.start);
        } catch {
          // Not a text field.
        }
      }
    }

    /** The search, applied to the drawn cards: no redraw, so the caret and the scroll stay. */
    #filter() {
      const root = this.element;
      if (!root) return;
      const q = this.query.trim();
      let shown = 0;
      for (const card of root.querySelectorAll(".cc-card[data-key]")) {
        const why = matchWhy(this.#fields.get(card.dataset.key) ?? {}, q, spec.fields);
        card.hidden = why === null;
        if (why !== null) shown++;
        const label = card.querySelector(".cc-why");
        if (label) label.textContent = why ? t(`why.${why}`) : "";
      }
      const count = root.querySelector(".cc-count");
      if (count) count.textContent = q ? rootT("docs.matching", { n: shown, q }) : (count.dataset.base ?? "");
      let elsewhere = 0;
      if (q) for (const [key, fl] of this.#fields) if (!this.#inView.has(key) && matchWhy(fl, q, spec.fields) !== null) elsewhere++;
      const more = root.querySelector(".cc-more");
      if (more) {
        more.hidden = !elsewhere;
        more.textContent = elsewhere ? rootT("docs.more", { n: elsewhere }) : "";
      }
      const empty = root.querySelector(".cc-empty");
      if (empty) {
        empty.hidden = shown > 0;
        empty.textContent = !q ? (empty.dataset.view ?? "") : elsewhere ? rootT("docs.searchHere", { q }) : t("empty.search");
      }
    }

    #wireDrag(root) {
      for (const card of root.querySelectorAll(".cc-card[data-key]")) {
        card.addEventListener("dragstart", ev => {
          CaseWindow.#dragging = { key: card.dataset.key, folder: card.dataset.folder || "" };
          card.classList.add("dragging");
          ev.dataTransfer.effectAllowed = "copyMove";
          // Foundry's own drag: an actor dropped on the canvas makes a token, an item on a sheet a copy.
          const data = spec.dragData ? spec.dragData(card.dataset.key) : { type: spec.documentName, uuid: card.dataset.key };
          ev.dataTransfer.setData("text/plain", JSON.stringify(data));
        });
        card.addEventListener("dragend", () => {
          CaseWindow.#dragging = null;
          card.classList.remove("dragging");
          for (const el of root.querySelectorAll(".drop-ok")) el.classList.remove("drop-ok");
        });
      }
      if (!game.user.isGM) return;
      for (const row of root.querySelectorAll("[data-drop]")) {
        row.addEventListener("dragover", ev => {
          const d = CaseWindow.#dragging;
          if (!d || d.folder === row.dataset.folder) return;
          ev.preventDefault();
          ev.stopPropagation();
          row.classList.add("drop-ok");
        });
        row.addEventListener("dragleave", () => row.classList.remove("drop-ok"));
        row.addEventListener("drop", ev => {
          const d = CaseWindow.#dragging;
          if (!d || d.folder === row.dataset.folder) return;
          ev.preventDefault();
          ev.stopPropagation();
          row.classList.remove("drop-ok");
          const doc = resolve(d.key);
          // The stock directory's own drop: the entry's folder.
          const folder = row.dataset.folder || null;
          if (doc) void Promise.resolve(spec.file ? spec.file(doc, folder) : doc.update({ folder })).catch(err => log.error("filing failed", err));
        });
      }
    }

    /** @override */
    _onClose(options) {
      super._onClose(options);
      this.menu = null;
      this.sticky = null;
      this.#focus = null;
      this.#returnTo = null;
    }
  }

  return { CaseWindow, record };
}
