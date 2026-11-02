import { describe, expect, it } from "vitest";
import { dragged, nestAs, pickWith } from "../scripts/shell/pick.js";

const order = ["a", "b", "c", "d", "e"];

describe("picking cards", () => {
  it("a plain click picks the one card and anchors there", () => {
    const r = pickWith({ picked: ["a", "b"], anchor: "a", key: "c", order });
    expect([...r.picked]).toEqual(["c"]);
    expect(r.anchor).toBe("c");
  });

  it("Ctrl adds a card, or takes it out", () => {
    expect([
      ...pickWith({ picked: ["a"], anchor: "a", key: "c", order, ctrl: true }).picked
    ]).toEqual(["a", "c"]);
    expect([
      ...pickWith({ picked: ["a", "c"], anchor: "a", key: "c", order, ctrl: true }).picked
    ]).toEqual(["a"]);
  });

  it("Shift picks the run from the anchor, either way", () => {
    expect([
      ...pickWith({ picked: ["b"], anchor: "b", key: "d", order, shift: true }).picked
    ]).toEqual(["b", "c", "d"]);
    expect([
      ...pickWith({ picked: ["d"], anchor: "d", key: "b", order, shift: true }).picked
    ]).toEqual(["b", "c", "d"]);
    expect(pickWith({ picked: ["b"], anchor: "b", key: "d", order, shift: true }).anchor).toBe("b");
  });

  it("Ctrl+Shift adds the run to what was picked", () => {
    expect(
      [
        ...pickWith({ picked: ["a", "c"], anchor: "c", key: "e", order, shift: true, ctrl: true })
          .picked
      ].sort()
    ).toEqual(["a", "c", "d", "e"]);
  });

  it("Shift with no anchor in view is a plain click", () => {
    expect([...pickWith({ picked: [], anchor: "z", key: "b", order, shift: true }).picked]).toEqual(
      ["b"]
    );
  });

  it("a drag carries every picked card when the dragged one is picked", () => {
    expect(dragged(new Set(["a", "b"]), "b")).toEqual(["a", "b"]);
    expect(dragged(new Set(["a", "b"]), "c")).toEqual(["c"]);
    expect(dragged(new Set(["a"]), "a")).toEqual(["a"]);
  });
});

describe("dropping a folder in the rail", () => {
  // top ─ x ─ y ─ z (depth 3), and w at the top.
  const folders = new Map([
    ["x", { parent: null }],
    ["y", { parent: "x" }],
    ["z", { parent: "y" }],
    ["w", { parent: null }]
  ]);

  it("into a folder, or to the top", () => {
    expect(nestAs("w", "x", folders, 4)).toBe("ok");
    expect(nestAs("y", null, folders, 3)).toBe("ok");
  });

  it("never where it already is", () => {
    expect(nestAs("y", "x", folders, 3)).toBe("same");
    expect(nestAs("w", null, folders, 3)).toBe("same");
  });

  it("never into itself or a folder under it", () => {
    expect(nestAs("x", "x", folders, 3)).toBe("inside");
    expect(nestAs("x", "z", folders, 3)).toBe("inside");
  });

  it("never past Foundry's depth, counting the folders under it", () => {
    expect(nestAs("w", "z", folders, 3)).toBe("deep");
    expect(nestAs("y", "w", folders, 3)).toBe("ok");
    expect(nestAs("x", "w", folders, 3)).toBe("deep");
  });
});
