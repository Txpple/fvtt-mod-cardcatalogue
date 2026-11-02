// The live check on a real world (the local sandbox): a GM page (the bridge user), every fact read
// from the world. Scroll Case's in shape.
//
//   FOUNDRY_HOST=local node tools/live-check.mjs                 # the takeover, the search, the rail; nothing written
//   FOUNDRY_HOST=local node tools/live-check.mjs --walk [--shots <dir>]
//
// With --walk, the GM page makes a scratch scene and a scratch folder, activates the scratch scene
// from its card and reads the active scene back, takes it back with Undo, puts it on and off the
// players' bar, files it in the folder, finds it with the finder and views it with Enter, and goes
// through Classic Mode and the directory's way back. The scratch scene and folder go, the scene
// that was active is active again, and the settings go back, in `finally`.
import { Foundry, foundryConfig, loadEnv } from "fvtt-mcp-dnd5e/client";

if (process.env.FOUNDRY_HOST !== "local") {
  console.error("The live check writes to the world it joins: run it on the sandbox only, with FOUNDRY_HOST=local.");
  process.exit(2);
}

const env = loadEnv();
const MODULE_ID = "fvtt-mod-cardcatalogue";
const SCRATCH = "ZZ-MPC Scratch";
const SCRATCH_FOLDER = "ZZ-MPC Folder";

const arg = n => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : null;
};
const walk = process.argv.includes("--walk");
const shots = arg("shots");

let fails = 0;
const assert = (cond, msg) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) fails++;
};

let cleanup = async () => {};
setTimeout(async () => {
  console.error("[scenes] WATCHDOG: 240s elapsed, cleaning up and aborting");
  await cleanup().catch(() => {});
  process.exit(3);
}, 240_000).unref();

const lines = [];
const f = new Foundry(foundryConfig(env));
console.log("[scenes] connecting as the GM…");
await f.connect();
f.page.on("console", msg => {
  const type = msg.type();
  if (type === "error" || type === "warning" || /map ?case/i.test(msg.text())) lines.push(`[gm ${type}] ${msg.text()}`);
});
f.page.on("pageerror", err => lines.push(`[gm pageerror] ${err?.message ?? err}`));
f.page.on("response", res => {
  if (res.status() >= 400) lines.push(`[gm http ${res.status()}] ${res.url()}`);
});
await f.page.setViewportSize?.({ width: 1600, height: 1000 }).catch(() => {});

const shot = async name => {
  if (!shots) return;
  await f.page.screenshot({ path: `${shots}/${name}.png` }).catch(err => console.log(`  shot ${name}: ${err?.message ?? err}`));
};

let prior = null;
cleanup = async () => {
  cleanup = async () => {};
  await f
    .evaluate(
      async ({ id, scratch, folder, prior }) => {
        if (prior?.activeId && !game.scenes.get(prior.activeId)?.active) await game.scenes.get(prior.activeId).activate();
        if (prior?.viewedId && canvas.scene?.id !== prior.viewedId) await game.scenes.get(prior.viewedId)?.view();
        for (const s of game.scenes.filter(s => s.name === scratch)) await s.delete();
        for (const fo of game.folders.filter(fo => fo.type === "Scene" && fo.name === folder)) await fo.delete();
        if (prior) await game.settings.set(id, "scenesClassic", prior.classic);
        for (const app of [...foundry.applications.instances.values()]) {
          if (["cardcatalogue-scenes-library", "cardcatalogue-scenes-finder"].includes(app.id)) await app.close();
        }
      },
      { id: MODULE_ID, scratch: SCRATCH, folder: SCRATCH_FOLDER, prior }
    )
    .catch(err => console.log(`  cleanup: ${err?.message ?? err}`));
  await f.disconnect?.().catch(() => {});
};

