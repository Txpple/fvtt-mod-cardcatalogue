/**
 * The actors case: the Actors directory as portrait cards. The card's one button opens the sheet
 * (the user's ruling); the chevron, for the GM, shows the art or the token art to everyone, places a
 * token on the viewed scene, and opens the stock ownership dialog. A player sees the actors the stock
 * directory shows them, their own first in Mine. Every write is a stock one: a token placed, the
 * ownership dialog's own.
 */

import { makeCaseFinder } from "../docs/finder.js";
import { makeCaseWindow } from "../docs/library.js";
import { crLabel, isSummonCopy } from "../docs/decide.js";
import { plainText } from "../journal/decide.js";
import { showArt } from "../shell/art.js";
import { registerCase, wayBack } from "../shell/cases.js";
import { MODULE_ID, t } from "./common.js";

const players = () => game.users.filter(u => !u.isGM && u.role > CONST.USER_ROLES.NONE);

/** A type's words, one or many (dnd5e's `TYPES.Actor.<type>Pl` where it has one). */
function typeLabel(type, many = false) {
  const one = CONFIG.Actor.typeLabels?.[type] ?? type;
  const pl = `${one}Pl`;
  return game.i18n.localize(many && game.i18n.has(pl) ? pl : one);
}

/** Level for a character, CR for an NPC, the creature type beside it. */
function stats(actor) {
  const d = actor.system?.details ?? {};
  const out = [];
  if (actor.type === "character" && d.level) out.push(t("card.level", { n: d.level }));
  const cr = crLabel(d.cr);
  if (actor.type === "npc" && cr) out.push(t("card.cr", { cr }));
  const creature = d.type?.value ? (CONFIG.DND5E?.creatureTypes?.[d.type.value]?.label ?? d.type.value) : "";
  if (creature) out.push(game.i18n.localize(creature));
  return out;
}

const spec = {
  id: "actors",
  documentName: "Actor",
  icon: "fa-users",
  t,
  collection: () => game.actors,
  fields: ["name", "kind", "details", "owners", "folder", "text"],
  typeOrder: ["character", "npc", "group", "encounter", "vehicle"],
  // The user's order: characters first, then NPCs, groups and the rest, each by name.
  order: "type",
  typeLabel,
  views: user => (user.isGM ? ["here"] : ["mine"]),
  // A summoned creature is the GM's to list (the user's ruling): its owner moves its token, but it is
  // no card of theirs. The stock directory still shows it to them.
  hidden: (actor, user) => !user.isGM && isSummonCopy(actor),
  card(actor, user) {
    const kind = typeLabel(actor.type);
    const lines = stats(actor);
    const owners = players().filter(u => actor.testUserPermission(u, "OWNER"));
    const d = actor.system?.details ?? {};
    const classes = Object.values(actor.classes ?? {}).map(c => c.name);
    const species = actor.itemTypes?.race?.[0]?.name ?? "";
    const canRead = user.isGM || actor.testUserPermission(user, "OBSERVER");
    const here = !!canvas?.scene?.tokens?.some(tk => tk.actorId === actor.id);
    return {
      type: actor.type,
      kind,
      kindLine: [kind, ...lines].join(" · "),
      sub: [kind, ...lines].join(" · "),
      details: [...classes, species, ...lines].join(" "),
      owners: user.isGM ? owners.map(u => u.name).join(", ") : "",
      text: canRead ? plainText(d.biography?.value ?? "").slice(0, 4000) : "",
      mine: !user.isGM && actor.isOwner,
      here,
      badge: user.isGM && owners.length ? owners.map(u => u.name).join(", ") : null,
      badgeCls: "some",
      icons: here && user.isGM ? [{ icon: "fa-location-dot", tip: t("card.here") }] : []
    };
  },
  primary: {
    label: "go",
    icon: "fa-id-card",
    run: actor => actor.sheet.render(true)
  },
  second: { label: "menu.art", run: actor => showArt(actor.img, actor.name) },
  playerMenu: false,
  menu(actor, user) {
    if (!user.isGM) return [];
    const tokenSrc = actor.prototypeToken?.texture?.src;
    return [
      { act: "art", icon: "fa-image", label: "menu.art", hint: "menu.artHint", run: a => showArt(a.img, a.name) },
      { act: "tokenArt", icon: "fa-circle-user", label: "menu.tokenArt", hint: "menu.tokenArtHint", disabled: !tokenSrc, run: a => showArt(a.prototypeToken.texture.src, a.name) },
      { act: "place", icon: "fa-location-dot", label: "menu.place", hint: canvas?.scene ? "menu.placeHint" : "menu.placeNoScene", disabled: !canvas?.scene, run: placeToken },
      { act: "ownership", icon: "fa-lock", label: "menu.ownership", hint: "menu.ownershipHint", run: a => new foundry.applications.apps.DocumentOwnershipConfig({ document: a }).render({ force: true }) }
    ];
  }
};

/** A token of the actor on the viewed scene, at the middle of the view, as a drop there would make it. */
async function placeToken(actor) {
  const scene = canvas.scene;
  if (!scene) return;
  const { x, y } = canvas.stage.pivot;
  const doc = await actor.getTokenDocument({}, { parent: scene });
  const size = canvas.grid.size;
  const at = canvas.grid.getSnappedPoint(
    { x: x - (doc.width * size) / 2, y: y - (doc.height * size) / 2 },
    { mode: CONST.GRID_SNAPPING_MODES.TOP_LEFT_VERTEX }
  );
  await scene.createEmbeddedDocuments("Token", [{ ...doc.toObject(), x: at.x, y: at.y }]);
  ui.notifications.info(t("menu.placed", { name: actor.name, scene: scene.name }));
}

const { CaseWindow, record } = makeCaseWindow(spec);
const Finder = makeCaseFinder(spec, CaseWindow, record);

registerCase({
  id: "actors",
  tab: "actors",
  icon: spec.icon,
  visible: () => true,
  open: options => CaseWindow.open(options)
});

export const templates = [];
export const openFinder = () => Finder.toggle();

Hooks.on("renderActorDirectory", (app, html) => wayBack("actors", app, html));
for (const verb of ["create", "update", "delete"]) {
  Hooks.on(`${verb}Actor`, () => CaseWindow.refresh());
  Hooks.on(`${verb}Token`, () => CaseWindow.refresh());
}
for (const hook of ["createFolder", "updateFolder", "deleteFolder"]) {
  Hooks.on(hook, folder => {
    if (folder.type === "Actor") CaseWindow.refresh();
  });
}
Hooks.on("canvasReady", () => CaseWindow.refresh());

export const api = { open: options => CaseWindow.open(options), finder: () => Finder.toggle(), record, MODULE_ID };
