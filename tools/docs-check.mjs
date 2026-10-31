// The live check of the actors and items cases, the case strip and the cut-over, on the sandbox: a
// GM page (the bridge user) and a temporary player page, every fact read from the world.
//
//   FOUNDRY_HOST=local node tools/docs-check.mjs [--shots <dir>]
//
// The GM page opens the actors case from the sidebar's button, searches, opens a sheet with the
// card's one button, places a token on a scratch scene from the chevron, switches to the items
// case in place, reads the items' cards and the chevron's Give to…, and reads the settings carried
// over from Scroll Case and House Rules. A temporary player connects: their actors case lists the
// actors they can see, their own in Mine, no chevron. The scratch scene, its token and the temp
// user go in `finally`.
import { Foundry, foundryConfig, loadEnv } from "fvtt-mcp-dnd5e/client";

if (process.env.FOUNDRY_HOST !== "local") {
  console.error("The live check writes to the world it joins: run it on the sandbox only, with FOUNDRY_HOST=local.");
  process.exit(2);
}

const env = loadEnv();
const MODULE_ID = "fvtt-mod-cardcatalogue";
const SCRATCH = "ZZ-CC Scratch";
const TEMP_USER = "ZZ-CC Player";

const arg = n => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : null;
};
const shots = arg("shots");

let fails = 0;
const assert = (cond, msg) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) fails++;
};
const lines = [];
function watch(f, label) {
  f.page.on("console", msg => {
    const type = msg.type();
    if (type === "error" || /card ?catalogue|cardcatalogue/i.test(msg.text())) lines.push(`[${label} ${type}] ${msg.text()}`);
  });
  f.page.on("pageerror", err => lines.push(`[${label} pageerror] ${err?.message ?? err}`));
}

let cleanup = async () => {};
setTimeout(async () => {
  console.error("[docs] WATCHDOG: 240s elapsed, cleaning up and aborting");
  await cleanup().catch(() => {});
  process.exit(3);
}, 240_000).unref();

