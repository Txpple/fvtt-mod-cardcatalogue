/**
 * The the scenes case window: the Scenes directory as cards. A rail (the views, then the folders), the
 * cards (each with Activate and a chevron of the other actions), a detail panel, the Undo strip.
 * Everything it draws is read live from Foundry's scenes; the only state of its own is the
 * browser's (memory.js). The search filters the drawn cards from a map kept here, never from the
 * DOM, and never redraws. GM only, as the Scenes tab is.
 */

import { log, MODULE_ID, t } from "./common.js";
import { activateAs, darknessOf, folderTree, inView, matchWhy, searchFields, squares, VIEWS } from "./decide.js";
import * as memory from "./memory.js";
import * as scenes from "./scenes.js";
import { openClassic, setClassic, stripContext, switchCase } from "../shell/cases.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const SIZES = ["s", "m", "l"];

const isScene = doc => doc?.documentName === "Scene";

const byName = (a, b) => a.localeCompare(b, game.i18n.lang, { sensitivity: "base", numeric: true });

/** A folder's chain, nearest first. */
function chainOf(folder) {
  const list = [];
  for (let f = folder; f; f = f.folder) list.push(f);
  return list;
}

/** One card per scene, in the directory's shape: by folder path, then by name. */
export function sceneCards() {
  const viewed = canvas?.scene?.id ?? null;
  return game.scenes.contents
    .map(scene => {
      const chain = chainOf(scene.folder);
      const journal = scene.journal;
      const page = journal && scene.journalEntryPage ? journal.pages.get(scene.journalEntryPage) : null;
      const background = scenes.backgroundOf(scene);
      return {
        key: scene.uuid,
        scene,
        name: scene.name,
        navName: scene.navName || "",
        folder: chain
          .map(f => f.name)
          .reverse()
          .join(" › "),
        folders: chain.map(f => f.id),
        active: scene.active,
        viewed: scene.id === viewed,
        nav: scene.navigation,
        thumb: scene.thumb || null,
        background,
        notes: [journal?.name, page?.name].filter(Boolean).join(" › "),
        playlist: [scene.playlist?.name, scene.playlistSound?.name].filter(Boolean).join(" › "),
        file: background ?? ""
      };
    })
    .sort((a, b) => byName(a.folder, b.folder) || byName(a.name, b.name));
}

