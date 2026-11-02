import {
  activateAs,
  collapseTree,
  fileName,
  folderTree,
  inView,
  matchWhy,
  remember,
  sceneEntry,
  searchFields,
  UNDO_FOR,
  undoCheck
} from "../scripts/scenes/decide.js";

describe("the search", () => {
  const fields = searchFields({
    name: "Deep Caves (C)",
    navName: "The Under-Dark",
    folder: "Blight › Caves",
    notes: "Map Keys › Cave C",
    playlist: "Dripping Dark",
    file: "worlds/halruaa/assets/maps/cave-c.webp"
  });

  it("matches the name first and says nothing for it", () => {
    expect(matchWhy(fields, "caves")).toBe("");
    expect(matchWhy(fields, "")).toBe("");
  });

  it("says where else a word matched", () => {
    expect(matchWhy(fields, "under")).toBe("navName");
    expect(matchWhy(fields, "dripping")).toBe("playlist");
    expect(matchWhy(fields, "keys")).toBe("notes");
    expect(matchWhy(fields, "cave-c.webp")).toBe("file");
  });

  it("needs every word somewhere", () => {
    expect(matchWhy(fields, "caves dripping")).toBe("playlist");
    expect(matchWhy(fields, "caves forest")).toBeNull();
  });

  it("is not fooled by case or missing fields", () => {
    expect(matchWhy(searchFields({ name: "Town Hall" }), "HALL")).toBe("");
    expect(matchWhy(searchFields({ name: "Town Hall" }), "notes")).toBeNull();
  });
});

describe("the views", () => {
  const card = (over = {}) => ({ active: false, viewed: false, nav: false, folders: [], ...over });

  it("All holds everything", () => {
    expect(inView(card(), "all")).toBe(true);
  });

  it("Active and viewed holds the active scene and the one this client looks at", () => {
    expect(inView(card({ active: true }), "here")).toBe(true);
    expect(inView(card({ viewed: true }), "here")).toBe(true);
    expect(inView(card(), "here")).toBe(false);
  });

  it("a folder holds its subfolders' scenes; f: holds the loose ones", () => {
    const deep = card({ folders: ["caves", "blight"] });
    expect(inView(deep, "f:blight")).toBe(true);
    expect(inView(deep, "f:caves")).toBe(true);
    expect(inView(deep, "f:town")).toBe(false);
    expect(inView(deep, "f:")).toBe(false);
    expect(inView(card(), "f:")).toBe(true);
  });

  it("an unknown view holds nothing", () => {
    expect(inView(card(), "pinned")).toBe(false);
  });
});

describe("a collapsed tree", () => {
  const tree = [
    { id: "a", depth: 0 },
    { id: "a1", depth: 1 },
    { id: "a1x", depth: 2 },
    { id: "a2", depth: 1 },
    { id: "b", depth: 0 }
  ];
  const ids = out => out.map(f => f.id);

  it("marks the folders with folders under them, all open", () => {
    const out = collapseTree(tree, new Set());
    expect(ids(out)).toEqual(["a", "a1", "a1x", "a2", "b"]);
    expect(out.map(f => f.kids)).toEqual([true, true, false, false, false]);
    expect(out.some(f => f.closed)).toBe(false);
  });

  it("leaves out everything under a closed folder, and only that", () => {
    expect(ids(collapseTree(tree, new Set(["a1"])))).toEqual(["a", "a1", "a2", "b"]);
    expect(ids(collapseTree(tree, new Set(["a"])))).toEqual(["a", "b"]);
  });

  it("a folder with nothing under it is never closed", () => {
    const out = collapseTree(tree, new Set(["b"]));
    expect(ids(out)).toEqual(["a", "a1", "a1x", "a2", "b"]);
    expect(out.find(f => f.id === "b").closed).toBe(false);
  });
});