const f = new Foundry(foundryConfig(env));
console.log("[docs] connecting as the GM…");
await f.connect();
watch(f, "gm");
await f.page.setViewportSize?.({ width: 1600, height: 1000 }).catch(() => {});
const shot = async (page, name) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` }).catch(() => {});
};

let fp = null;
let prior = null;
cleanup = async () => {
  cleanup = async () => {};
  if (fp) await fp.disconnect?.().catch(() => {});
  await f
    .evaluate(
      async ({ scratch, userName, prior }) => {
        if (prior?.viewedId && canvas.scene?.id !== prior.viewedId) await game.scenes.get(prior.viewedId)?.view();
        for (const s of game.scenes.filter(s => s.name === scratch)) await s.delete();
        for (const u of game.users.filter(u => u.name === userName)) await u.delete();
        for (const app of [...foundry.applications.instances.values()]) {
          if (app.id?.startsWith("cardcatalogue-") || app.document?.documentName === "Actor" || app.document?.documentName === "Item") await app.close();
        }
      },
      { scratch: SCRATCH, userName: TEMP_USER, prior }
    )
    .catch(err => console.log(`  cleanup: ${err?.message ?? err}`));
  await f.disconnect?.().catch(() => {});
};

try {
  prior = await f.evaluate(() => ({ viewedId: canvas.scene?.id ?? null }));

  // --- A. the actors case -------------------------------------------------------------------
  console.log("# A. the Actors button opens the actors case");
  const A = await f.evaluate(async () => {
    const wait = async (fn, n = 60) => {
      for (let i = 0; i < n; i++) {
        const v = fn();
        if (v) return v;
        await new Promise(r => setTimeout(r, 100));
      }
      return null;
    };
    for (const app of [...foundry.applications.instances.values()]) if (app.id?.startsWith("cardcatalogue-")) await app.close();
    const before = ui.sidebar.tabGroups.primary;
    document.querySelector('#sidebar-tabs [data-tab="actors"]')?.click();
    const win = await wait(() => foundry.applications.instances.get("cardcatalogue-actors-library")?.rendered && foundry.applications.instances.get("cardcatalogue-actors-library"));
    const el = win?.element;
    const cards = el?.querySelectorAll(".cc-card[data-key]").length ?? 0;
    const strip = [...(el?.querySelectorAll(".cc-case") ?? [])].map(b => b.dataset.case);
    // All is in type order (characters, NPCs, groups…), each type by name.
    const RANK = ["character", "npc", "group", "encounter", "vehicle"];
    const rank = t => (RANK.includes(t) ? RANK.indexOf(t) : RANK.length);
    const drawn = [...(el?.querySelectorAll(".cc-card[data-key]") ?? [])].map(c => fromUuidSync(c.dataset.key));
    const inOrder = drawn.every((a, i) => {
      const b = drawn[i + 1];
      if (!b) return true;
      return rank(a.type) < rank(b.type) || (rank(a.type) === rank(b.type) && a.name.localeCompare(b.name, game.i18n.lang, { sensitivity: "base", numeric: true }) <= 0);
    });
    const types = [...(el?.querySelectorAll('.cc-rail [data-view^="t:"]') ?? [])].map(b => b.dataset.view);
    const pc = game.actors.find(a => a.type === "character");
    const input = el?.querySelector("input[name=search]");
    input.value = pc.name.split(" ")[0].toLowerCase();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const found = [...el.querySelectorAll(".cc-card[data-key]")].filter(c => !c.hidden).map(c => c.dataset.key);
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // No panel for actors: a click on the card opens the sheet.
    el.querySelector(`.cc-card[data-key="${pc.uuid}"] [data-action="pick"]`)?.click();
    const clickSheet = !!(await wait(() => pc.sheet?.rendered));
    await new Promise(r => setTimeout(r, 300));
    const noPanel = !el.querySelector(".cc-detail");
    await pc.sheet?.close();
    await wait(() => !pc.sheet?.rendered);
    // The card's one button opens the sheet too.
    el.querySelector(`.cc-card[data-key="${pc.uuid}"] .cc-acts .go`)?.click();
    const sheet = !!(await wait(() => pc.sheet?.rendered));
    await pc.sheet?.close();
    return { before, after: ui.sidebar.tabGroups.primary, clickSheet, noPanel, inOrder, cards, total: game.actors.size, strip, types, pcName: pc.name, foundPc: found.includes(pc.uuid), sheet };
  });
  assert(A.cards === A.total && A.cards > 0, `a card per actor (${A.cards} of ${A.total})`);
  assert(A.before === A.after, "the sidebar did not switch tabs");
  assert(A.clickSheet && A.noPanel, "a click on an actor card opens its sheet, and no side panel opens");
  assert(A.inOrder, "All runs by type (characters, NPCs, groups), then by name");
  assert(["journal", "scenes", "actors", "items"].every(c => A.strip.includes(c)), `the strip holds the four cases (${A.strip.join(", ")})`);
  assert(A.types.includes("t:character") && A.types.includes("t:npc"), `the rail lists the types (${A.types.join(", ")})`);
  assert(A.foundPc, `the search finds ${A.pcName}`);
  assert(A.sheet, "the card's Open opens the sheet");
  await shot(f.page, "10-actors");

  // --- B. the chevron: a token placed on a scratch scene -------------------------------------
  console.log("# B. the chevron places a token where the GM is looking");
  const B = await f.evaluate(
    async ({ scratch }) => {
      const wait = async (fn, n = 60) => {
      for (let i = 0; i < n; i++) {
        const v = fn();
        if (v) return v;
        await new Promise(r => setTimeout(r, 100));
      }
      return null;
    };
      for (const s of game.scenes.filter(s => s.name === scratch)) await s.delete();
      const scene = await Scene.create({ name: scratch, width: 1400, height: 1000, navigation: false });
      await scene.view();
      await wait(() => canvas.scene?.id === scene.id && !canvas.loading, 150);
      const win = foundry.applications.instances.get("cardcatalogue-actors-library");
      const npc = game.actors.find(a => a.type === "npc");
      const card = await wait(() => win.element.querySelector(`.cc-card[data-key="${npc.uuid}"]`));
      card.querySelector('[data-action="openMenu"]').click();
      const menu = await wait(() => win.element.querySelector(".cc-opts .cc-menu"));
      const rows = [...(menu?.querySelectorAll("[data-act]") ?? [])].map(b => b.dataset.act);
      menu?.querySelector('[data-act="place"]')?.click();
      const placed = !!(await wait(() => scene.tokens.some(t => t.actorId === npc.id)));
      const closed = !!(await wait(() => !win.element.querySelector(".cc-opts")));
      // On this scene now holds it.
      win.element.querySelector('.cc-rail [data-view="here"]')?.click();
      // The redraw is async: wait for the view's own cards, not the last view's.
      await wait(() => win.view === "here" && win.element.querySelectorAll(".cc-card[data-key]").length < game.actors.size);
      const here = [...win.element.querySelectorAll(".cc-card[data-key]")].map(c => c.dataset.key);
      win.element.querySelector('.cc-rail [data-view="all"]')?.click();
      return { rows, placed, closed, here: here.length === 1 && here[0] === npc.uuid, npc: npc.name };
    },
    { scratch: SCRATCH }
  );
  assert(["art", "tokenArt", "place", "ownership"].every(r => B.rows.includes(r)), `the GM's chevron: Show the art, the token art, Place a token, Ownership (${B.rows.join(", ")})`);
  assert(B.placed && B.closed, `Place a token put ${B.npc} on the viewed scene and closed the chevron`);
  assert(B.here, "On this scene lists the actor with a token there, and only it");

  // --- C. switching in place, the items case ------------------------------------------------
  console.log("# C. the strip switches to items in place");
  const C = await f.evaluate(async () => {
    const wait = async (fn, n = 60) => {
      for (let i = 0; i < n; i++) {
        const v = fn();
        if (v) return v;
        await new Promise(r => setTimeout(r, 100));
      }
      return null;
    };
    const from = foundry.applications.instances.get("cardcatalogue-actors-library");
    from.setPosition({ left: 120, top: 70 });
    const pos = { left: from.position.left, top: from.position.top };
    from.element.querySelector('.cc-case[data-case="items"]').click();
    const win = await wait(() => foundry.applications.instances.get("cardcatalogue-items-library")?.rendered && foundry.applications.instances.get("cardcatalogue-items-library"));
    const closedFrom = !!(await wait(() => !from.rendered));
    const samePlace = win && Math.abs(win.position.left - pos.left) < 2 && Math.abs(win.position.top - pos.top) < 2;
    const cards = win?.element.querySelectorAll(".cc-card[data-key]").length ?? 0;
    const item = game.items.find(i => "quantity" in (i.system ?? {}));
    // No panel for items either: a click on the card opens the sheet.
    let clickSheet = false;
    let noPanel = false;
    if (item) {
      win.element.querySelector(`.cc-card[data-key="${item.uuid}"] [data-action="pick"]`)?.click();
      clickSheet = !!(await wait(() => item.sheet?.rendered));
      noPanel = !win.element.querySelector(".cc-detail");
      await item.sheet?.close();
    }
    let rows = [];
    let recipients = 0;
    if (item) {
      win.element.querySelector(`.cc-card[data-key="${item.uuid}"] [data-action="openMenu"]`)?.click();
      const menu = await wait(() => win.element.querySelector(".cc-opts .cc-menu"));
      rows = [...(menu?.querySelectorAll("[data-act]") ?? [])].map(b => b.dataset.act);
      recipients = menu?.querySelectorAll('[data-act="give"]').length ?? 0;
      win.element.querySelector('.cc-opts [data-action="closeMenu"]')?.click();
    }
    return { closedFrom, samePlace, clickSheet, noPanel, cards, total: game.items.size, rows: [...new Set(rows)], recipients, item: item?.name };
  });
  assert(C.closedFrom && C.samePlace, "the items case opened where the actors case stood, and the actors case closed");
  assert(C.cards === C.total, `a card per world item (${C.cards} of ${C.total})`);
  assert(C.clickSheet && C.noPanel, "a click on an item card opens its sheet, and no side panel opens");
  assert(["art", "post", "give"].every(r => C.rows.includes(r)), `the item chevron: Show the art, Post to chat, Give to… (${C.rows.join(", ")})`);
  assert(C.recipients > 0, `Give to… names the party and its characters (${C.recipients})`);
  await shot(f.page, "11-items");

  // --- D. the settings carried over ---------------------------------------------------------
  console.log("# D. the cut-over");
  const D = await f.evaluate(id => {
    const store = game.settings.storage.get("world");
    const old = k => store.getSetting(k)?.value;
    const pairs = [
      ["fvtt-mod-scrollcase.showKeeps", "showKeeps"],
      ["fvtt-mod-scrollcase.handoutsJournal", "handoutsJournal"],
      ["fvtt-mod-houserules.sidebarTabs", "sidebarTabs"],
      ["fvtt-mod-houserules.gmSidebarTabs", "gmSidebarTabs"]
    ];
    const out = pairs.map(([from, to]) => ({ from, was: old(from), now: game.settings.get(id, to) }));
    const memKey = `fvtt-mod-scrollcase.${game.world.id}.${game.user.id}`;
    return {
      out,
      recent: game.modules.get(id).api.journal.memory.load().recent.length,
      oldRecent: (() => {
        try {
          return JSON.parse(localStorage.getItem(memKey) ?? "{}").recent?.length ?? 0;
        } catch {
          return 0;
        }
      })(),
      houseRulesHasTabs: game.settings.settings.has("fvtt-mod-houserules.sidebarTabs"),
      combatButton: !!document.querySelector('#sidebar-tabs [data-tab="combat"]'),
      scenesButton: !!document.querySelector('#sidebar-tabs [data-tab="scenes"]')
    };
  }, MODULE_ID);
  for (const p of D.out) assert(p.was === undefined || p.was === p.now, `${p.from} carried over (${JSON.stringify(p.was)} → ${JSON.stringify(p.now)})`);
  assert(D.recent >= D.oldRecent, `the journal case read Scroll Case's shown history in this browser (${D.recent}, Scroll Case ${D.oldRecent})`);
  assert(!D.combatButton && D.scenesButton, `the GM's sidebar: no Combat, Scenes kept (${D.houseRulesHasTabs ? "House Rules still hiding, Card Catalogue stepping aside" : "Card Catalogue hiding"})`);

  // --- E. a player's actors case ------------------------------------------------------------
  console.log("# E. a player's actors case");
  const temp = await f.evaluate(async ({ userName }) => {
    const user = game.users.find(u => u.name === userName) ?? (await User.implementation.create({ name: userName, role: CONST.USER_ROLES.PLAYER }));
    const pc = game.actors.find(a => a.type === "character");
    await pc.update({ [`ownership.${user.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
    // A summoned creature they own too (dnd5e's own copy): never a card of theirs.
    const summon = game.actors.find(a => a.flags?.dnd5e?.isAutoImported || a.flags?.dnd5e?.summonedCopy);
    if (summon) await summon.update({ [`ownership.${user.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
    const isSummon = a => !!(a.flags?.dnd5e?.isAutoImported || a.flags?.dnd5e?.summonedCopy);
    const visible = game.actors.filter(a => a.testUserPermission(user, "LIMITED") && !isSummon(a)).length;
    return { userId: user.id, pcId: pc.id, pcName: pc.name, summonId: summon?.id ?? null, summonUuid: summon?.uuid ?? null, summonName: summon?.name ?? null, visible };
  }, { userName: TEMP_USER });
  fp = new Foundry({ ...foundryConfig(env), user: TEMP_USER, password: "" });
  await fp.connect();
  watch(fp, "player");
  await fp.page.setViewportSize?.({ width: 1600, height: 1000 }).catch(() => {});
  const E = await fp.evaluate(async () => {
    const wait = async (fn, n = 60) => {
      for (let i = 0; i < n; i++) {
        const v = fn();
        if (v) return v;
        await new Promise(r => setTimeout(r, 100));
      }
      return null;
    };
    document.querySelector('#sidebar-tabs [data-tab="actors"]')?.click();
    const win = await wait(() => foundry.applications.instances.get("cardcatalogue-actors-library")?.rendered && foundry.applications.instances.get("cardcatalogue-actors-library"));
    const el = win?.element;
    const cards = el?.querySelectorAll(".cc-card[data-key]").length ?? 0;
    const strip = [...(el?.querySelectorAll(".cc-case") ?? [])].map(b => b.dataset.case);
    el?.querySelector('.cc-rail [data-view="mine"]')?.click();
    await wait(() => win.view === "mine" && el.querySelector(".cc-card[data-key]"));
    const mine = [...el.querySelectorAll(".cc-card[data-key]")].map(c => ({ name: c.querySelector(".cc-nm span")?.textContent, owned: !!fromUuidSync(c.dataset.key)?.isOwner }));
    const chevron = !!el.querySelector('.cc-card [data-action="openMenu"]');
    el.querySelector('.cc-rail [data-view="all"]')?.click();
    await wait(() => win.view === "all");
    await new Promise(r => setTimeout(r, 300));
    const drawn = [...el.querySelectorAll(".cc-card[data-key]")].map(c => c.dataset.key);
    return { opened: !!win, cards, strip, mine, chevron, drawn, itemsTab: !!document.querySelector('#sidebar-tabs [data-tab="items"]') };
  });
  assert(E.opened, "the player's Actors button opens their actors case");
  assert(E.cards === temp.visible, `the player sees the actors they can see (${E.cards} of ${temp.visible})`);
  assert(E.mine.some(m => m.name === temp.pcName) && E.mine.every(m => m.owned), `Mine holds their character and only what they own (${E.mine.map(m => m.name).join(", ")})`);
  assert(!E.chevron, "no chevron for a player");
  assert(!temp.summonUuid || !E.drawn.includes(temp.summonUuid), `a summoned creature they own is no card of theirs (${temp.summonName ?? "none in this world"})`);
  assert(!E.strip.includes("scenes") && !E.strip.includes("items") && !E.itemsTab, `the player's strip has no Scenes or Items, and no Items tab (${E.strip.join(", ")})`);
  await shot(fp.page, "12-player-actors");
  await f.evaluate(async ({ pcId, summonId, userId }) => {
    for (const id of [pcId, summonId]) if (id) await game.actors.get(id)?.update({ [`ownership.-=${userId}`]: null });
  }, temp);

  const errors = lines.filter(l => /error|pageerror/.test(l) && /cardcatalogue|card catalogue/i.test(l));
  assert(!errors.length, `no Card Catalogue error on either page${errors.length ? `:\n    ${errors.join("\n    ")}` : ""}`);
} catch (err) {
  console.log(`  FAIL  the run threw: ${err?.stack ?? err}`);
  fails++;
} finally {
  await cleanup();
}

if (lines.length) console.log(`\n# the console\n${lines.slice(0, 30).join("\n")}`);
console.log(fails ? `\nRED: ${fails} failed` : "\nGREEN");
process.exit(fails ? 1 : 0);
