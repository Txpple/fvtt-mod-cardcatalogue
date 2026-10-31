import {
  byType,
  crLabel,
  isSummonCopy,
  inView,
  matchWhy,
  remember,
  searchFields,
  typeCounts
} from "../scripts/docs/decide.js";

const ORDER = ["name", "kind", "details", "owners", "folder", "text"];

describe("the search over a case's own fields", () => {
  const fields = searchFields(
    {
      name: "Kartor Bloodaxe",
      kind: "Character",
      details: "Fighter Dwarf Level 3",
      owners: "Drew",
      folder: "Party",
      text: "A smith from the hills"
    },
    ORDER
  );

  it("matches the name and says nothing for it", () => {
    expect(matchWhy(fields, "kartor", ORDER)).toBe("");
    expect(matchWhy(fields, "", ORDER)).toBe("");
  });

  it("says the first other field a word matched", () => {
    expect(matchWhy(fields, "dwarf", ORDER)).toBe("details");
    expect(matchWhy(fields, "drew", ORDER)).toBe("owners");
    expect(matchWhy(fields, "smith", ORDER)).toBe("text");
  });

  it("needs every word somewhere", () => {
    expect(matchWhy(fields, "kartor smith", ORDER)).toBe("text");
    expect(matchWhy(fields, "kartor elf", ORDER)).toBeNull();
  });

  it("reads a field the card lacks as empty", () => {
    expect(searchFields({ name: "X" }, ORDER).text).toBe("");
  });
});

describe("the views", () => {
  const card = (over = {}) => ({ type: "npc", folders: [], ...over });

  it("All, a type, Mine, On this scene", () => {
    expect(inView(card(), "all")).toBe(true);
    expect(inView(card(), "t:npc")).toBe(true);
    expect(inView(card(), "t:character")).toBe(false);
    expect(inView(card({ mine: true }), "mine")).toBe(true);
    expect(inView(card(), "mine")).toBe(false);
    expect(inView(card({ here: true }), "here")).toBe(true);
  });

  it("a folder holds its subfolders'; f: the loose ones", () => {
    expect(inView(card({ folders: ["a", "b"] }), "f:b")).toBe(true);
    expect(inView(card({ folders: ["a"] }), "f:")).toBe(false);
    expect(inView(card(), "f:")).toBe(true);
  });
});

describe("the types on the rail", () => {
  it("in the case's order, then the rest as met", () => {
    const cards = [
      { type: "npc" },
      { type: "vehicle" },
      { type: "character" },
      { type: "npc" },
      { type: "custom" }
    ];
    expect(typeCounts(cards, ["character", "npc", "vehicle"])).toEqual([
      { type: "character", n: 1 },
      { type: "npc", n: 2 },
      { type: "vehicle", n: 1 },
      { type: "custom", n: 1 }
    ]);
  });
});

describe("a summoned creature", () => {
  it("is dnd5e's own copy, by either of its marks", () => {
    expect(isSummonCopy({ flags: { dnd5e: { isAutoImported: true } } })).toBe(true);
    expect(isSummonCopy({ flags: { dnd5e: { summonedCopy: true } } })).toBe(true);
  });

  it("never a creature the table made", () => {
    expect(isSummonCopy({ flags: { dnd5e: {} } })).toBe(false);
    expect(isSummonCopy({})).toBe(false);
    expect(isSummonCopy(null)).toBe(false);
  });
});

describe("the order by type", () => {
  const byName = (a, b) => a.localeCompare(b);
  const sorted = cards =>
    cards
      .slice()
      .sort(byType(["character", "npc", "group"], byName))
      .map(c => c.name);

  it("puts the case's types in its order, each by name", () => {
    const cards = [
      { type: "group", name: "Party" },
      { type: "npc", name: "Owl" },
      { type: "character", name: "Tychon" },
      { type: "character", name: "Cecil" }
    ];
    expect(sorted(cards)).toEqual(["Cecil", "Tychon", "Owl", "Party"]);
  });

  it("puts a type it does not list last, by the type's name", () => {
    const cards = [
      { type: "zeppelin", name: "A" },
      { type: "custom", name: "B" },
      { type: "npc", name: "C" }
    ];
    expect(sorted(cards)).toEqual(["C", "B", "A"]);
  });
});

describe("a challenge rating's words", () => {
  it("speaks fractions as the book does", () => {
    expect(crLabel(0.125)).toBe("1/8");
    expect(crLabel(0.25)).toBe("1/4");
    expect(crLabel(0.5)).toBe("1/2");
    expect(crLabel(5)).toBe("5");
    expect(crLabel(0)).toBe("0");
    expect(crLabel(null)).toBe("");
    expect(crLabel("")).toBe("");
  });
});

describe("the recent list", () => {
  it("newest first, once each", () => {
    let list = [];
    for (const key of ["a", "b", "a"]) list = remember(list, { key });
    expect(list.map(r => r.key)).toEqual(["a", "b"]);
  });
});
