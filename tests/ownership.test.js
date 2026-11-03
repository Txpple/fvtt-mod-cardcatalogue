import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { askedFor, ownershipHint, sayHint } from "../scripts/shell/ownership.js";

const strings = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"))[
  "fvtt-mod-cardcatalogue"
];
const string = key => key.split(".").reduce((at, part) => at?.[part], strings);

/** A dialog's element as far as `sayHint` reads it: the one paragraph, or none. */
const dialog = hint => ({ querySelector: sel => (sel === "p.instructions" ? hint : null) });

describe("the ownership dialog's hint, opened from a case", () => {
  it("an actor's or an item's says what each level shows a player", () => {
    expect(ownershipHint("Actor", "npc")).toBe("actors.menu.ownershipDialog");
    expect(ownershipHint("Actor", "character")).toBe("actors.menu.ownershipDialog");
    expect(ownershipHint("Item", "weapon")).toBe("items.menu.ownershipDialog");
  });

  it("a folder's names the cards its change reaches, by what the folder holds", () => {
    expect(ownershipHint("Folder", "Actor")).toBe("folders.ownership.actors");
    expect(ownershipHint("Folder", "Item")).toBe("folders.ownership.items");
  });

  it("anything else keeps Foundry's own", () => {
    expect(ownershipHint("Folder", "Scene")).toBeNull();
    expect(ownershipHint("Folder", "JournalEntry")).toBeNull();
    expect(ownershipHint("Folder")).toBeNull();
    expect(ownershipHint("Scene")).toBeNull();
    expect(ownershipHint("JournalEntry")).toBeNull();
    expect(ownershipHint("toString")).toBeNull();
    expect(ownershipHint(undefined)).toBeNull();
  });

  it("every hint is a string of the module's, naming what it configures", () => {
    for (const [name, type] of [["Actor"], ["Item"], ["Folder", "Actor"], ["Folder", "Item"]]) {
      const text = string(ownershipHint(name, type));
      expect(typeof text).toBe("string");
      expect(text).toContain("{name}");
      expect(text).not.toMatch(/Document/);
    }
  });
});

describe("which dialog a card's right-click asked for", () => {
  const asked = { uuid: "Actor.abc", until: 1000 };

  it("the same document, within the moment", () => {
    expect(askedFor(asked, "Actor.abc", 1000)).toBe(true);
    expect(askedFor(asked, "Actor.abc", 400)).toBe(true);
  });

  it("never another document, nothing asked, or after the moment", () => {
    expect(askedFor(asked, "Actor.xyz", 500)).toBe(false);
    expect(askedFor(asked, undefined, 500)).toBe(false);
    expect(askedFor(null, "Actor.abc", 500)).toBe(false);
    expect(askedFor(asked, "Actor.abc", 1001)).toBe(false);
  });
});

describe("saying the hint", () => {
  it("replaces it where Foundry draws it", () => {
    const hint = { textContent: "Configure access to this specific Document." };
    expect(sayHint(dialog(hint), "Each player's access to Cecil.")).toBe(true);
    expect(hint.textContent).toBe("Each player's access to Cecil.");
  });

  it("leaves a dialog with no hint there as it is", () => {
    expect(sayHint(dialog(null), "x")).toBe(false);
    expect(sayHint(null, "x")).toBe(false);
    expect(sayHint(undefined, "x")).toBe(false);
  });
});
