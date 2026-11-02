# fvtt-mod-cardcatalogue — working notes for sessions in this repo

**What this is.** Open Roll 5e: Card Catalogue, a Foundry VTT module: every directory the table uses as a case of
cards. The journal (Scroll Case 1.0.4, carried over whole), the scenes (the Map Case prototype), the actors, the
items and the compendium packs, each opened by its own sidebar button and switched between in place by a strip across the top; and the
sidebar showing only the tabs the table uses (the two rules carried over from House Rules 1.3.0). A skin over
Foundry's own directories. Part of Open Roll 5e (the suite repo is `..`, its CLAUDE.md has the family's conventions;
the plan is `../docs/plans/cardcatalogue.md`). Plain ES modules, no build step, no libWrapper, no socketlib, MIT.

**State (2026-11-01).** Unreleased: the compendium case (the user: "i want compendiums added just like we have the others ... folders of compendiums ... in the rail ... RMBs ... thumbnails are used for the cards"), the packs as wide banner cards on the shared docs window, and the client's sidebar button size (`tabScale`, "lets start with 2x scale"); deployed `--local`, `verify` green, `docs-check` GREEN with its compendium step; committed and pushed ("Commit and push"). Before it, on `main` (the user: "ok go put on sandbox", then "Commit both"): the Reader's *Open in journal* gone (Classic Mode is the way to the stock sheet); painted pictures on every sidebar tab button (`tabIcons`, world, on; Clue Board's button follows the body's class); a case's button lights its tab with the stock directory behind the window; a right-click on a scenes, actors or items card selects it and opens the stock directory's own entry menu. Deployed `--local` (the sandbox world had neither Card Catalogue nor Clue Board enabled after the cut-over mirror: both enabled, the world restarted); `verify` green (137 tests); `docs-check` and `scenes-check` GREEN; `journal-check --walk` red only on "portraits ysolde", which 1.0.7 fails the same way (the sandbox's data). 1.0.7 (the journal's export named as the other cases', `cardcatalogue-journal-<view>-<date>.json`, format `fvtt-mod-cardcatalogue/journal`, no longer Scroll Case's) released and on prod; 1.0.6 (the journal's *Not in a journal* row and the scenes' *On the players' bar* and *Off the bar* rows gone from the rails) released and on prod; 1.0.5 (Export of the cards in view in the scenes, actors and items cases, as the journal's, `shell/export.js`; the journal's folder headings laid from the left) released and on prod; 1.0.4 (a folder's caret is its own button beside the row: inside it, a real click picked
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
  listens on each tab button (a click opens the case and still reaches the sidebar, which lights the tab and opens
  the stock directory behind the window; a middle click, which the sidebar ignores, changes the tab itself), adds
  Classic Mode's way back to each stock directory, draws the strip (the sidebar's order: Scenes, Actors, Items, Journal, Compendium; none when only one
  case is on) and switches cases in place (the other window opens where this one stands, this one closes).
- **Each case has its two switches**: `<case>Enabled` (world, reload) and `<case>Classic` (client). A case's own
  files read them as `enabled` and `classic` through its `common.js` (`caseScope`), and its strings under `<case>.`,
  so the code carried over from Scroll Case and Map Case reads as it did there.
- **A summoned creature is no card of a player's** (the user's ruling): the actors case hides from players every
  actor dnd5e marks as its own copy of a summon (`isSummonCopy`: `flags.dnd5e.isAutoImported`, or `summonedCopy`),
  though its owner keeps the token and the stock directory still lists it. The GM sees them all.
- **Who sees which case**: the journal and actors every user; scenes GMs (the tab is GM only); items GMs, and a
  player only while the sidebar keeps their Items tab (`gmOnly` on `CONFIG.ui.sidebar.TABS.items`); the compendium
  every user, a player the packs they can observe (the stock directory's rule).
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
  drop's `folder` write). A right-click on a folder's row (`folderMenu`, Foundry's own ContextMenu) offers Remove
  Folder: Foundry's own confirm and words, the folder deleted and its cards and subfolders moved up to its parent,
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
  left out. The right-click selects the card. The journal has none: its cards are pages, which the stock Journal
  tab has no menu for.
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
- **The sidebar's button size is the client's** (`tabScale`: Foundry's own, then 1.25 to 2 times by quarters, 2 the most (the user's word); the user's "gate it behind
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
- `scripts/shell/`: `cases.js` (registry, takeover, strip, switching, Classic Mode), `entries.js` (a card's
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
