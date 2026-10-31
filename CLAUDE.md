# fvtt-mod-cardcatalogue — working notes for sessions in this repo

**What this is.** Open Roll 5e: Card Catalogue, a Foundry VTT module: every directory the table uses as a case of
cards. The journal (Scroll Case 1.0.4, carried over whole), the scenes (the Map Case prototype), the actors and the
items, each opened by its own sidebar button and switched between in place by a strip across the top; and the
sidebar showing only the tabs the table uses (the two rules carried over from House Rules 1.3.0). A skin over
Foundry's own directories. Part of Open Roll 5e (the suite repo is `..`, its CLAUDE.md has the family's conventions;
the plan is `../docs/plans/cardcatalogue.md`). Plain ES modules, no build step, no libWrapper, no socketlib, MIT.

**State (2026-10-31).** 1.0.0 released and on prod (the user: "commit/push, put on prod. remove scroll case and archive
it"): installed and enabled through the installer, every released file served byte-identical, a prod GM page opening
every case with all its cards (journal 31, scenes 50, actors 84, items 39) and its sidebar without the hidden tabs;
Scroll Case disabled, uninstalled and its repo archived. Before it, 0.1.0, the working draft: the public repo `Txpple/fvtt-mod-cardcatalogue`
(made on the user's word, `verify` green on GitHub), in `repos.json` without a blurb until it is released and
Scroll Case retires; the name is free (the setup screen's `getPackages`, 7,087 modules, has no "Card Catalogue",
no `cardcatalog` and no "catalogue" at all). On the sandbox (`deploy --local`, registered by a
restart, enabled; Scroll Case and Map Case disabled there, House Rules 1.4.0 deployed `--local` beside it).
`npm run verify` green (129 tests); the three walks GREEN on the sandbox: `tools/journal-check.mjs --walk` 43
(Scroll Case's, ported), `tools/scenes-check.mjs --walk` 27 (Map Case's), `tools/docs-check.mjs` 25.

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
  intercepts each tab button (click and middle click, failing open to the stock tab), adds Classic Mode's way back
  to each stock directory, draws the strip (the sidebar's order: Scenes, Actors, Items, Journal; none when only one
  case is on) and switches cases in place (the other window opens where this one stands, this one closes).
- **Each case has its two switches**: `<case>Enabled` (world, reload) and `<case>Classic` (client). A case's own
  files read them as `enabled` and `classic` through its `common.js` (`caseScope`), and its strings under `<case>.`,
  so the code carried over from Scroll Case and Map Case reads as it did there.
- **A summoned creature is no card of a player's** (the user's ruling): the actors case hides from players every
  actor dnd5e marks as its own copy of a summon (`isSummonCopy`: `flags.dnd5e.isAutoImported`, or `summonedCopy`),
  though its owner keeps the token and the stock directory still lists it. The GM sees them all.
- **Who sees which case**: the journal and actors every user; scenes GMs (the tab is GM only); items GMs, and a
  player only while the sidebar keeps their Items tab (`gmOnly` on `CONFIG.ui.sidebar.TABS.items`).
- **No side panel, no pins** (the user's rulings: "the actions i need are in that little yellow chevron"). A click
  on a card does the case's one thing: the journal opens the page to read (the Reader; a picture on no page, to
  look at), scenes view, actors and items open the sheet. The card's button: Show for a page, **View** for a scene
  (only the GM moves; "You are here" greyed on the scene this client is on), Open for an actor or an item. The
  chevron holds the rest: the journal's Show options; the scenes' Activate (Pull everyone on the active scene),
  Edit, Notes, Preload, the bar, the thumbnail; the actors' and items' GM actions. A page's visibility per player
  and its section are set through Show and a drop on the rail, or Foundry's own sheet. **One finder per case** (the user's
  ruling): the journal's Ctrl+Shift+H (Enter shows), the scenes' Ctrl+Shift+M (Enter views), the actors' and items'
  unbound (Enter opens; Ctrl+Enter shows the art, or posts the item to chat).
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
- **Actors and items share one window** (`docs/library.js`, `docs/finder.js`, `templates/docs/`), each configured by
  a spec in its `case.js`: its collection, its search fields (`docs/decide.js` matches over them), how a document
  becomes a card, its views, its one action and its chevron.
- **A picture shown from actors or items** (`shell/art.js`) goes through the journal case's Show (the same Reader on
  the players' screens) while the journal case is on, else Foundry's own image share.

## How the code is laid out

- `scripts/cardcatalogue.js`: the entry point; every case's switches and finder key, the journal's and the tabs'
  settings, the templates at `init`; the stylesheet probe, the migration, the cases' `ready`, `module.api` (one key
  per case, `classic`, `hasCase`).
- `scripts/common.js`: the id, the logger, `t`, `setting`, `switchKey`, `caseScope`.
- `scripts/shell/`: `cases.js` (registry, takeover, strip, switching, Classic Mode), `migrate.js`, `art.js`.
- `scripts/journal/`: Scroll Case 1.0.4's files (`decide.js` was `decide/scrollcase.js`, `journal.js` its entry
  point's journal part); ids `cardcatalogue-journal-*`, the hook `cardcatalogue.shown`, the socket channel
  `module.fvtt-mod-cardcatalogue`.
- `scripts/scenes/`: Map Case 0.1.0's files (`case.js` its entry point's part); the hook `cardcatalogue.activated`.
- `scripts/actors/case.js`, `scripts/items/case.js`: the specs. `scripts/docs/`: their shared window, finder,
  record and pure decisions.
- `scripts/tabs/`: the sidebar-tabs rules.
- `templates/{journal,scenes,docs}/`, `styles/cardcatalogue.css`, `lang/en.json` (root keys, then one block per case).
- `tests/`: `journal.test.js`, `scenes.test.js`, `docs.test.js`, `tabs.test.js`, the kit's.
- `tools/journal-check.mjs`, `tools/scenes-check.mjs`, `tools/docs-check.mjs`: the sandbox walks
  (`FOUNDRY_HOST=local`, `--shots <dir>`); each refuses any other host.
