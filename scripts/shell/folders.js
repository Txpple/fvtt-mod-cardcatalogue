/**
 * A new folder for a case's directory, as the stock directory's Create Folder makes one: its name
 * asked in Foundry's own small dialog, inside the folder the GM is looking at when Foundry's depth
 * allows it, else at the top. The cards are then filed by dropping them on its row in the rail.
 */

import { t } from "../common.js";

const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");

/** A name, asked in a small dialog; null when cancelled or blank. */
async function askName(title) {
  try {
    const name = await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: `<div class="form-group"><label>${esc(t("folders.name"))}</label><input type="text" name="name" autofocus></div>`,
      ok: { label: t("folders.create"), callback: (_event, button) => button.form.elements.name.value.trim() },
      rejectClose: false
    });
    return name || null;
  } catch {
    return null;
  }
}

/** Make a folder of `type` (the directory's document name), under `parentId` when it can hold one. */
export async function newFolder(type, parentId = null) {
  if (!game.user.isGM) return null;
  const parent = parentId ? game.folders.get(parentId) : null;
  const inside = parent?.type === type && (parent.depth ?? 1) < CONST.FOLDER_MAX_DEPTH ? parent : null;
  const name = await askName(inside ? t("folders.newIn", { folder: inside.name }) : t("folders.new"));
  if (!name) return null;
  return Folder.implementation.create({ name, type, folder: inside?.id ?? null, sorting: "a" });
}