try {
  // --- A. the takeover ----------------------------------------------------------------------
  console.log("# A. the Scenes button opens the scenes case");
  prior = await f.evaluate(id => ({ classic: game.settings.get(id, "scenesClassic"), activeId: game.scenes.active?.id ?? null, viewedId: canvas.scene?.id ?? null }), MODULE_ID);
  const A = await f.evaluate(async id => {
    const wait = async (fn, n = 40) => {
      for (let i = 0; i < n; i++) {
        const v = fn();
        if (v) return v;
        await new Promise(r => setTimeout(r, 100));
      }
      return null;
    };
    await game.settings.set(id, "scenesClassic", false);
    for (const app of [...foundry.applications.instances.values()]) if (app.id === "cardcatalogue-scenes-library") await app.close();
    const before = { tab: ui.sidebar.tabGroups.primary, expanded: ui.sidebar.expanded };
    const button = document.querySelector('#sidebar-tabs [data-tab="scenes"]');
    button?.click();
    const win = await wait(() => foundry.applications.instances.get("cardcatalogue-scenes-library")?.rendered && foundry.applications.instances.get("cardcatalogue-scenes-library"));
    const after = { tab: ui.sidebar.tabGroups.primary, expanded: ui.sidebar.expanded };
    const el = win?.element;
    const cards = el ? el.querySelectorAll(".cc-card[data-key]").length : 0;
    const thumbs = el ? el.querySelectorAll(".cc-card .cc-thumb img").length : 0;
    const active = el?.querySelector(".cc-card.active .cc-nm span")?.textContent ?? null;
    // The card's one button is View (the user's ruling); on the scene this client is on, "You are here", greyed.
    const other = el?.querySelector(`.cc-card[data-key]:not([data-key="${canvas.scene?.uuid}"]) .cc-acts .go`);
    const here = canvas.scene ? el?.querySelector(`.cc-card[data-key="${canvas.scene.uuid}"] .cc-acts .go`) : null;
    const goLabel = { other: other?.textContent.trim() ?? null, otherAction: other?.dataset.action ?? null, here: here?.textContent.trim() ?? null, hereDisabled: here?.disabled ?? null };
    const ratio = (() => {
      const t = el?.querySelector(".cc-card .cc-thumb");
      if (!t) return 0;
      const r = t.getBoundingClientRect();
      return r.height ? r.width / r.height : 0;
    })();
    const probe = (() => {
      const p = document.createElement("div");
      p.className = "cardcatalogue-css-probe";
      document.body.append(p);
      const v = getComputedStyle(p).flexDirection;
      p.remove();
      return v;
    })();
    await win?.close();
    button?.dispatchEvent(new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }));
    const mid = await wait(() => foundry.applications.instances.get("cardcatalogue-scenes-library")?.rendered, 30);
    return {
      before,
      after,
      cards,
      thumbs,
      scenes: game.scenes.size,
      withThumb: game.scenes.filter(s => s.thumb).length,
      active,
      activeName: game.scenes.active?.name ?? null,
      goLabel,
      ratio,
      probe,
      mid: !!mid,
      api: typeof game.modules.get(id)?.api?.scenes?.open
    };
  }, MODULE_ID);
  assert(A.cards === A.scenes && A.cards > 0, `a card per scene (${A.cards} of ${A.scenes})`);
  assert(A.thumbs === A.withThumb, `a picture on every card whose scene has a thumbnail (${A.thumbs} of ${A.withThumb})`);
  assert(A.ratio > 2.9 && A.ratio < 3.1, `the cards are Foundry's 3:1 strip (${A.ratio.toFixed(2)})`);
  assert(!A.activeName || A.active === A.activeName, `the active scene wears the active edge (${A.active})`);
  assert(A.goLabel.otherAction === "look" && /View/.test(A.goLabel.other ?? ""), `a card's one button is View (${A.goLabel.other})`);
  assert(A.goLabel.here === null || (A.goLabel.hereDisabled && /here/.test(A.goLabel.here)), `on the scene this client is on, it says so and does nothing (${A.goLabel.here})`);
  assert(A.after.tab === "scenes" && A.after.expanded, "the Scenes tab is lit and open behind the window");
  assert(A.mid, "a middle click opens the scenes case too");
  assert(A.probe === "column", "the stylesheet is in the cascade");
  assert(A.api === "function", "module.api.open is there");
  await shot("01-window");

  // The active scene's chevron open: for the shots only.
  if (shots) {
    await f.evaluate(async () => {
      const win = foundry.applications.instances.get("cardcatalogue-scenes-library");
      const card = win.element.querySelector(".cc-card.active");
      card?.scrollIntoView({ block: "center" });
      card?.querySelector('[data-action="openMenu"]')?.click();
      for (let i = 0; i < 20 && !win.element.querySelector(".cc-opts"); i++) await new Promise(r => setTimeout(r, 100));
    });
    await shot("01c-menu");
    await f.evaluate(async () => {
      const win = foundry.applications.instances.get("cardcatalogue-scenes-library");
      win.element.querySelector('.cc-opts [data-action="closeMenu"]')?.click();
      for (let i = 0; i < 20 && win.element.querySelector(".cc-opts"); i++) await new Promise(r => setTimeout(r, 100));
    });
  }

  // --- B. the search and the rail -----------------------------------------------------------
  console.log("# B. the search and the rail");
  const B = await f.evaluate(async () => {
    const win = foundry.applications.instances.get("cardcatalogue-scenes-library");
    const el = win.element;
    const input = el.querySelector("input[name=search]");
    const type = q => {
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return [...el.querySelectorAll(".cc-card[data-key]")].filter(c => !c.hidden).map(c => c.querySelector(".cc-nm span").textContent);
    };
    const caves = type("deep caves");
    const expected = game.scenes.filter(s => /deep caves/i.test(s.name)).length;
    const none = type("zzqqxx");
    const empty = !el.querySelector(".cc-empty").hidden;
    type("");
    const rail = [...el.querySelectorAll(".cc-rail .cc-row")].map(r => ({ view: r.dataset.view, n: Number(r.querySelector("small")?.textContent) }));
    const views = rail.filter(r => r.view && !r.view.startsWith("f:")).map(r => r.view);
    const folders = rail.filter(r => r.view?.startsWith("f:")).length;
    const sceneFolders = game.folders.filter(fo => fo.type === "Scene" && fo.contents.length).length;
    return { caves: caves.length, expected, none: none.length, empty, views, folders, sceneFolders };
  });
  assert(B.caves === B.expected && B.caves > 0, `"deep caves" finds the caves (${B.caves} of ${B.expected})`);
  assert(B.none === 0 && B.empty, "a word in nothing leaves no card and says so");
  assert(B.views.join() === "all,here", `the rail's views are All and Active and viewed (${B.views.join(", ")})`);
  assert(B.folders >= B.sceneFolders, `the rail lists the scene folders (${B.folders}, ${B.sceneFolders} with scenes)`);

  if (walk) {
    // --- C. activate and undo -------------------------------------------------------------
    console.log("# C. Activate from the chevron, Undo from the strip");
    const C = await f.evaluate(
      async ({ scratch, folder }) => {
        const wait = async (fn, n = 60) => {
          for (let i = 0; i < n; i++) {
            const v = fn();
            if (v) return v;
            await new Promise(r => setTimeout(r, 100));
          }
          return null;
        };
        const was = game.scenes.active;
        const scene = await Scene.create({ name: scratch, navigation: false, width: 1400, height: 1000 });
        const fo = await Folder.create({ name: folder, type: "Scene" });
        const win = foundry.applications.instances.get("cardcatalogue-scenes-library");
        await wait(() => win.element.querySelector(`.cc-card[data-key="${scene.uuid}"]`));
        // Activate is the chevron's first row now.
        win.element.querySelector(`.cc-card[data-key="${scene.uuid}"] [data-action="openMenu"]`).click();
        const row = await wait(() => win.element.querySelector('.cc-opts [data-action="activate"]'));
        row?.click();
        const activated = !!(await wait(() => game.scenes.active?.id === scene.id));
        const strip = await wait(() => win.element.querySelector(".cc-reveal"));
        const stripText = strip?.textContent.replace(/\s+/g, " ").trim() ?? "";
        strip?.querySelector('[data-action="undo"]').click();
        const undone = !!(await wait(() => game.scenes.active?.id === was?.id));
        const stripGone = !!(await wait(() => !win.element.querySelector(".cc-reveal")));
        return { sceneId: scene.id, folderId: fo.id, uuid: scene.uuid, had: !!was, activated, stripText, undone, stripGone };
      },
      { scratch: SCRATCH, folder: SCRATCH_FOLDER }
    );
    assert(C.activated, "the chevron's Activate made the scratch scene active");
    assert(!C.had || /Back to/.test(C.stripText), `the strip offers the way back (${C.stripText})`);
    assert(!C.had || C.undone, "Undo made the scene that was active before active again");
    assert(C.stripGone, "the strip is gone after Undo");

    // --- D. the bar, the folder, the chevron ----------------------------------------------
    console.log("# D. the players' bar, a folder, the chevron");
    const D = await f.evaluate(
      async ({ uuid, folderId }) => {
        const wait = async (fn, n = 60) => {
          for (let i = 0; i < n; i++) {
            const v = fn();
            if (v) return v;
            await new Promise(r => setTimeout(r, 100));
          }
          return null;
        };
        const scene = fromUuidSync(uuid);
        const win = foundry.applications.instances.get("cardcatalogue-scenes-library");
        const card = () => win.element.querySelector(`.cc-card[data-key="${uuid}"]`);
        // On the bar from the chevron, then off again from it.
        card().querySelector('[data-action="openMenu"]').click();
        (await wait(() => win.element.querySelector('.cc-opts [data-action="toggleNav"]')))?.click();
        const on = !!(await wait(() => scene.navigation === true));
        await wait(() => !win.element.querySelector(".cc-opts"));
        await wait(() => card()?.querySelector(".fa-compass"));
        card().querySelector('[data-action="openMenu"]').click();
        const menu = await wait(() => win.element.querySelector(".cc-opts .cc-menu"));
        const actions = menu ? [...menu.querySelectorAll("button")].map(b => b.dataset.action) : [];
        menu?.querySelector('[data-action="toggleNav"]').click();
        const off = !!(await wait(() => scene.navigation === false));
        const menuClosed = !!(await wait(() => !win.element.querySelector(".cc-opts")));
        // A real drag: the card's dragstart, then dragover and drop on the folder's row.
        const drag = (card, row) => {
          const dt = new DataTransfer();
          card.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
          row.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
          row.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
          card.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }));
        };
        win.element.querySelector('.cc-rail [data-view="all"]')?.click();
        await wait(() => win.element.querySelector(`.cc-rail [data-folder="${folderId}"]`) && card());
        const emptyRow = !!win.element.querySelector(`.cc-rail [data-folder="${folderId}"]`);
        drag(card(), win.element.querySelector(`.cc-rail [data-folder="${folderId}"]`));
        const filed = !!(await wait(() => scene.folder?.id === folderId)) && emptyRow;
        const row = await wait(() => win.element.querySelector(`.cc-rail [data-view="f:${folderId}"]`));
        row?.click();
        await wait(() => win.element.querySelector(".cc-head h2")?.textContent === scene.folder?.name);
        const inFolder = [...win.element.querySelectorAll(".cc-card[data-key]")].map(c => c.dataset.key);
        return { on, off, actions, menuClosed, filed, row: !!row, inFolder: inFolder.length === 1 && inFolder[0] === uuid };
      },
      { uuid: C.uuid, folderId: C.folderId }
    );
    assert(D.on && D.off, "the chevron puts the scene on the bar and takes it off");
    assert(["activate", "edit", "preload", "toggleNav"].every(a => D.actions.includes(a)), `the chevron offers Activate, Edit, Preload, the bar (${D.actions.join(", ")})`);
    assert(D.menuClosed, "a chevron action closes the chevron");
    assert(D.filed && D.row && D.inFolder, "an empty folder is in the GM's rail; a card dragged onto it is filed there, and the folder holds only it");
    await shot("02-folder");

    // --- E. the finder ---------------------------------------------------------------------
    console.log("# E. the finder: Enter views, the players stay");
    const E = await f.evaluate(
      async ({ uuid, scratch }) => {
        const wait = async (fn, n = 80) => {
          for (let i = 0; i < n; i++) {
            const v = fn();
            if (v) return v;
            await new Promise(r => setTimeout(r, 100));
          }
          return null;
        };
        const scene = fromUuidSync(uuid);
        // Foundry refuses a View while the canvas is still loading (Undo just moved it): wait until it
        // has arrived on the active scene, not merely until it is idle (the draw may not have begun).
        // Undo moves the table back while this client's canvas may still be drawing the scratch scene, and
        // Foundry refuses this client's own move then: put the canvas on the active scene first, idle.
        const idle = async () => {
          let still = 0;
          for (let i = 0; i < 400 && still < 10; i++) {
            still = canvas.ready && !canvas.loading ? still + 1 : 0;
            await new Promise(r => setTimeout(r, 100));
          }
        };
        await idle();
        if (canvas.scene?.id !== game.scenes.active?.id) await game.scenes.active?.view();
        await wait(() => canvas.scene?.id === game.scenes.active?.id, 300);
        await idle();
        const activeBefore = game.scenes.active?.id ?? null;
        await game.modules.get("fvtt-mod-cardcatalogue").api.scenes.finder();
        const fin = await wait(() => foundry.applications.instances.get("cardcatalogue-scenes-finder")?.rendered && foundry.applications.instances.get("cardcatalogue-scenes-finder"));
        const input = fin.element.querySelector("input[name=find]");
        input.value = scratch.toLowerCase();
        input.dispatchEvent(new Event("input", { bubbles: true }));
        const top = fin.element.querySelector(".cc-res.on .cc-res-nm")?.textContent;
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        const viewed = !!(await wait(() => canvas.scene?.id === scene.id, 150));
        const closed = !foundry.applications.instances.get("cardcatalogue-scenes-finder")?.rendered;
        return { top, viewed, closed, activeSame: (game.scenes.active?.id ?? null) === activeBefore };
      },
      { uuid: C.uuid, scratch: SCRATCH }
    );
    assert(E.top === SCRATCH, `typing finds the scratch scene first (${E.top})`);
    assert(E.viewed && E.closed, "Enter viewed it and closed the finder");
    assert(E.activeSame, "the active scene did not change: only the DM moved");
    await shot("03-viewed");

    // --- F. Classic Mode ------------------------------------------------------------------
    console.log("# F. Classic Mode and the way back");
    const F = await f.evaluate(async id => {
      const wait = async (fn, n = 40) => {
        for (let i = 0; i < n; i++) {
          const v = fn();
          if (v) return v;
          await new Promise(r => setTimeout(r, 100));
        }
        return null;
      };
      const win = foundry.applications.instances.get("cardcatalogue-scenes-library");
      if (!win?.rendered) await game.modules.get(id).api.scenes.open();
      (await wait(() => foundry.applications.instances.get("cardcatalogue-scenes-library")?.element?.querySelector('[data-action="classic"]'))).click();
      const classic = !!(await wait(() => game.settings.get(id, "scenesClassic")));
      const tab = !!(await wait(() => ui.sidebar.tabGroups.primary === "scenes"));
      const back = await wait(() => document.querySelector("#cardcatalogue-back-scenes"));
      back?.click();
      const reopened = !!(await wait(() => foundry.applications.instances.get("cardcatalogue-scenes-library")?.rendered));
      return { classic, tab, back: !!back, reopened, off: !game.settings.get(id, "scenesClassic") };
    }, MODULE_ID);
    assert(F.classic && F.tab, "Classic Mode opens Foundry's own Scenes tab");
    assert(F.back && F.reopened && F.off, "the directory's the scenes case button brings the window back, Classic off");
  }

  const errors = lines.filter(l => /cardcatalogue|card catalogue/i.test(l) && /error|pageerror/.test(l));
  assert(!errors.length, `no the scenes case error in the console${errors.length ? `:\n    ${errors.join("\n    ")}` : ""}`);
} catch (err) {
  console.log(`  FAIL  the run threw: ${err?.stack ?? err}`);
  fails++;
} finally {
  await cleanup();
}

if (lines.length) console.log(`\n# the console\n${lines.slice(0, 40).join("\n")}`);
console.log(fails ? `\nRED: ${fails} failed` : "\nGREEN");
process.exit(fails ? 1 : 0);
