/**
 * The journal case, Scroll Case 1.0.4 carried over whole: the journal as cards, one-click Show into
 * the Reader on the players' screens, the player's own window, page links. A skin over Foundry's
 * journal: every write is one the stock journal makes (show.js), and what only it needs lives in
 * the browser (memory.js). The case registers itself with the shell (the strip, the Journal button,
 * Classic Mode's way back); this file holds what is the journal's alone: the pictures framed by
 * their shape, the refresh hooks, the Shows a player's client hears, a linked page opened.
 */

import { registerCase, wayBack } from "../shell/cases.js";
import { log, MODULE_ID, setting, t } from "./common.js";
import { frameShape, kindOf, LINK_PARAM, linkedPage, mendViewClass, pageLink, withoutLink } from "./decide.js";
import { Finder } from "./finder.js";
import { JournalWindow } from "./library.js";
import * as memory from "./memory.js";
import { Reader } from "./reader.js";
import * as show from "./show.js";

/** The pictures framed by their shape: the cards', the Show options' and the finder's. */
const FRAMED =
  ".cardcatalogue-journal-library .cc-thumb img, .cardcatalogue-actors-library .cc-thumb img, .cc-opts-head img, .cardcatalogue-journal-finder .cc-res-th img, .cardcatalogue-actors-finder .cc-res-th img";

// A page link's query reaches Foundry's server, which names the body's view class from the whole
// address (`game?page=…`, not `game`): the interface loses its layout. Mended as this script loads,
// before the game draws anything; the link itself is read at `ready`.
try {
  const { remove, add } = mendViewClass(document.body?.classList ?? []);
  if (remove.length) {
    document.body.classList.remove(...remove);
    document.body.classList.add(...add);
  }
} catch (err) {
  log.error("mending the body's view class failed", err);
}

registerCase({
  id: "journal",
  tab: "journal",
  icon: "fa-images",
  visible: () => true,
  // Scroll Case still on beside it: two windows would answer the Journal button and every Show.
  aside: () => !!game.modules.get("fvtt-mod-scrollcase")?.active,
  open: options => JournalWindow.open(options)
});

export const templates = ["library.hbs", "finder.hbs", "reader.hbs"].map(f => `modules/${MODULE_ID}/templates/journal/${f}`);

/** The case's own settings, registered at init. */
export function registerSettings() {
  const reg = (key, data) => game.settings.register(MODULE_ID, key, { name: `${MODULE_ID}.settings.${key}.name`, hint: `${MODULE_ID}.settings.${key}.hint`, ...data });
  reg("showKeeps", { scope: "world", config: true, type: Boolean, default: true });
  reg("assetFolders", { scope: "world", config: true, type: String, default: "" });
  reg("handoutsJournal", { scope: "world", config: true, type: String, default: "Handouts" });
}

export const openFinder = () => Finder.toggle();

Hooks.once("init", () => {
  // A card's picture is tagged with its shape once it loads, so the stylesheet crops a portrait
  // from the top and shows a scroll or a panorama whole. A load never bubbles: this listens on the
  // way down.
  document.addEventListener(
    "load",
    event => {
      const img = event.target;
      if (img instanceof HTMLImageElement && img.matches(FRAMED)) img.dataset.shape = frameShape(img.naturalWidth, img.naturalHeight);
    },
    true
  );
});

Hooks.on("renderJournalDirectory", (app, html) => wayBack("journal", app, html));

/* -------------------------------------------------- */
/*  The window follows the journal                    */
/* -------------------------------------------------- */

const refresh = () => JournalWindow.refresh();
for (const doc of ["JournalEntry", "JournalEntryPage", "JournalEntryCategory"]) {
  for (const verb of ["create", "update", "delete"]) Hooks.on(`${verb}${doc}`, refresh);
}
for (const hook of ["createFolder", "updateFolder", "deleteFolder"]) {
  Hooks.on(hook, folder => {
    if (folder.type === "JournalEntry") refresh();
  });
}
// A Reader follows its page: an edit redraws it, a page gone or no longer visible closes it.
Hooks.on("updateJournalEntryPage", page => Reader.refresh(page));
Hooks.on("deleteJournalEntryPage", page => Reader.closeFor(page));
Hooks.on("updateJournalEntry", entry => {
  for (const page of entry.pages) Reader.refresh(page);
});
Hooks.on("userConnected", refresh);
Hooks.on("updateUser", (_user, changes) => {
  if ("role" in changes || "name" in changes || "character" in changes) refresh();
});
Hooks.on("createUser", refresh);
Hooks.on("deleteUser", refresh);

