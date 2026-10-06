// Utilidades compartidas por los scripts del proyecto (sync, render, assemble, capture).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const LANGS = ["es", "en"];

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function config() {
  return readJson(join(ROOT, "trailer.config.json"));
}

/** Ruta absoluta al repo del juego (la que dice trailer.config.json). */
export function gameRepo() {
  return resolve(ROOT, config().gameRepo);
}

/** La hoja de cortes que escribe la musica. */
export function cues() {
  const path = join(ROOT, "audio", "trailer_cues.json");
  if (!existsSync(path)) {
    fail("falta audio/trailer_cues.json: corre antes `npm run music`");
  }
  return readJson(path);
}

/** Escenas del proyecto, en orden: carpetas `scenes/NN-nombre` con index.html. */
export function scenes() {
  return readdirSync(join(ROOT, "scenes"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d\d-/.test(d.name))
    .map((d) => d.name)
    .filter((name) => existsSync(join(ROOT, "scenes", name, "index.html")))
    .sort();
}

/** Acepta "05", "05-hud" o "hud" y devuelve la carpeta de la escena. */
export function resolveScene(arg) {
  const all = scenes();
  const hit =
    all.find((s) => s === arg) ||
    all.find((s) => s.startsWith(arg + "-")) ||
    all.find((s) => s.endsWith("-" + arg));
  if (!hit) fail(`no existe la escena "${arg}". Escenas: ${all.join(", ")}`);
  return hit;
}

export function resolveLangs(arg) {
  if (!arg || arg === "all") return LANGS;
  if (!LANGS.includes(arg)) fail(`idioma "${arg}" desconocido (es | en | all)`);
  return [arg];
}

/** Corre un comando y aborta si falla. Devuelve su salida si `capture`. */
export function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: opts.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    shell: opts.shell || false,
    maxBuffer: 1 << 30,
  });
  if (res.error) fail(`${cmd}: ${res.error.message}`);
  if (res.status !== 0) {
    if (opts.capture) process.stderr.write(res.stdout + res.stderr);
    fail(`${cmd} ${args.slice(0, 3).join(" ")}... salio con ${res.status}`);
  }
  // `capture: "all"` junta stdout y stderr (ffmpeg escribe sus mediciones en stderr).
  if (opts.capture === "all") return res.stdout + res.stderr;
  return opts.capture ? res.stdout : "";
}

/** ffprobe: duracion en segundos y numero de fotogramas de video. */
export function probe(path) {
  const out = run(
    "ffprobe",
    ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
      "stream=nb_read_frames:format=duration", "-of", "json", path],
    { capture: true }
  );
  const json = JSON.parse(out);
  return {
    duration: Number(json.format.duration),
    frames: Number(json.streams[0].nb_read_frames),
  };
}

export function hasAudio(path) {
  const out = run(
    "ffprobe",
    ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0",
      path],
    { capture: true }
  );
  return out.trim().length > 0;
}

export function fail(message) {
  console.error(`\n  error: ${message}\n`);
  process.exit(1);
}

/** Lo que se le pasa a npx en Windows y en el resto. */
export const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
