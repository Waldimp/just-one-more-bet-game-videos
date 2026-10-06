// Utilidades del teaser vertical. Reusa las del trailer (tools/lib.mjs) y anade las rutas y la
// configuracion propias: teaser-ig/teaser.config.json y su hoja de cortes.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail, readJson } from "../../tools/lib.mjs";

export { NPX, ROOT, fail, gameRepo, hasAudio, probe, readJson, run } from "../../tools/lib.mjs";

/** Carpeta del teaser dentro del proyecto de video. */
export const TEASER = join(ROOT, "teaser-ig");
/** La misma carpeta, como la ve HyperFrames (rutas desde la raiz del proyecto). */
export const WEB = "teaser-ig";

export function config() {
  return readJson(join(TEASER, "teaser.config.json"));
}

/** La hoja de cortes del teaser (la escribe `npm run teaser:music`). */
export function cues() {
  const path = join(TEASER, "audio", "teaser_cues.json");
  if (!existsSync(path)) fail("falta teaser-ig/audio/teaser_cues.json: corre `npm run teaser:music`");
  return readJson(path);
}

/** Escenas del teaser, en orden: carpetas teaser-ig/scenes/NN-nombre con index.html. */
export function scenes() {
  return readdirSync(join(TEASER, "scenes"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d\d-/.test(d.name))
    .map((d) => d.name)
    .filter((name) => existsSync(join(TEASER, "scenes", name, "index.html")))
    .sort();
}

/** Acepta "02", "02-deuda" o "deuda". */
export function resolveScene(arg) {
  const all = scenes();
  const hit =
    all.find((s) => s === arg) ||
    all.find((s) => s.startsWith(arg + "-")) ||
    all.find((s) => s.endsWith("-" + arg));
  if (!hit) fail(`no existe la escena "${arg}" del teaser. Escenas: ${all.join(", ")}`);
  return hit;
}