describe("the folder tree", () => {
  const folders = [
    { id: "b", name: "Blight", parent: null, sort: 200 },
    { id: "c", name: "Caves", parent: "b", sort: 0 },
    { id: "t", name: "Town", parent: null, sort: 100 },
    { id: "e", name: "Empty", parent: null, sort: 0 }
  ];
  const cards = [
    { folders: ["c", "b"] },
    { folders: ["c", "b"] },
    { folders: ["b"] },
    { folders: ["t"] },
    { folders: [] }
  ];

  it("flattens in the directory's order with depths and counts under each", () => {
    expect(folderTree(folders, cards)).toEqual([
      { id: "t", name: "Town", depth: 0, n: 1 },
      { id: "b", name: "Blight", depth: 0, n: 3 },
      { id: "c", name: "Caves", depth: 1, n: 2 }
    ]);
  });

  it("orders by name where Foundry's directory sorts by name, at the top and inside a folder", () => {
    expect(folderTree(folders, cards, undefined, { rootSorting: "a" }).map(f => f.id)).toEqual([
      "b",
      "c",
      "t"
    ]);
    const manual = [
      { id: "p", name: "Pear", parent: null, sort: 1, sorting: "a" },
      { id: "z", name: "Zed", parent: "p", sort: 1 },
      { id: "y", name: "Yew", parent: "p", sort: 2 }
    ];
    const inside = [{ folders: ["z", "p"] }, { folders: ["y", "p"] }];
    expect(folderTree(manual, inside).map(f => f.id)).toEqual(["p", "y", "z"]);
  });

  it("leaves out a folder with no scene", () => {
    expect(folderTree(folders, cards).some(f => f.id === "e")).toBe(false);
  });

  it("keeps it, at its place, when asked (the GM's rail)", () => {
    expect(folderTree(folders, cards, undefined, { keepEmpty: true })).toEqual([
      { id: "e", name: "Empty", depth: 0, n: 0 },
      { id: "t", name: "Town", depth: 0, n: 1 },
      { id: "b", name: "Blight", depth: 0, n: 3 },
      { id: "c", name: "Caves", depth: 1, n: 2 }
    ]);
  });

  it("orders by name when the sorts tie", () => {
    const tied = [
      { id: "z", name: "Zed", parent: null },
      { id: "a", name: "Alpha", parent: null }
    ];
    expect(folderTree(tied, [{ folders: ["z"] }, { folders: ["a"] }]).map(f => f.id)).toEqual([
      "a",
      "z"
    ]);
  });
});

describe("a card's lines", () => {
  it("names the button", () => {
    expect(activateAs({ active: false })).toBe("activate");
    expect(activateAs({ active: true })).toBe("pull");
  });

  it("takes a file's name", () => {
    expect(fileName("worlds/w/assets/maps/cave.webp")).toBe("cave.webp");
    expect(fileName(null)).toBe("");
  });
});

describe("Undo's check", () => {
  const record = { sceneId: "new", previousId: "old", at: 1000 };
  const world = (over = {}) => ({ activeId: "new", exists: () => true, now: 2000, ...over });

  it("allows going back while nothing has moved", () => {
    expect(undoCheck(record, world())).toBe("ok");
  });

  it("refuses with nothing to go back to", () => {
    expect(undoCheck(null, world())).toBe("none");
    expect(undoCheck({ ...record, previousId: null }, world())).toBe("none");
  });

  it("refuses once another scene is active", () => {
    expect(undoCheck(record, world({ activeId: "other" }))).toBe("changed");
    expect(undoCheck(record, world({ activeId: null }))).toBe("changed");
  });

  it("refuses when the old scene is gone", () => {
    expect(undoCheck(record, world({ exists: () => false }))).toBe("gone");
  });

  it("expires", () => {
    expect(undoCheck(record, world({ now: 1000 + UNDO_FOR + 1 }))).toBe("expired");
  });
});

describe("the record's recent list", () => {
  it("puts the newest first, once, and keeps a few", () => {
    let list = [];
    for (const key of ["a", "b", "a", "c"]) list = remember(list, { key });
    expect(list.map(r => r.key)).toEqual(["c", "a", "b"]);
    expect(remember(list, { key: "d" }, 2).map(r => r.key)).toEqual(["d", "c"]);
  });
});

describe("the export", () => {
  it("names the scene, its place, its state, its background, notes and playlist", () => {
    const entry = sceneEntry({
      key: "Scene.s1",
      name: "Farmhouse",
      navName: "",
      folder: "02 › Village",
      active: true,
      nav: false,
      background: "maps/farm.webp",
      notes: "Map Keys › Farm",
      playlist: ""
    });
    expect(entry).toEqual({
      name: "Farmhouse",
      uuid: "Scene.s1",
      navName: null,
      folder: "02 › Village",
      active: true,
      navigation: false,
      background: "maps/farm.webp",
      notes: "Map Keys › Farm",
      playlist: null
    });
  });
});
