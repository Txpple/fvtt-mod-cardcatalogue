/**
 * A case's folders, for the GM, as the stock directory makes and removes them. Create: the name asked
 * in Foundry's own small dialog, inside the folder in view when Foundry's depth allows it, else at the
 * top; cards are then filed by dropping them on its row in the rail. Remove (a right-click on a
 * folder's row): the stock Remove Folder, its own words and its own write, the folder deleted and
 * whatever was in it (cards and subfolders) moved up to its parent.
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

/**
 * The right-click menu on a folder's row in a case's rail (the GM's): Remove Folder. Bound once on the
 * window's element; Foundry's menu finds the row under the click, so every redraw is covered.
 */
export function folderMenu(element) {
  if (!game.user.isGM) return;
  const Menu = foundry.applications.ux.ContextMenu.implementation ?? foundry.applications.ux.ContextMenu;
  new Menu(
    element,
    '.cc-folderrow[data-folder]:not([data-folder=""])',
    [
      {
        label: "FOLDER.Remove",
        icon: "fa-solid fa-trash",
        onClick: (_event, row) => {
          const folder = game.folders.get(row.dataset.folder);
          if (!folder) return;
          return folder.deleteDialog({
            content: `<p><strong>${game.i18n.localize("COMMON.AreYouSure")}</strong> ${game.i18n.localize("FOLDER.RemoveWarning")}</p>`,
            window: { title: game.i18n.format("FOLDER.RemoveName", { name: folder.name }), icon: "fa-solid fa-trash" }
          });
        }
      }
    ],
    { jQuery: false, fixed: true }
  );
}