/* -------------------------------------------------- */
/*  ready: what a player is shown, a linked page      */
/* -------------------------------------------------- */

/**
 * A Show sent from the journal case, on a client it is for: the page (or the picture) in the
 * Reader, the GM having shown it so it stays open even without the page's permission. In Classic
 * Mode, or for a PDF the Reader cannot show, it opens as Foundry's own Show would. A player's
 * client records it as shown and seen.
 */
function receiveShow(message, heard) {
  if (message?.action !== "show" || message.from === game.user.id) return;
  if (message.users?.length && !message.users.includes(game.user.id)) return;
  const classic = setting("classic");
  const ImagePopout = foundry.applications?.apps?.ImagePopout;
  const Journal = foundry.documents?.collections?.Journal ?? globalThis.Journal;
  if (message.src) {
    if (classic && ImagePopout) return void new ImagePopout({ src: message.src, window: { title: message.name } }).render({ force: true });
    return void Reader.openFile(message.src, message.name, { title: message.title });
  }
  const page = fromUuidSync(message.uuid, { strict: false });
  if (page?.documentName !== "JournalEntryPage") return;
  const kind = kindOf(page.type);
  if (classic || kind === "pdf") {
    const image = message.picture || (kind === "image" ? page.src : null);
    if (image && ImagePopout) {
      new ImagePopout({ src: image, uuid: message.picture ? undefined : page.uuid, caption: message.caption && !message.picture ? (page.image?.caption ?? "") : "", window: { title: page.name } }).render({ force: true });
    } else void Journal._showEntry(page.uuid, true);
  } else {
    void Reader.open(page, { shown: true, picture: message.picture, caption: message.caption, title: message.title });
  }
  if (!game.user.isGM) heard(page.uuid);
}

/**
 * A link to a page, `/game?page=<uuid>` (Foundry's login carries it through to the game): the page
 * opens as a card would open it, only for a user who may see it; the parameter leaves the address
 * bar either way, so a reload opens nothing.
 */
async function openLinked() {
  if (!new URLSearchParams(window.location.search).has(LINK_PARAM)) return;
  const uuid = linkedPage(window.location.search);
  history.replaceState(history.state, "", withoutLink(window.location.href));
  const page = uuid ? await fromUuid(uuid).catch(() => null) : null;
  if (page?.documentName !== "JournalEntryPage" || !page.testUserPermission(game.user, "OBSERVER")) {
    return void ui.notifications.warn(t("link.unavailable"));
  }
  if (setting("classic") && page.parent.testUserPermission(game.user, "OBSERVER")) show.openInJournal(page);
  else show.openForReading(page);
  if (!game.user.isGM) {
    memory.noteSeen(page.uuid);
    refresh();
  }
}

/** The journal's part of `ready`: the show listeners and a linked page. The shell calls it when the case is on. */
export function ready() {
  // What is shown to this player, recorded as shown and seen: a Show from the journal case (below),
  // and Foundry's own show events (a GM in Classic Mode), which Foundry opens itself.
  try {
    const heard = uuid => {
      try {
        if (typeof uuid !== "string" || fromUuidSync(uuid, { strict: false })?.documentName !== "JournalEntryPage") return;
        memory.noteShown(uuid, t("show.toYou"));
        memory.noteSeen(uuid);
        refresh();
      } catch (err) {
        log.error("recording a shown handout failed", err);
      }
    };
    if (!game.user.isGM) {
      // Only a page is a handout: a whole journal, a token's or an actor's image shown is left out.
      game.socket.on("showEntry", uuid => heard(uuid));
      game.socket.on("shareImage", data => heard(data?.uuid));
    }
    game.socket.on(show.CHANNEL, message => {
      try {
        receiveShow(message, heard);
      } catch (err) {
        log.error("opening a shown handout failed", err);
      }
    });
  } catch (err) {
    log.error("listening for shown handouts failed", err);
  }
  openLinked().catch(err => log.error("opening a linked page failed", err));
}

/** The journal's part of the API. */
export const api = {
  open: options => JournalWindow.open(options),
  finder: () => Finder.toggle(),
  link: page => pageLink(window.location.href, page.uuid),
  memory,
  show
};
