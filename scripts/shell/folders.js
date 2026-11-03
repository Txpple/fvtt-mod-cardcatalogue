/**
 * A case's folders, for the GM, as the stock directory makes and removes them. Create: the name asked
 * in Foundry's own small dialog, inside the folder in view when Foundry's depth allows it, else at the
 * top; cards are then filed by dropping them on its row in the rail. A right-click on a folder's row:
 * Rename (the name asked again, the folder's own `name` written, as the stock folder sheet writes it),
 * the stock Configure Ownership (Foundry's folder dialog, which writes each document directly in the
 * folder; its hint in the case's words, `ownership.js`) and the stock Remove Folder, its own words and
 * its own write, the folder deleted and whatever was in it (cards and subfolders) moved up to its
 * parent.
 */

import { t } from "../common.js";
import { centreNext } from "./host.js";
import { configureOwnership } from "./ownership.js";
import { nestAs } from "./pick.js";

/** The folders whose stock directory leaves Configure Ownership out of their menu. */
const NO_OWNERSHIP = new Set(["Scene", "Compendium"]);

const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");

/** A name, asked in a small dialog (`value` filled in, the button `ok`); null when cancelled or blank. */
async function askName(title, { value = "", ok = t("folders.create") } = {}) {
  try {
    const name = await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: `<div class="form-group"><label>${esc(t("folders.name"))}</label><input type="text" name="name" value="${esc(value)}" autofocus></div>`,
      ok: { label: ok, callback: (_event, button) => button.form.elements.name.value.trim() },
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

/** A folder named again; nothing written when the name is unchanged or the dialog cancelled. */
export async function renameFolder(folder) {
  if (!game.user.isGM || !folder) return null;
  const name = await askName(t("folders.renameTitle", { folder: folder.name }), { value: folder.name, ok: t("folders.rename") });
  if (!name || name === folder.name) return null;
  return folder.update({ name });
}

/**
 * The right-click menu on a folder's row in a case's rail (the GM's): Rename Folder, Configure Ownership (where the
 * stock directory offers it) and Remove Folder. Bound once on the window's element; Foundry's menu finds the row under
 * the click, so every redraw is covered.
 */
export function folderMenu(element) {
  if (!game.user.isGM) return;
  const Menu = foundry.applications.ux.ContextMenu.implementation ?? foundry.applications.ux.ContextMenu;
  new Menu(
    element,
    '.cc-folderrow[data-folder]:not([data-folder=""])',
    [
      {
        label: t("folders.rename"),
        icon: "fa-solid fa-pen",
        onClick: (_event, row) => renameFolder(game.folders.get(row.dataset.folder))
      },
      {
        label: "OWNERSHIP.Configure",
        icon: "fa-solid fa-user-lock",
        visible: row => {
          const folder = game.folders.get(row.dataset.folder);
          return !!folder && !NO_OWNERSHIP.has(folder.type);
        },
        onClick: (_event, row) => {
          const folder = game.folders.get(row.dataset.folder);
          if (!folder) return;
          centreNext();
          return configureOwnership(folder);
        }
      },
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

/** The folder being dragged in a rail, one at a time. */
let draggingFolder = null;

/**
 * A rail's folders dragged onto one another, for the GM (the user: "drag and drop folders in the
 * rail"): a folder dropped on another goes inside it, on Unfiled to the top, as the stock directory's
 * own drop writes it (the folder's `folder`). Never into itself or a folder under it, never past
 * Foundry's depth (`nestAs`). Wired on every draw; the cards' own drops on the same rows ignore it.
 */
export function wireFolderDrag(root, type) {
  if (!game.user.isGM) return;
  const tree = () => new Map(game.folders.filter(f => f.type === type).map(f => [f.id, { parent: f.folder?.id ?? null }]));
  const verdict = row => (draggingFolder ? nestAs(draggingFolder, row.dataset.folder || null, tree(), CONST.FOLDER_MAX_DEPTH) : null);
  for (const row of root.querySelectorAll(".cc-folderrow[data-folder]")) {
    const id = row.dataset.folder;
    if (id) {
      row.draggable = true;
      row.addEventListener("dragstart", ev => {
        ev.stopPropagation();
        draggingFolder = id;
        row.classList.add("dragging");
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Folder", uuid: game.folders.get(id)?.uuid }));
      });
      row.addEventListener("dragend", () => {
        draggingFolder = null;
        row.classList.remove("dragging");
        for (const el of root.querySelectorAll(".drop-ok")) el.classList.remove("drop-ok");
      });
    }
    row.addEventListener("dragover", ev => {
      if (verdict(row) !== "ok") return;
      ev.preventDefault();
      ev.stopPropagation();
      row.classList.add("drop-ok");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drop-ok"));
    row.addEventListener("drop", ev => {
      const why = verdict(row);
      if (!why) return;
      ev.preventDefault();
      ev.stopPropagation();
      row.classList.remove("drop-ok");
      const folder = game.folders.get(draggingFolder);
      draggingFolder = null;
      if (why === "deep") return void ui.notifications.warn(t("folders.tooDeep", { n: CONST.FOLDER_MAX_DEPTH }));
      if (why !== "ok" || !folder) return;
      const into = row.dataset.folder || null;
      void folder.update({ folder: into }).catch(err => {
        ui.notifications.error(err?.message ?? String(err));
      });
    });
  }
}
