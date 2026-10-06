// Renderiza escenas del trailer, cada una por su lado.
//
//   npm run render -- <escena> [es|en|all]     una escena (por defecto en los dos idiomas)
//   npm run render -- all [es|en|all]          todas (es lo que hace `npm run render-all`)
//   npm run render -- 05 en --draft            rapido, para mirar (no sirve para montar)
//
// <escena> acepta "05", "05-hud" o "hud". Cada render:
//   1. sincroniza hoja de cortes, textos y duraciones (tools/sync.mjs);
//   2. renderiza scenes/<escena>/index.html con HyperFrames a renders/<idioma>/<escena>.mp4,
//      a 60 fps, leyendo los clips del juego como PNG (sin perdida en la extraccion);
//   3. comprueba que tiene EXACTAMENTE los fotogramas de la hoja de cortes (si no, el
//      montaje desplazaria todo lo que viene detras);
//   4. deja una hoja de contacto de 6 fotogramas en review/<idioma>/<escena>.png.
import {
  copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  LANGS, NPX, ROOT, config, fail, probe, resolveLangs, resolveScene, run, scenes,
} from "./lib.mjs";
import { sync } from "./sync.mjs";

const args = process.argv.slice(2);
const draft = args.includes("--draft");
const positional = args.filter((a) => !a.startsWith("--"));
if (positional.length === 0) {
  fail("uso: npm run render -- <escena|all> [es|en|all] [--draft]");
}
const targets = positional[0] === "all" ? scenes() : [resolveScene(positional[0])];
const langs = resolveLangs(positional[1]);

const sheet = sync({ quiet: true });
const cfg = config();
const started = Date.now();

// Escenas sin texto ya renderizadas (y copiadas) en esta tanda: no se repiten.
const done = new Set();
for (const lang of langs) {
  for (const scene of targets) {
    if (done.has(scene)) continue;
    renderScene(scene, lang);
  }
}
console.log(`\nlisto en ${((Date.now() - started) / 1000).toFixed(0)} s`);

function renderScene(scene, lang) {
  const cue = sheet.scenes.find((s) => s.id === scene);
  const outDir = join(ROOT, "renders", lang);
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${scene}${draft ? ".draft" : ""}.mp4`);
  const vars = join(tmpdir(), `trailer-vars-${lang}.json`);
  writeFileSync(vars, JSON.stringify({ lang }));
  console.log(`\n== ${scene} [${lang}]  ${cue.duration} s, ${cue.frames} fotogramas`);
  const renderArgs = [
    "--yes", cfg.hyperframes, "render", ".",
    "-c", `scenes/${scene}/index.html`,
    "--fps", String(cfg.fps),
    "--video-frame-format", "png",
    "--variables-file", vars,
    "--strict-variables",
    // La captura rapida (drawElement) falla la calibracion en esta maquina y se queda en un
    // solo proceso: la de capturas de pantalla, con varios, va mas rapida y sin sorpresas.
    "--experimental-fast-capture=false",
    "--quiet",
    "-o", out,
  ];
  if (draft) renderArgs.push("--quality", "draft");
  else renderArgs.push("--crf", String(cfg.sceneCrf));
  run(NPX, renderArgs, { shell: process.platform === "win32" });

  const got = probe(out);
  if (!draft && got.frames !== cue.frames) {
    fail(`${scene} [${lang}] salio con ${got.frames} fotogramas y la hoja pide ${cue.frames}`);
  }
  console.log(`   ${got.frames} fotogramas, ${got.duration.toFixed(3)} s -> ${out}`);
  contactSheet(out, scene, lang, cue.duration);

  // Una escena sin texto (no rellena nada de texts/*.json) sale igual en los dos idiomas:
  // se copia al otro en vez de renderizarla dos veces.
  if (!draft && !usesTexts(scene)) {
    for (const other of LANGS.filter((l) => l !== lang)) {
      mkdirSync(join(ROOT, "renders", other), { recursive: true });
      copyFileSync(out, join(ROOT, "renders", other, `${scene}.mp4`));
      contactSheet(out, scene, other, cue.duration);
      console.log(`   sin texto: copiada a renders/${other}/`);
    }
    done.add(scene);
  }
}

function usesTexts(scene) {
  const html = readFileSync(join(ROOT, "scenes", scene, "index.html"), "utf8");
  return /data-t=|T\.texts\(/.test(html);
}

/** Seis fotogramas repartidos por la escena, a la mitad de tamano, con su segundo. */
function contactSheet(video, scene, lang, duration) {
  const dir = join(ROOT, "review", lang);
  mkdirSync(dir, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "trailer-hoja-"));
  const n = 6;
  for (let k = 0; k < n; k++) {
    const t = ((k + 0.5) / n) * duration;
    const label = `${scene} ${lang}  t=${t.toFixed(2)}s`;
    run("ffmpeg", [
      "-y", "-loglevel", "error", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1",
      "-vf", "scale=960:540:flags=neighbor,drawtext=fontfile=shared/fonts/GeistPixelTrailer.ttf:" +
        `text='${label}':x=w-tw-12:y=h-th-12:fontsize=20:fontcolor=0xd9c773:box=1:` +
        "boxcolor=0x06080d:boxborderw=6",
      join(work, `f${k}.png`),
    ]);
  }
  const out = join(dir, `${scene}.png`);
  run("ffmpeg", [
    "-y", "-loglevel", "error", "-i", join(work, "f%d.png"),
    "-vf", "tile=3x2:padding=6:color=0x0c0a10", "-frames:v", "1", out,
  ]);
  rmSync(work, { recursive: true, force: true });
  console.log(`   hoja de contacto -> ${out}`);
}
