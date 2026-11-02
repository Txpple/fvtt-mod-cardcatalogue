# Open Roll 5e: Card Catalogue

A Foundry VTT module for the GM who keeps losing things in the sidebar. **Card Catalogue** turns each directory the
table uses into a case of cards: every handout, map, portrait and item at a glance, found by any word, and the one
thing you came for a click away.

- **Journal**: every page as a card; Show puts it on the players' screens in a plain Reader, in one click. Players
  get their own case of what they have been shown.
- **Scenes**: wide cards from Foundry's own thumbnails; Activate is one click, with *Back to …* to undo it. View,
  Edit, Preload and the players' bar behind the chevron. GM only.
- **Actors**: portrait cards; Open is one click. Show the art, place a token where you are looking, ownership
  behind the chevron. Players see theirs.
- **Items**: Open is one click; show the art, post to chat, or give a copy to the party behind the chevron.
- **Compendium**: every pack a wide card wearing its banner, the rail its folders; Open is one click. Lock and
  ownership behind the chevron. Players see the packs they can.
- **One window**: each sidebar button opens its case, the sidebar left as it was, and the strip across the
  top switches cases in place. A right-click on a scene, actor, item or pack card gives Foundry's own menu for it; on a
  folder, Rename and Remove.
- **Many at once**: Ctrl+click or Shift+click picks several cards; drag one and they all go to the folder. Drag a
  folder onto another in the rail to put it inside, or onto Unfiled to bring it to the top.
- **Detached windows**: detach a case into its own window and what it opens (a sheet, a confirmation) opens there.
- **Painted sidebar icons**: every tab button wears a picture in place of its glyph, so players find the tab they
  want. Each player can also draw the sidebar's buttons bigger (up to twice), on their own client.
- **The sidebar shows only the tabs the table uses**: players lose Combat, Placeables, Items, Rollable Tables, Cards
  and Macros; GMs lose Combat, Rollable Tables, Cards and Macros.
- **Six settings**: *Enabled for …?* for each case (all on to begin with) and the sidebar's button size.
- **A skin, nothing more.** It writes only what Foundry's own directories write; history lives in your
  browser. Classic Mode puts any directory back, per case, per client.

Replaces Open Roll 5e: Scroll Case (its settings, history and page links carry over) and House Rules' two sidebar rules.

Requires Foundry VTT 14 and, for actors and items, the dnd5e system. MIT.

<!-- openroll5e:family -->
## Part of Open Roll 5e

Card Catalogue is one of the Open Roll 5e modules for Foundry VTT, a suite built for one D&D 5e table and
shared. Each module installs and works on its own and none needs another; together they cover the
table from the fog of war to the loot. The other modules:

- [Open Roll 5e: Autoexplore](https://github.com/Txpple/fvtt-mod-autoexplore): lets a scene start fully explored, so the whole map shows through the fog of war while tokens still need line of sight.
- [Open Roll 5e: By the Books](https://github.com/Txpple/fvtt-mod-bythebooks): the 2024 rules played from the sheet: a hit rolls and applies its own damage, saves resolve themselves, reactions hold, concentration is tracked, and rests, senses, sizes and lights follow the book. Every rule that rides a use or an effect in the 2024 core books, Heroes of Faerûn, Arcana Unleashed and Ravenloft: The Horrors Within, each step with a receipt and a revert; offered, never enforced.
- [Open Roll 5e: Combat Plus](https://github.com/Txpple/fvtt-mod-combatplus): automates the chores of running a fight: combat music, an initiative gate, an out-of-turn movement block, defeated marking at 0 HP and turn alerts.
- [Open Roll 5e: Errata](https://github.com/Txpple/fvtt-mod-errata5e): corrects, in memory, bugs in the premium D&D 2024 books, the dnd5e system and Foundry itself, each fix held until the vendor ships its own.
- [Open Roll 5e: FX Studio](https://github.com/Txpple/fvtt-mod-fxstudio): visual and sound effects for dnd5e, played from what actually happened at the table, with about a thousand stock FX and a window for authoring your own.
- [Open Roll 5e: Loot Shelf](https://github.com/Txpple/fvtt-mod-lootshelf): loot chests and merchant shelves that players can take from, buy from and sell to without owning them, with a receipt for every trade.
- [Open Roll 5e: Open Server](https://github.com/Txpple/fvtt-mod-openserver): for hosted worlds: clears the startup pause so players can play before the GM arrives, and gives every user a one-click jump to their character's token, and their familiar's, from the Players list.
- [Open Roll 5e: Party Stash](https://github.com/Txpple/fvtt-mod-partystash): makes a dnd5e Group actor's inventory a working party stash: drags move instead of copying, coin moves through a dialog, and every transfer posts a receipt.
- [Open Roll 5e: Area Sounds](https://github.com/Txpple/fvtt-mod-areasounds): background sound for scenes: random one-shots with silence between them, seamless crossfaded loops, day and night gating, and quiet during combat.
- [Open Roll 5e: Token Art](https://github.com/Txpple/fvtt-mod-tokenart): gives every token the look of its state, ready, in combat or dead, each a file named beside the base art, with nothing to configure.
- [Open Roll 5e: Clue Board](https://github.com/Txpple/fvtt-mod-clueboard): keeps the party's Mysteries: every clue the GM hands them, stamped with where it was found and who has read it, sorted into the questions the party names.

Three MCP servers for [Claude Code](https://claude.com/claude-code) complete the suite:

- [fvtt-mcp-dnd5e](https://github.com/Txpple/fvtt-mcp-dnd5e): builds D&D 5e content in a live Foundry world from Claude Code: a stat block becomes a complete NPC, a map image a walled and lit scene, an adventure its journals, tables and handouts.
- [fvtt-mcp-imagegen](https://github.com/Txpple/fvtt-mcp-imagegen): makes the art with Google's Gemini image models: icons, tokens, props, portraits and illustrations, token redresses and restyles, battlemap and overland-map repaints, and the illustrated session records, all grounded in what the world already shows.
- [fvtt-mcp-sessionscribe](https://github.com/Txpple/fvtt-mcp-sessionscribe): turns a session's Discord recording and Foundry chat log into its record. Its end-to-end `session-scribe` skill drives the server from the Craig link to a speaker-labelled transcript, a fully illustrated player recap, combat statistics, GM notes and a party snapshot.

Issues are welcome on every repo in the family; pull requests are not accepted, since each is one
author's design for one table, shared because it might suit yours. How they fit together is mapped in [fvtt-suite-openroll5e](https://github.com/Txpple/fvtt-suite-openroll5e).
<!-- /openroll5e:family -->
