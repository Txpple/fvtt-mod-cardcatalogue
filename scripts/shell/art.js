/**
 * A picture shown to everyone online from a case that is not the journal (an actor's art, an
 * item's): through the journal case's Show, so it opens in the same Reader on the players' screens,
 * when the journal case is on; else as Foundry's own image share. Nothing is written.
 */

import * as show from "../journal/show.js";
import { hasCase } from "./cases.js";

export async function showArt(src, name) {
  if (!src) return false;
  if (hasCase("journal")) {
    await show.showFile(src, { keep: false, name });
    return true;
  }
  const ImagePopout = foundry.applications?.apps?.ImagePopout;
  if (!ImagePopout) return false;
  const popout = new ImagePopout({ src, window: { title: name } });
  await popout.render({ force: true });
  await popout.shareImage?.();
  return true;
}
