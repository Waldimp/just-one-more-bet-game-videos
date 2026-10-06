// Renderiza escenas del teaser, cada una por su lado (como el trailer).
//
//   npm run teaser:render -- <escena>      una ("02", "02-deuda" o "deuda")
//   npm run teaser:render -- all           las seis
//   npm run teaser:render -- 02 --draft    rapido, para mirar (no sirve para montar)
//
// Cada render: prepara (cues, textos, duraciones), renderiza teaser-ig/scenes/<escena> con
// HyperFrames a teaser-ig/renders/<escena>.mp4 (1080x1920, 60 fps, clips leidos como PNG,
// H.264 sin perdida), comprueba que tiene EXACTAMENTE los fotogramas de la hoja y deja una
// hoja de contacto de 6 fotogramas en teaser-ig/review/<escena>.png.
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prepare } from "./prepare.mjs";
import { NPX, ROOT, TEASER, WEB, config, fail, probe, resolveScene, run, scenes } from "./lib.mjs";
import { config as trailerConfig } from "../../tools/lib.mjs";

const args = process.argv.slice(2);
const draft = args.includes("--draft");
const positional = args.filter((a) => !a.startsWith("--"));
if (positional.length === 0) fail("uso: npm run teaser:render -- <escena|all> [--draft]");
const targets = positional[0] === "all" ? scenes() : positional.map(resolveScene);

const sheet = prepare({ quiet: true });
const cfg = config();
const started = Date.now();
for (const scene of targets) renderScene(scene);
console.log(`\nlisto en ${((Date.now() - started) / 1000).toFixed(0)} s`);

function renderScene(scene) {
  const cue = sheet.scenes.find((s) => s.id === scene);
  const outDir = join(TEASER, "renders");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${scene}${draft ? ".draft" : ""}.mp4`);
  console.log(`\n== teaser ${scene}  ${cue.duration} s, ${cue.frames} fotogramas`);
  const renderArgs = [
    "--yes", trailerConfig().hyperframes, "render", ".",
    "-c", `${WEB}/scenes/${scene}/index.html`,
    "--fps", String(cfg.fps),
    "--video-frame-format", "png",
    // Igual que el trailer: la captura rapida falla la calibracion en esta maquina.
    "--experimental-fast-capture=false",
    "--quiet",
    "-o", out,
  ];
  if (draft) renderArgs.push("--quality", "draft");
  else renderArgs.push("--crf", String(cfg.sceneCrf));
  run(NPX, renderArgs, { shell: process.platform === "win32" });

  const got = probe(out);
  if (!draft && got.frames !== cue.frames) {
    fail(`${scene} salio con ${got.frames} fotogramas y la hoja pide ${cue.frames}`);
  }
  console.log(`   ${got.frames} fotogramas, ${got.duration.toFixed(3)} s -> ${out}`);
  contactSheet(out, scene, cue.duration);
}

/** Seis fotogramas repartidos por la escena, a un cuarto de tamano, con su segundo. */
function contactSheet(video, scene, duration) {
  const dir = join(TEASER, "review");
  mkdirSync(dir, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "teaser-hoja-"));
  const n = 6;
  for (let k = 0; k < n; k++) {
    const t = ((k + 0.5) / n) * duration;
    run("ffmpeg", [
      "-y", "-loglevel", "error", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1",
      "-vf", "scale=270:480:flags=neighbor,drawtext=fontfile=shared/fonts/GeistPixelTrailer.ttf:" +
        `text='${scene} t=${t.toFixed(2)}s':x=6:y=h-th-6:fontsize=14:fontcolor=0xd9c773:box=1:` +
        "boxcolor=0x06080d:boxborderw=4",
      join(work, `f${k}.png`),
    ], { cwd: ROOT });
  }
  const out = join(dir, `${scene}.png`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", join(work, "f%d.png"),
    "-vf", "tile=6x1:padding=6:color=0x0c0a10", "-frames:v", "1", out]);
  rmSync(work, { recursive: true, force: true });
  console.log(`   hoja de contacto -> ${out}`);
}
