/**
 * The items case: the Items directory as cards. The card's one button opens the sheet (the user's
 * ruling); the chevron, for the GM, shows the art to everyone, posts dnd5e's own item card to chat,
 * and gives a copy to a member of the party or to the party itself (the copy a drop on the sheet
 * makes). A player has the case only while the sidebar keeps their Items tab.
 */

import { crLabel } from "../docs/decide.js";
import { makeCaseFinder } from "../docs/finder.js";
import { makeCaseWindow } from "../docs/library.js";
import { plainText } from "../journal/decide.js";
import { showArt } from "../shell/art.js";
import { registerCase, wayBack } from "../shell/cases.js";
import { MODULE_ID, t } from "./common.js";

/** A type's words, one or many (dnd5e's `TYPES.Item.<type>Pl` where it has one). */
function typeLabel(type, many = false) {
  const one = CONFIG.Item.typeLabels?.[type] ?? type;
  const pl = `${one}Pl`;
  return game.i18n.localize(many && game.i18n.has(pl) ? pl : one);
}

const rarityOf = item => {
  const r = item.system?.rarity;
  if (!r) return "";
  const label = CONFIG.DND5E?.itemRarity?.[r];
  return label ? game.i18n.localize(label) : r;
};

const priceOf = item => {
  const p = item.system?.price;
  if (!p?.value) return "";
  return `${p.value} ${p.denomination ?? "gp"}`;
};

const levelOf = item => (item.type === "spell" && Number.isFinite(item.system?.level) ? (item.system.level ? t("card.spellLevel", { n: item.system.level }) : t("card.cantrip")) : "");

/** Who an item can be given to: the primary party, its members, and every player's assigned character. */
function recipients() {
  const out = new Map();
  const party = game.settings.get("dnd5e", "primaryParty")?.actor;
  if (party) {
    out.set(party.id, party);
    for (const m of party.system?.members ?? []) if (m.actor) out.set(m.actor.id, m.actor);
  }
  for (const u of game.users) if (!u.isGM && u.character) out.set(u.character.id, u.character);
  return [...out.values()];
}

async function give(item, actorId) {
  const actor = game.actors.get(actorId);
  if (!actor) return;
  await actor.createEmbeddedDocuments("Item", [item.toObject()]);
  ui.notifications.info(t("menu.given", { name: item.name, to: actor.name }));
}

/** dnd5e's own item card in chat. */
const post = item => (typeof item.displayCard === "function" ? item.displayCard() : item.toMessage?.());

const spec = {
  id: "items",
  documentName: "Item",
  icon: "fa-suitcase",
  iconCards: true,
  t,
  collection: () => game.items,
  fields: ["name", "kind", "rarity", "folder", "source", "text"],
  typeOrder: ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell", "feat", "background", "race", "class", "subclass"],
  typeLabel,
  views: () => [],
  card(item, user) {
    const kind = typeLabel(item.type);
    const rarity = rarityOf(item);
    const level = levelOf(item);
    const canRead = user.isGM || item.testUserPermission(user, "OBSERVER");
    return {
      type: item.type,
      kind,
      rarity,
      kindLine: [kind, level, rarity, priceOf(item)].filter(Boolean).join(" · "),
      sub: [kind, level, rarity].filter(Boolean).join(" · "),
      source: item.system?.source?.book ?? item.system?.source?.custom ?? "",
      text: canRead ? plainText(item.system?.description?.value ?? "").slice(0, 4000) : "",
      icons: item.system?.attunement ? [{ icon: "fa-hand-sparkles", tip: t("card.attunement") }] : []
    };
  },
  detailLines(item) {
    const s = item.system ?? {};
    const cr = crLabel(s.cr);
    return [
      priceOf(item) ? t("detail.price", { price: priceOf(item) }) : "",
      s.weight?.value ? t("detail.weight", { n: s.weight.value, units: s.weight.units ?? "lb" }) : "",
      s.attunement ? t(`detail.attune.${s.attunement}`) : "",
      s.source?.book ? t("detail.source", { book: s.source.book, page: s.source.page ?? "" }).trim() : "",
      cr
    ];
  },
  primary: { label: "go", icon: "fa-book-open", run: item => item.sheet.render(true) },
  second: { label: "menu.post", run: post },
  playerMenu: false,
  quick: (_item, user) => (user.isGM ? [{ act: "post", icon: "fa-comment", label: "menu.post", run: post }] : []),
  menu(item, user) {
    if (!user.isGM) return [];
    const physical = "quantity" in (item.system ?? {});
    return [
      { act: "art", icon: "fa-image", label: "menu.art", hint: "menu.artHint", run: i => showArt(i.img, i.name) },
      { act: "post", icon: "fa-comment", label: "menu.post", hint: "menu.postHint", run: post },
      {
        act: "give",
        icon: "fa-hand-holding",
        label: "menu.give",
        hint: physical ? "menu.giveHint" : "menu.giveAny",
        empty: "menu.giveNobody",
        choices: recipients().map(a => ({ arg: a.id, label: a.name })),
        run: (i, actorId) => give(i, actorId)
      }
    ];
  }
};

const { CaseWindow, record } = makeCaseWindow(spec);
const Finder = makeCaseFinder(spec, CaseWindow, record);

registerCase({
  id: "items",
  tab: "items",
  icon: spec.icon,
  // A player has the case while the sidebar keeps their Items tab (the players' rule takes it away).
  visible: () => !!game.user?.isGM || !CONFIG.ui?.sidebar?.TABS?.items?.gmOnly,
  open: options => CaseWindow.open(options)
});

export const templates = [];
export const openFinder = () => Finder.toggle();

Hooks.on("renderItemDirectory", (app, html) => wayBack("items", app, html));
for (const verb of ["create", "update", "delete"]) Hooks.on(`${verb}Item`, item => item.parent || CaseWindow.refresh());
for (const hook of ["createFolder", "updateFolder", "deleteFolder"]) {
  Hooks.on(hook, folder => {
    if (folder.type === "Item") CaseWindow.refresh();
  });
}

export const api = { open: options => CaseWindow.open(options), finder: () => Finder.toggle(), record, MODULE_ID };
