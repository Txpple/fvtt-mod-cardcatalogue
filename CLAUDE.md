# fvtt-mod-cardcatalogue — working notes for sessions in this repo

**What this is.** Open Roll 5e: Card Catalogue, a Foundry VTT module: every directory the table uses as a case of
cards. The journal (Scroll Case 1.0.4, carried over whole), the scenes (the Map Case prototype), the actors, the
items and the compendium packs, each opened by its own sidebar button and switched between in place by a strip across the top; and the
sidebar showing only the tabs the table uses (the two rules carried over from House Rules 1.3.0). A skin over
Foundry's own directories. Part of Open Roll 5e (the suite repo is `..`, its CLAUDE.md has the family's conventions;
the plan is `../docs/plans/cardcatalogue.md`). Plain ES modules, no build step, no libWrapper, no socketlib, MIT.

**State (2026-11-03).** 1.0.16, the actors a player has Limited on (the user: "i would like players to be able to see certain actors too ... but not have any form of ownership"; Limited, the stock directory's rule, was already the case's): such a card says its kind alone, its search reads the public biography, the GM's card wears an eye naming the players who see it without owning it, and a rail folder's right-click gives Foundry's Configure Ownership (not on scene or pack folders), so a folder is shared in one step. `verify` green (148 tests); deployed `--local`; `tools/docs-check.mjs` GREEN 46/46 on the sandbox, with a scratch NPC at Limited for the temp player (the walk's Mine read now waits for the redraw, and its cleanup writes the ownership map whole, since `ownership.-=<id>` fails validation on 14). Released and on prod (the user: "Release and prod"): the annotated `v1.0.16` through the reusable workflow, `latest` serving it; the installer PASS with only the bridge connected, 68/68 served files byte-identical with the zip, a prod GM page reading 1.0.16 active. The sandbox's files redeployed `--local` from the tag's tree, its Foundry not restarted (the DM's browser connected), so its module list reads 1.0.15 until a restart. 1.0.15 (the sidebar's buttons at Foundry's own size by default, the user: "make the default 1.0 (foundry's own)"; a client that picked a size keeps it) released and on prod. 1.0.14 (the painted sidebar icons made for a black background, the user: "many of the icons are dark/brown, which lacks contrast"; then "no brown ... too complex": new from imagegen, the user picking each, Scenes a painted meadow tile under sun and clouds, Actors a grey old-school character sheet, Placeables a silver lantern, Items one blue potion, Journal the same book in blue leather; every other icon's midtones lifted toward one brightness and a soft warm rim drawn behind each silhouette) released and on prod. 1.0.13 (a player sees the rail's folders again in the actors, items and compendium cases: a world Folder's `visible` is false for every player, so filtering by it had hidden them all; the stock directory's rule, a folder holding anything the player sees, is `folderTree`'s own; the user: "as a player i do not see compendium folders but i do in classic mode") released and on prod. 1.0.12 (Export writes each owned actor and item whole, identical to its sheet's Export Data, checked on the sandbox against Cecil Edmunds' own; only the picked cards when several are picked) released and on prod. 1.0.11 (the rails' folders ordered as Foundry's own directory orders them: the top by the directory's sorting mode, a folder's children by its own `sorting`; the user: "my actor folders in the rail dont seem to be sorting alphabetically", old manual `sort` values had won) released and on prod. 1.0.10 (what a case window opens follows it into a detached window, centred; Ctrl/Shift multi-select with the picked cards dragged together; folders dragged in the rail; the sandbox's three walks GREEN and each checked live with scratch actors and folders) released and on prod. 1.0.9 (Rename Folder beside Remove Folder on a rail's right-click, its dialog centred; checked on the sandbox with a scratch folder) released and on prod, on the user's word ("you can just release put on prod all the way"). 1.0.8 released and on prod (the user: "commit, push, deploy to prod ... (release too)"): the compendium case, a card's stock right-click menu (its dialogs centred), the painted sidebar icons, the client's button size (1.25 to 2 times, 1.25 by default), the sidebar left where it was when a case opens, the settings menu cut to *Enabled for <Case>?* and the size, the Reader without *Open in journal*. A Playlists case was built and dropped on the user's word ("drop it": the stock tab is a mixing desk, not a catalogue). Before the tag: `verify` green, `docs-check`, `scenes-check` and `journal-check --walk` GREEN on the sandbox; the release run green; prod installed through the installer with no one connected, 66/66 served files byte-identical with the release, a prod GM page reading 1.0.8 active, the six-line menu all on, 11 painted buttons and 64 pack cards for 64 packs. The sandbox mirrored from prod after. 1.0.7 (the journal's export named as the other cases', `cardcatalogue-journal-<view>-<date>.json`, format `fvtt-mod-cardcatalogue/journal`, no longer Scroll Case's) released and on prod; 1.0.6 (the journal's *Not in a journal* row and the scenes' *On the players' bar* and *Off the bar* rows gone from the rails) released and on prod; 1.0.5 (Export of the cards in view in the scenes, actors and items cases, as the journal's, `shell/export.js`; the journal's folder headings laid from the left) released and on prod; 1.0.4 (a folder's caret is its own button beside the row: inside it, a real click picked
the folder; walked with the real mouse) released and on prod before it; 1.0.3 (a click selects a card, a double click or Enter does its one thing; the rail's
folders collapse by a caret, the journal's folder headings collapse their journals, each browser remembering)
released, never on prod; 1.0.2 (the top level is *Unfiled*; *+ Create New Folder* a gold pill as Clue Board's New
Thread; a right-click on a folder's row removes it, Foundry's own Remove Folder) released, never on prod. 1.0.1 (the journal's bar on one line; a page's Copy link and Copy @ reference in its
chevron; New Folder and empty folders in the GM's rail) released and on prod. 1.0.0 released and on prod (the user: "commit/push, put on prod. remove scroll case and archive
it"): installed and enabled through the installer, every released file served byte-identical, a prod GM page opening
every case with all its cards (journal 31, scenes 50, actors 84, items 39) and its sidebar without the hidden tabs;
Scroll Case disabled, uninstalled and its repo archived. Before it, 0.1.0, the working draft: the public repo `Txpple/fvtt-mod-cardcatalogue`
(made on the user's word, `verify` green on GitHub), in `repos.json` without a blurb until it is released and
Scroll Case retires; the name is free (the setup screen's `getPackages`, 7,087 modules, has no "Card Catalogue",
no `cardcatalog` and no "catalogue" at all). On the sandbox (`deploy --local`, registered by a
restart, enabled; Scroll Case and Map Case disabled there, House Rules 1.4.0 deployed `--local` beside it).
`npm run verify` green (138 tests); the three walks GREEN on the sandbox: `tools/journal-check.mjs --walk` 43
(Scroll Case's, ported), `tools/scenes-check.mjs --walk` 28 (Map Case's), `tools/docs-check.mjs` 33.

## The rules this module keeps

- **A skin, no data of its own** (Scroll Case's ruling, kept for every case): no flag, no document of its own, no
  setting used as a store. Every world write is one the stock directory or sheet makes: the journal's in
  `journal/show.js` (a page's ownership and section, a new section, an image page for a kept picture); the scenes'
  in `scenes/scenes.js` (`active`, `navigation`, `thumb`, `folder`); the actors' a token placed and the stock
  ownership dialog; the items' a copy on an actor and dnd5e's chat card; any card's `folder` from a drop on the rail.
  Recently shown or opened, New, the view and the size live in localStorage per case, world and user.
- **The cases are registered, the shell is shared** (`shell/cases.js`): each case registers its id, sidebar tab,
  icon, who sees it, how it opens, and `aside()` (the module it replaces is still active: Scroll Case for the
  journal, Map Case for scenes; the case stays out of the way so two windows never answer one button). The shell
  intercepts each tab button (click and middle click, failing open to the stock tab), so the window opens and the
  sidebar stays where it was, the chat most of the time (the user, after trying the tab lit behind the window: "the
  side window stays the same and does not show the classic menu"), adds Classic Mode's way back to each stock
  directory, draws the strip (the sidebar's order: Scenes, Actors, Items, Journal, Compendium; none when only one
  case is on) and switches cases in place (the other window opens where this one stands, this one closes).
- **The settings menu is six lines** (the user's audit: "there should just be 'Enabled for Scenes?' and they should
  all default to yes. default the buttons to 1.25x"): *Enabled for <Case>?* for each case, in the strip's order,
  all on by default, and the client's *Sidebar button size* (Foundry's own by default, the user's later word, "make the default 1.0"; a value no longer offered draws at
  it). Everything else is registered `config: false` and keeps its value: each Classic Mode (the windows' own
  button and the directories' way back), the journal's three (`showKeeps`, `assetFolders`, `handoutsJournal`), the
  two sidebar-tabs rules and `tabIcons`.
- **Each case has its two switches**: `<case>Enabled` (world, reload) and `<case>Classic` (client). A case's own
  files read them as `enabled` and `classic` through its `common.js` (`caseScope`), and its strings under `<case>.`,
  so the code carried over from Scroll Case and Map Case reads as it did there.
- **A summoned creature is no card of a player's** (the user's ruling): the actors case hides from players every
  actor dnd5e marks as its own copy of a summon (`isSummonCopy`: `flags.dnd5e.isAutoImported`, or `summonedCopy`),
  though its owner keeps the token and the stock directory still lists it. The GM sees them all.
- **Who sees which case**: the journal and actors every user; scenes GMs (the tab is GM only); items GMs, and a
  player only while the sidebar keeps their Items tab (`gmOnly` on `CONFIG.ui.sidebar.TABS.items`); the compendium
  every user, a player the packs they can observe (the stock directory's rule). A player's rail shows a folder
  holding a card they see, as the stock directory does; never by a Folder's `visible`, false for every player.
- **A player's actors are the stock directory's, Limited and up; Limited reads as dnd5e's limited sheet**: a card
  they only have Limited on says its kind alone (no level, CR, creature type, class or species) and is searched by
  its public biography, never the private one; Observer and up reads the whole line and both biographies. The GM's
  card wears an eye naming the players who see an actor without owning it. Sharing is Foundry's own ownership:
  the chevron's Ownership for one actor, a rail folder's Configure Ownership for every actor directly in it.
- **No side panel, no pins** (the user's rulings: "the actions i need are in that little yellow chevron"). **A click
  selects a card, a double click (or Enter) does the case's one thing** (the user's ruling, every case and every
  user alike): the journal opens the page to read (the Reader; a picture on no page, to look at), scenes view,
  actors and items open the sheet. The selection is marked in place (`shell/cards.js`), never by a redraw, so the
  second click of a double click lands on the same card. The card's button: Show for a page, **View** for a scene
  (only the GM moves; "You are here" greyed on the scene this client is on), Open for an actor or an item. The
  chevron holds the rest: the journal's Show options; the scenes' Activate (Pull everyone on the active scene),
  Edit, Notes, Preload, the bar, the thumbnail; the actors' and items' GM actions. A page's visibility per player
  and its section are set through Show and a drop on the rail, or Foundry's own sheet; a page's chevron (the Show
  options) carries its web link (`/game?page=<uuid>`) and its `@UUID` reference.
- **The rails hold what the user keeps** (the user's ruling, "remove these items"): the journal's GM rail is All,
  Visible to players, GM only and the journals, a picture on no page coming up only in All's search; the scenes'
  rail is All, Active and viewed and the folders, the players' bar set from the chevron.
- **Folders, for the GM** (the user: "+Create Folder just like we can create a thread in clue board"): Create New Folder at
  the foot of the scenes', actors' and items' rails asks a name in Foundry's dialog and makes the folder inside the
  one in view when Foundry's depth allows (`shell/folders.js`), the view moving to it; the GM's rail lists empty
  folders (`folderTree`'s `keepEmpty`) and Unfiled (the top level), so a card dragged onto any of them is filed there (the stock
  drop's `folder` write; the rail's order is the stock directory's, `folderTree`'s `rootSorting` and each folder's `sorting`). A right-click on a folder's row (`folderMenu`, Foundry's own ContextMenu) offers Rename
  Folder (the user: "id like to also rename a folder"; the name asked again in a centred dialog, filled in, the
  folder's `name` written as its sheet writes it), Configure Ownership (Foundry's own folder dialog, which writes
  each document directly in the folder; left out on scene and pack folders, as their stock directories leave it
  out) and Remove Folder: Foundry's own confirm and words, the folder deleted and its cards and subfolders moved up to its parent,
  as the stock directory's Remove Folder does; Delete All stays in the stock directory. A folder with folders under it
  has a caret that collapses them (`collapseTree`, pure and tested), its own button beside the row in a
  `.cc-folderline` (inside the row, a real click picked the folder; a scripted `.click()` hid that, so the walk
  clicks it with the real mouse); the journal's folder headings collapse their
  journals; what is collapsed lives in each case's browser record. The journal files by section,
  as Scroll Case did. **One finder per case** (the user's
  ruling): the journal's Ctrl+Shift+H (Enter shows), the scenes' Ctrl+Shift+M (Enter views), the actors' and items'
  unbound (Enter opens; Ctrl+Enter shows the art, or posts the item to chat).
- **A card's right-click is the stock directory's** (the user: "the same choices that i get ... in classic mode"),
  scenes, actors and items (`shell/entries.js`): the entries come from the directory's `_getEntryContextOptions`
  and its `get<Document>ContextOptions` hook, each run against a stand-in `li.directory-item` carrying the
  document's id, so the system's and modules' entries work as in the sidebar; one that throws on the stand-in is
  left out. The right-click selects the card (keeping a pick it is in). The stock entries place what they open for
  the sidebar (Delete's confirmation at the screen's right edge); the first window an entry opens is centred instead
  (the user: "center it, its appearing on the top right"). The journal has none: its cards are pages, which the
  stock Journal tab has no menu for.
- **What a case window opens follows it** (`shell/host.js`; the user: "if i detach a window in catalogue, the modals
  appear in main window"): every case window notes each press and key inside it; the first window that opens within
  a moment (a dialog, a sheet, the Reader) is moved into the case window's own browser window when it is detached
  (`render({ window: { windowId } })`, Foundry's own move) and centred there. Another case window is never moved.
  Clue Board keeps a copy for its window (its `scripts/host.js`): a change to either is made in both.
- **Several cards picked at once** (`shell/pick.js`, pure and tested; the user: "multiselect cards so i can mass move
  / drag them"): in the scenes, actors, items and compendium cases Ctrl (or Cmd) adds a card or takes it out, Shift
  picks the run from the last card clicked, in the order drawn; a plain click picks one. Dragging a picked card
  carries every picked card, each filed as its own stock drop. Clue Board keeps a copy of the rule.
- **Export is the cards in view, or the cards picked** (`shell/export.js`, `cardcatalogue-<case>-<view>-<date>.json`):
  each card's summary, and in the actors and items cases (`wholeExport`) the whole document under `document`, as
  its sheet's Export Data writes it (`wholeOf`: `toCompendium` with the source kept and `_stats.exportSource`; the
  user: "export the entire actor, as if it was exported from the char sheet"), for an owner only, as the stock
  entry is. With several cards picked, only those are written.
- **Folders dragged in the rail** (`wireFolderDrag` in `shell/folders.js`, the GM's; the user: "drag and drop folders
  in the rail"): a folder dropped on another goes inside it, on Unfiled to the top (the folder's `folder`, the stock
  drop's write); never into itself or a folder under it, never past `CONST.FOLDER_MAX_DEPTH` (`nestAs`, pure and
  tested). Foundry marks every `dragover` on the page droppable, so a refused drop shows by the row not lighting.
- **The painted sidebar icons** (`tabs/icons.js`, `styles/icons/tabs/<tab>.webp`, the user's picks from imagegen):
  each stock tab and Dice So Nice's wears a picture in its glyph's `::before`, its URL a variable the script sets on
  the button (the path holds however v14 bundles the sheet), drawn only under the body's `cardcatalogue-tab-icons`
  (the world switch `tabIcons`). Clue Board draws its own button's picture under the same class, so neither
  module needs the other. A tab with no picture keeps its glyph.
- **The sidebar-tabs rules** (`tabs/rules.js` pure and tested, `tabs/apply.js` the writes) are House Rules 1.3.0's,
  whole: players lose Combat, Placeables, Items, Rollable Tables, Cards and Macros; GMs lose Combat, Rollable
  Tables, Cards and Macros. **While House Rules still registers its own two switches, both step aside**, so either
  can be installed first and no tab is hidden twice.
- **The cut-over** (`shell/migrate.js`): on a GM's load, a world setting this module has never stored takes the
  value Scroll Case or House Rules stored (the world's Setting documents outlive a removed module; their `value` is
  already parsed); each browser's Classic Mode for the journal takes Scroll Case's (JSON text in localStorage), and
  the journal's record falls back to Scroll Case's key the first time it has none.
- **The look is Scroll Case's**, the family's, in `styles/cardcatalogue.css` under the `cc-` prefix and the
  `cardcatalogue` window class; each case's own rules follow, scoped to its window. Clue Board copies it from here.
- **Actors, items and the compendium share one window** (`docs/library.js`, `docs/finder.js`, `templates/docs/`),
  each configured by a spec in its `case.js`: its collection, its search fields (`docs/decide.js` matches over
  them), how an entry becomes a card, its views, its one action and its chevron. A pack is no document, so the
  compendium spec says how its cards are keyed (`keyOf`: the pack's collection id; `resolve`), named, pictured (the
  pack's `banner`, Foundry's 290 × 70 strip, so its cards are wide), railed by folder alone (`noTypes`, the user's
  "i just want the folders"), seen (`canSee`), dragged (`dragData`), filed
  (`file`: `setFolder`, the stock drop) and right-clicked (`row`: the stand-in's `data-pack`); a document case says
  none of it.
- **The sidebar's button size is the client's** (`tabScale`: Foundry's own, the default, then 1.25 to 2 times by quarters, 2 the most (the user's word); the user's "gate it behind
  a client setting"): Foundry gives each `.ui-control` its own `--control-size`, so the strip's buttons alone are
  scaled, under the body's `cardcatalogue-tab-scale`; a strip taller than the screen (2 times is 888px) scrolls
  under the wheel, no bar, rather than lose its last buttons.
- **A picture shown from actors or items** (`shell/art.js`) goes through the journal case's Show (the same Reader on
  the players' screens) while the journal case is on, else Foundry's own image share.

## How the code is laid out

- `scripts/cardcatalogue.js`: the entry point; every case's switches and finder key, the journal's and the tabs'
  settings, the templates at `init`; the stylesheet probe, the migration, the cases' `ready`, `module.api` (one key
  per case, `classic`, `hasCase`).
- `scripts/common.js`: the id, the logger, `t`, `setting`, `switchKey`, `caseScope`.
- `scripts/shell/`: `cases.js` (registry, takeover, strip, switching, Classic Mode), `host.js` (where what a case window opens appears), `pick.js` (the multi-pick and folder-nesting rules), `entries.js` (a card's
  right-click), `migrate.js`, `art.js`.
- `scripts/journal/`: Scroll Case 1.0.4's files (`decide.js` was `decide/scrollcase.js`, `journal.js` its entry
  point's journal part); ids `cardcatalogue-journal-*`, the hook `cardcatalogue.shown`, the socket channel
  `module.fvtt-mod-cardcatalogue`.
- `scripts/scenes/`: Map Case 0.1.0's files (`case.js` its entry point's part); the hook `cardcatalogue.activated`.
- `scripts/actors/case.js`, `scripts/items/case.js`, `scripts/compendium/case.js`: the specs. `scripts/docs/`:
  their shared window, finder, record and pure decisions.
- `scripts/tabs/`: the sidebar-tabs rules; `icons.js`, the painted icons (`styles/icons/tabs/`) and the button size.
- `templates/{journal,scenes,docs}/`, `styles/cardcatalogue.css`, `lang/en.json` (root keys, then one block per case).
- `tests/`: `journal.test.js`, `scenes.test.js`, `docs.test.js`, `tabs.test.js`, the kit's.
- `tools/journal-check.mjs`, `tools/scenes-check.mjs`, `tools/docs-check.mjs`: the sandbox walks
  (`FOUNDRY_HOST=local`, `--shots <dir>`); each refuses any other host.
