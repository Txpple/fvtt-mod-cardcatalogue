/**
 * The compendium case: the Compendium Packs directory as cards, each pack's banner its picture (the
 * stock directory's, or the default for its type). The card's one button opens the pack's own window,
 * as a click in the stock directory does; the chevron, for the GM, locks or unlocks it and sets who
 * may see it. The folders are the directory's own (type Compendium), and a drop on the rail files a
 * pack as the stock directory's drop does (`setFolder`). A pack is no document, so the spec says how
 * its cards are keyed (the pack's collection id), drawn, dragged, filed and right-clicked.
 */

import { makeCaseFinder } from "../docs/finder.js";
import { makeCaseWindow } from "../docs/library.js";
import { registerCase, wayBack } from "../shell/cases.js";
import { MODULE_ID, t } from "./common.js";

/** A pack type's words, one or many (the document class's own labels). */
function typeLabel(type, many = false) {
  const meta = CONFIG[type]?.documentClass?.metadata;
  const key = many ? meta?.labelPlural : meta?.label;
  return key ? game.i18n.localize(key) : type;
}

/** Where a pack comes from: the world, the system or a module, by its title. */
function packageOf(pack) {
  const { packageType, packageName } = pack.metadata;
  if (packageType === "world") return game.world?.title ?? packageName;
  if (packageType === "system") return game.system?.title ?? packageName;
  return game.modules.get(packageName)?.title ?? packageName;
}

const spec = {
  id: "compendium",
  documentName: "Compendium",
  icon: "fa-book-atlas",
  t,
  collection: () => game.packs,
  directory: () => ui.compendium,
  keyOf: pack => pack.collection,
  resolve: key => game.packs.get(key),
  nameOf: pack => game.i18n.localize(pack.title),
  pictureOf: pack => pack.banner,
  canSee: (pack, user) => user.isGM || pack.testUserPermission(user, "OBSERVER"),
  dragData: key => ({ type: "Compendium", collection: key }),
  file: (pack, folderId) => pack.setFolder(folderId),
  row: (li, key) => {
    li.dataset.pack = key;
  },
  fields: ["name", "kind", "package", "folder"],
  typeOrder: ["Actor", "Item", "JournalEntry", "Scene", "RollTable", "Adventure", "Cards", "Macro", "Playlist"],
  typeLabel,
  views: () => [],
  card(pack) {
    const kind = typeLabel(pack.metadata.type);
    const pkg = packageOf(pack);
    return {
      type: pack.metadata.type,
      kind,
      package: pkg,
      sub: [kind, pkg].filter(Boolean).join(" · "),
      icons: pack.locked ? [{ icon: "fa-lock", tip: t("card.locked") }] : []
    };
  },
  primary: { label: "go", icon: "fa-book-atlas", run: pack => pack.render(true) },
  playerMenu: false,
  menu(pack, user) {
    if (!user.isGM) return [];
    return [
      {
        act: "lock",
        icon: pack.locked ? "fa-lock-open" : "fa-lock",
        label: pack.locked ? "menu.unlock" : "menu.lock",
        hint: "menu.lockHint",
        run: p => p.configure({ locked: !p.locked })
      },
      { act: "ownership", icon: "fa-user-lock", label: "menu.ownership", hint: "menu.ownershipHint", run: p => p.configureOwnershipDialog() }
    ];
  }
};

const { CaseWindow, record } = makeCaseWindow(spec);
const Finder = makeCaseFinder(spec, CaseWindow, record);

registerCase({
  id: "compendium",
  tab: "compendium",
  icon: spec.icon,
  visible: () => true,
  open: options => CaseWindow.open(options)
});

export const templates = [];
export const openFinder = () => Finder.toggle();

// A pack's lock, folder or ownership is the world's compendium configuration; the stock directory
// redraws when it changes, and so does the case.
Hooks.on("renderCompendiumDirectory", (app, html) => {
  wayBack("compendium", app, html);
  CaseWindow.refresh();
});
for (const hook of ["createFolder", "updateFolder", "deleteFolder"]) {
  Hooks.on(hook, folder => {
    if (folder.type === "Compendium") CaseWindow.refresh();
  });
}

export const api = { open: options => CaseWindow.open(options), finder: () => Finder.toggle(), record, MODULE_ID };