/** The time a scene was active, short. */
function when(at) {
  try {
    return new Date(at).toLocaleString(game.i18n.lang, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date(at).toLocaleString();
  }
}

/** Open Foundry's own Scenes directory: the sidebar's tab, the sidebar expanded. */
export const openClassicScenes = () => openClassic("scenes");

/** "1 scene", "3 scenes": the count keys have a one and a many. */
const counted = (n, base) => t(n === 1 ? `${base}One` : base, { n });

export class ScenesWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "cardcatalogue-scenes-library",
    classes: ["cardcatalogue", "cardcatalogue-scenes-library"],
    window: { title: `${MODULE_ID}.scenes.library.title`, icon: "fa-solid fa-map", resizable: true },
    position: { width: 1240, height: 820 },
    actions: {
      size: ScenesWindow.#onSize,
      rail: ScenesWindow.#onRail,
      searchAll: ScenesWindow.#onSearchAll,
      pick: ScenesWindow.#onPick,
      unpick: ScenesWindow.#onUnpick,
      activate: ScenesWindow.#onActivate,
      openMenu: ScenesWindow.#onOpenMenu,
      closeMenu: ScenesWindow.#onCloseMenu,
      look: ScenesWindow.#onLook,
      edit: ScenesWindow.#onEdit,
      notes: ScenesWindow.#onNotes,
      preload: ScenesWindow.#onPreload,
      toggleNav: ScenesWindow.#onToggleNav,
      makeThumb: ScenesWindow.#onMakeThumb,
      pin: ScenesWindow.#onPin,
      copyRef: ScenesWindow.#onCopyRef,
      undo: ScenesWindow.#onUndo,
      dismissUndo: ScenesWindow.#onDismissUndo,
      classic: ScenesWindow.#onClassic,
      case: ScenesWindow.#onCase
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/scenes/library.hbs`,
      scrollable: [".cc-cards", ".cc-rail", ".cc-detail"]
    }
  };

  /** The one open window, so the Scenes button, the finder and the API reuse it. */
  static current = null;

  /** Open the window, or bring it forward; `key` picks a card, `menu` opens its chevron. */
  static open({ key = null, menu = false, position = null } = {}) {
    ScenesWindow.current ??= new ScenesWindow();
    const app = ScenesWindow.current;
    if (key) app.select(key, { menu });
    if (app.rendered) {
      app.bringToFront();
      if (position) app.setPosition(position);
      if (key) app.render();
      return app;
    }
    app.render({ force: true, ...(position ? { position } : {}) }).catch(err => {
      log.error("the the scenes case window failed to open; Foundry's Scenes directory opens instead", err);
      openClassicScenes();
    });
    return app;
  }

  static #timer = null;

  /** Redraw when open, once per burst of changes (a scene edited, the canvas changing). */
  static refresh() {
    clearTimeout(ScenesWindow.#timer);
    ScenesWindow.#timer = setTimeout(() => {
      const app = ScenesWindow.current;
      if (app?.rendered && !app.minimized) app.render();
    }, 200);
  }

  /** The card being dragged: its key and folder. */
  static #dragging = null;

  #view = "all";
  #size = "m";
  #query = "";
  #selected = null;
  /** The key of the card whose chevron is open. */
  #menu = null;
  #menuFresh = false;
  /** Every card's search fields, and the keys the view itself holds. */
  #fields = new Map();
  #inView = new Set();
  #focus = null;
  /** A card kept in view though it no longer fits it (the finder's pick), until the DM moves on. */
  #sticky = null;
  #returnTo = null;

  constructor(options) {
    super(options);
    const prefs = memory.load();
    this.#size = SIZES.includes(prefs.size) ? prefs.size : "m";
    this.#view = prefs.view ?? "all";
  }

  /** Pick a card (the finder's and the API's way in). */
  select(key, { menu = false } = {}) {
    this.#selected = key;
    this.#sticky = key;
    this.#query = "";
    if (menu) {
      this.#menu = key;
      this.#menuFresh = true;
    }
  }

  #closeMenu() {
    if (!this.#menu) return;
    this.#returnTo = this.#menu;
    this.#menu = null;
    this.render();
  }

  #validView(view) {
    if (VIEWS.includes(view) || view === "f:") return true;
    if (view.startsWith("f:")) return game.folders.get(view.slice(2))?.type === "Scene";
    return false;
  }

  #heading(view) {
    if (view === "f:") return t("rail.noFolder");
    if (view.startsWith("f:")) return game.folders.get(view.slice(2))?.name ?? "";
    return t(`view.${view}`);
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const all = sceneCards();
    if (!this.#validView(this.#view)) this.#view = "all";
    const view = this.#view;
    const list = all.filter(c => c.key === this.#sticky || inView(c, view));

    this.#fields = new Map(all.map(c => [c.key, searchFields(c)]));
    this.#inView = new Set(list.map(c => c.key));

    const folders = game.folders.filter(f => f.type === "Scene").map(f => ({ id: f.id, name: f.name, parent: f.folder?.id ?? null, sort: f.sort }));
    const tree = folderTree(folders, all, byName);
    const loose = all.filter(c => !c.folders.length).length;

    context.cases = stripContext("scenes");
    context.size = this.#size;
    context.query = this.#query;
    context.sizes = SIZES.map(id => ({ id, label: t(`size.${id}`), aria: t(`size.${id}Aria`), on: this.#size === id }));
    context.views = VIEWS.map(id => ({ id, label: t(`view.${id}`), n: all.filter(c => inView(c, id)).length, on: view === id }));
    context.folders = tree.map(f => ({ ...f, on: view === `f:${f.id}`, indent: f.depth }));
    context.loose = tree.length && loose ? { n: loose, on: view === "f:" } : null;
    context.heading = this.#heading(view);
    context.cards = list.map(c => this.#cardContext(c));
    context.countBase = counted(list.filter(c => inView(c, view)).length, "count.scenes");
    context.emptyText = t(`empty.${view.startsWith("f:") ? "folder" : view}`);
    context.detail = this.#detailContext(all, list);
    context.menu = this.#menu ? this.#menuContext(all) : null;
    const undo = scenes.lastActivation();
    context.undo = undo ? { text: t("activate.done", { name: undo.name }), back: t("activate.back", { name: undo.previousName }) } : null;
    return context;
  }

  #cardContext(card) {
    return {
      key: card.key,
      name: card.name,
      thumb: card.thumb,
      sub: card.folder || card.navName || t("rail.noFolder"),
      folderId: card.folders[0] ?? "",
      active: card.active,
      viewed: card.viewed,
      nav: card.nav || card.active,
      playlist: card.playlist,
      notes: card.notes,
      pinned: memory.isPinned(card.key),
      selected: this.#selected === card.key,
      // The card's one button is View (the user's ruling); on the scene this client is on, it says so.
      goLabel: card.viewed ? t("badge.here") : t("menu.look"),
      goHint: card.viewed ? t("menu.lookHere") : t("menu.lookHint")
    };
  }

  #detailContext(all, list) {
    if (!list.some(c => c.key === this.#selected)) return null;
    const card = all.find(c => c.key === this.#selected);
    if (!card) return null;
    const { scene } = card;
    const grid = scene.grid;
    const dark = darknessOf(scene.environment?.darknessLevel);
    const size = squares(scene.width, scene.height, grid?.size);
    const line = [
      size ? t("detail.squares", { size }) : "",
      grid?.distance ? `${grid.distance} ${grid.units ?? ""}`.trim() : "",
      typeof dark === "number" ? t("detail.dark", { n: dark }) : t(`detail.${dark}`)
    ].filter(Boolean);
    const last = memory.lastActive(card.key);
    const counts = [
      ["tokens", scene.tokens?.size],
      ["walls", scene.walls?.size],
      ["lights", scene.lights?.size],
      ["sounds", scene.sounds?.size],
      ["levels", scene.levels?.size > 1 ? scene.levels.size : 0]
    ]
      .filter(([, n]) => n)
      .map(([k, n]) => counted(n, `count.${k}`));
    const as = activateAs(card);
    return {
      key: card.key,
      name: card.name,
      picture: card.background || card.thumb,
      navName: card.navName,
      line: line.join(" · "),
      counts: counts.join(" · "),
      active: card.active,
      viewed: card.viewed,
      where: card.folder || t("rail.noFolder"),
      file: card.file,
      nav: card.nav || card.active,
      navLocked: card.active,
      playlist: card.playlist,
      notes: card.notes,
      pinned: memory.isPinned(card.key),
      last: card.active ? t("detail.activeNow") : last ? t("detail.lastActive", { when: when(last.at) }) : t("detail.notActive"),
      viewLabel: card.viewed ? t("badge.here") : t("menu.look"),
      actLabel: t(`activate.everyoneAs.${as}`),
      actIcon: as === "pull" ? "fa-people-pulling" : "fa-bullseye",
      noThumb: !card.thumb && scenes.canThumb(scene)
    };
  }

  #menuContext(all) {
    const card = all.find(c => c.key === this.#menu);
    if (!card) {
      this.#menu = null;
      return null;
    }
    const { scene } = card;
    const as = activateAs(card);
    return {
      name: card.name,
      thumb: card.thumb,
      actLabel: t(`activate.everyoneAs.${as}`),
      actHint: t(`activate.hint.${as}`),
      actIcon: as === "pull" ? "fa-people-pulling" : "fa-bullseye",
      notes: !!scene.journal,
      nav: card.nav || card.active,
      navLocked: card.active,
      thumbable: scenes.canThumb(scene),
      hasThumb: !!card.thumb
    };
  }

  /** @override */
  async _preRender(context, options) {
    await super._preRender(context, options);
    const el = this.element;
    const active = el?.contains(document.activeElement) ? document.activeElement : null;
    if (!active) {
      this.#focus = null;
      return;
    }
    this.#focus = {
      zone: active.closest(".cc-opts") ? ".cc-opts" : active.closest(".cc-detail") ? ".cc-detail" : active.closest(".cc-head") ? ".cc-head" : null,
      name: active.name || null,
      action: active.dataset?.action ?? null,
      key: active.closest("[data-key]")?.dataset.key ?? null,
      data: { ...(active.dataset ?? {}) },
      start: active.selectionStart ?? null,
      end: active.selectionEnd ?? null
    };
  }

  /**
   * The window's own keys, bound once (the element outlives every redraw): Escape closes the
   * chevron and not the window, Tab stays inside it while it is open, and "/" puts the caret in the
   * search.
   * @override
   */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.element.addEventListener("keydown", ev => {
      if (this.#menu && ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        return this.#closeMenu();
      }
      if (this.#menu && ev.key === "Tab") {
        const stops = [...this.element.querySelectorAll(".cc-opts button:not([disabled])")];
        if (!stops.length) return;
        const at = stops.indexOf(document.activeElement);
        const next = ev.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : at === stops.length - 1 || at < 0 ? 0 : at + 1;
        ev.preventDefault();
        return stops[next].focus();
      }
      const typing = ev.target.closest?.("input, textarea, select, [contenteditable]");
      // Escape closes the panel first, the window after.
      if (ev.key === "Escape" && this.#selected && !typing) {
        ev.preventDefault();
        ev.stopPropagation();
        this.#selected = null;
        this.#sticky = null;
        return this.render();
      }
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
      this.#query = ev.currentTarget.value;
      this.#filter();
    });
    input?.addEventListener("keydown", ev => {
      if (ev.key === "Escape" && this.#query) {
        ev.preventDefault();
        ev.stopPropagation();
        ev.currentTarget.value = "";
        this.#query = "";
        this.#filter();
      }
    });
    this.#wireDrag(root);
    root.querySelector(".cc-veil")?.addEventListener("click", ev => {
      if (ev.target === ev.currentTarget) this.#closeMenu();
    });
    this.#filter();
    this.#restoreFocus(options, context);
  }

  #restoreFocus(options, context) {
    const root = this.element;
    if (context.menu && this.#menuFresh) {
      this.#menuFresh = false;
      this.#focus = null;
      return root.querySelector(".cc-opts .cc-menu button")?.focus();
    }
    const usable = el => el && !el.closest("[hidden]") && !el.disabled;
    const back = this.#returnTo;
    this.#returnTo = null;
    if (back) {
      const card = root.querySelector(`.cc-card[data-key="${CSS.escape(back)}"]`);
      const el = card?.querySelector('[data-action="openMenu"]') ?? root.querySelector('.cc-detail [data-action="openMenu"]');
      if (usable(el)) return el.focus({ preventScroll: true });
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
      const sel = [`[data-action="${CSS.escape(f.action)}"]`];
      for (const k of ["view", "size"]) if (f.data[k]) sel.push(`[data-${k}="${CSS.escape(f.data[k])}"]`);
      const scope = f.zone ? root.querySelector(f.zone) : f.key ? root.querySelector(`.cc-card[data-key="${CSS.escape(f.key)}"]`) : root;
      el = scope?.querySelector(sel.join("")) ?? (f.key && !f.zone ? scope?.querySelector('[data-action="pick"]') : null);
    }
    if (!usable(el)) {
      const picked = this.#selected ? root.querySelector(`.cc-card[data-key="${CSS.escape(this.#selected)}"] [data-action="pick"]`) : null;
      el = usable(picked) ? picked : root.querySelector("input[name=search]");
    }
    if (!usable(el)) return;
    el.focus({ preventScroll: true });
    if (f.start !== null && f.start !== undefined && typeof el.setSelectionRange === "function") {
      try {
        el.setSelectionRange(f.start, f.end ?? f.start);
      } catch {
        // Not a text field.
      }
    }
  }

  /** The search, applied to the drawn cards: no redraw, so the caret and the scroll stay. */
  #filter() {
    const root = this.element;
    if (!root) return;
    const q = this.#query.trim();
    let shown = 0;
    for (const card of root.querySelectorAll(".cc-card[data-key]")) {
      const why = matchWhy(this.#fields.get(card.dataset.key) ?? {}, q);
      card.hidden = why === null;
      if (why !== null) shown++;
      const label = card.querySelector(".cc-why");
      if (label) label.textContent = why ? t(`why.${why}`) : "";
    }
    const count = root.querySelector(".cc-count");
    if (count) count.textContent = q ? t("count.matching", { n: shown, q }) : (count.dataset.base ?? "");
    let elsewhere = 0;
    if (q) for (const [key, f] of this.#fields) if (!this.#inView.has(key) && matchWhy(f, q) !== null) elsewhere++;
    const more = root.querySelector(".cc-more");
    if (more) {
      more.hidden = !elsewhere;
      more.textContent = elsewhere ? t("search.more", { n: elsewhere }) : "";
    }
    const empty = root.querySelector(".cc-empty");
    if (empty) {
      empty.hidden = shown > 0;
      empty.textContent = !q ? (empty.dataset.view ?? "") : elsewhere ? t("empty.searchHere", { q }) : t("empty.search");
    }
    const detail = root.querySelector(".cc-detail[data-key]");
    if (detail) {
      const card = root.querySelector(`.cc-card[data-key="${CSS.escape(detail.dataset.key)}"]`);
      detail.hidden = !card || card.hidden;
    }
  }

  #wireDrag(root) {
    for (const card of root.querySelectorAll(".cc-card[data-key]")) {
      card.addEventListener("dragstart", ev => {
        ScenesWindow.#dragging = { key: card.dataset.key, folder: card.dataset.folder || "" };
        card.classList.add("dragging");
        ev.dataTransfer.effectAllowed = "copyMove";
        // A scene drags as Foundry's own scene drag (a journal or chat makes a link of it).
        ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Scene", uuid: card.dataset.key }));
      });
      card.addEventListener("dragend", () => {
        ScenesWindow.#dragging = null;
        card.classList.remove("dragging");
        for (const el of root.querySelectorAll(".drop-ok")) el.classList.remove("drop-ok");
      });
    }
    for (const row of root.querySelectorAll("[data-drop]")) {
      row.addEventListener("dragover", ev => {
        const d = ScenesWindow.#dragging;
        if (!d || d.folder === row.dataset.folder) return;
        ev.preventDefault();
        ev.stopPropagation();
        row.classList.add("drop-ok");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drop-ok"));
      row.addEventListener("drop", ev => {
        const d = ScenesWindow.#dragging;
        if (!d || d.folder === row.dataset.folder) return;
        ev.preventDefault();
        ev.stopPropagation();
        row.classList.remove("drop-ok");
        void this.#dropped(d.key, row.dataset.folder);
      });
    }
  }

  async #dropped(key, folderId) {
    const scene = fromUuidSync(key);
    if (!isScene(scene)) return;
    const done = await scenes.guarded("filing the scene", () => scenes.setFolder(scene, folderId));
    if (!done) return;
    const folder = folderId ? game.folders.get(folderId)?.name : null;
    ui.notifications.info(folder ? t("drop.filed", { name: scene.name, folder }) : t("drop.unfiled", { name: scene.name }));
  }

  /** The scene a key names, or the picked one. */
  #scene(target) {
    const key = target?.closest?.("[data-key]")?.dataset.key ?? this.#menu ?? this.#selected;
    const scene = key ? fromUuidSync(key) : null;
    return isScene(scene) ? scene : null;
  }

  /** A chevron action: the chevron closes first, focus goes back to its card. */
  async #fromMenu(target, name, fn) {
    const scene = this.#scene(target);
    if (this.#menu) {
      this.#returnTo = this.#menu;
      this.#menu = null;
    }
    if (!scene) return this.render();
    const res = await scenes.guarded(name, () => fn(scene));
    this.render();
    return res;
  }

  static #onSize(_event, target) {
    this.#size = target.dataset.size;
    memory.setPrefs({ size: this.#size });
    this.render();
  }

  static #onRail(_event, target) {
    this.#view = target.dataset.view;
    this.#sticky = null;
    memory.setPrefs({ view: this.#view });
    this.render();
  }

  static #onSearchAll() {
    this.#view = "all";
    this.#sticky = null;
    memory.setPrefs({ view: "all" });
    this.render();
  }

  /** A click picks; a second click, a double click, or Enter on the picked card views it (the DM only). */
  /** The panel's ×: the card stays where it is, the panel goes. */
  static #onUnpick() {
    this.#selected = null;
    this.#sticky = null;
    this.render();
  }

  static #onPick(event, target) {
    const key = target.closest("[data-key]")?.dataset.key;
    if (!key) return;
    if (this.#selected === key && (event.detail >= 2 || event.detail === 0)) {
      const scene = fromUuidSync(key);
      if (isScene(scene)) void scenes.guarded("viewing the scene", () => scenes.view(scene));
      return;
    }
    this.#selected = key;
    if (this.#sticky !== key) this.#sticky = null;
    this.render();
  }

  static async #onActivate(event, target) {
    event.stopPropagation();
    if (event.detail > 1) return;
    const scene = this.#scene(target);
    // From the chevron: it closes first, focus goes back to its card.
    if (this.#menu) {
      this.#returnTo = this.#menu;
      this.#menu = null;
    }
    if (!scene) return this.render();
    const res = await scenes.guarded("activating the scene", () => scenes.activate(scene));
    if (res === "pulled") ui.notifications.info(t("activate.pulled", { name: scene.name }));
    this.render();
  }

  static #onOpenMenu(event, target) {
    event.stopPropagation();
    const key = target.closest("[data-key]")?.dataset.key ?? this.#selected;
    if (!key) return;
    this.#menu = key;
    this.#menuFresh = true;
    this.render();
  }

  static #onCloseMenu() {
    this.#closeMenu();
  }

  static #onLook(_event, target) {
    return this.#fromMenu(target, "viewing the scene", scene => scenes.view(scene));
  }

  static #onEdit(_event, target) {
    return this.#fromMenu(target, "opening the scene's configuration", scene => scenes.edit(scene));
  }

  static #onNotes(_event, target) {
    return this.#fromMenu(target, "opening the scene's notes", scene => scenes.notes(scene));
  }

  static async #onPreload(_event, target) {
    const scene = this.#scene(target);
    await this.#fromMenu(target, "preloading the scene", s => scenes.preload(s));
    if (scene) ui.notifications.info(t("menu.preloading", { name: scene.name }));
  }

  static #onToggleNav(_event, target) {
    // The panel's switch stays where it is; the chevron's closes with the menu.
    if (!this.#menu) {
      const scene = this.#scene(target);
      if (scene) return scenes.guarded("putting the scene on the bar", () => scenes.toggleNav(scene));
      return;
    }
    return this.#fromMenu(target, "putting the scene on the bar", scene => scenes.toggleNav(scene));
  }

  static async #onMakeThumb(_event, target) {
    const scene = this.#scene(target);
    if (!scene) return;
    ui.notifications.info(t("menu.thumbMaking", { name: scene.name }));
    const made = await this.#fromMenu(target, "making the thumbnail", s => scenes.makeThumb(s));
    if (made) ui.notifications.info(t("menu.thumbMade", { name: scene.name }));
  }

  static #onPin(_event, target) {
    const key = target.closest("[data-key]")?.dataset.key ?? this.#selected;
    if (!key) return;
    memory.togglePin(key);
    this.render();
  }

  /** The picked scene as Foundry's own content link, for a journal, a description or a chat message. */
  static async #onCopyRef() {
    const scene = fromUuidSync(this.#selected);
    if (!isScene(scene)) return;
    const text = `@UUID[${scene.uuid}]{${scene.name}}`;
    try {
      await game.clipboard.copyPlainText(text);
      ui.notifications.info(t("detail.copied"));
    } catch {
      ui.notifications.info(text);
    }
  }

  static async #onUndo() {
    const back = scenes.lastActivation()?.previousName ?? "";
    const res = await scenes.guarded("undoing the activation", () => scenes.undoActivation());
    if (res === "undone") ui.notifications.info(t("activate.undone", { name: back }));
    else if (res && res !== "none") ui.notifications.warn(t(`activate.undo.${res}`));
    this.render();
  }

  static #onDismissUndo() {
    scenes.forgetActivation();
    this.render();
  }

  static async #onClassic() {
    await this.close();
    await setClassic("scenes", true);
  }

  /** Another case, where this window stands. */
  static #onCase(_event, target) {
    return switchCase(this, target.dataset.case);
  }

  /** The case this window is, for the strip. */
  get caseId() {
    return "scenes";
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    this.#menu = null;
    this.#focus = null;
    this.#sticky = null;
    this.#returnTo = null;
  }
}
