// Prepara lo que las escenas del teaser leen y que NO se edita a mano (el `sync` del trailer,
// para el teaser):
//
//   1. teaser-ig/js/cues.js   <- teaser-ig/audio/teaser_cues.json (como window.TRAILER_CUES,
//                                asi TRAILER.beat() de shared/js/trailer.js sirve tal cual)
//   2. teaser-ig/js/texts.js  <- teaser-ig/texts/es.json (como window.TRAILER_TEXTS.es)
//   3. data-duration de cada teaser-ig/scenes/NN-*/index.html y los cortes con data-beats
//      (misma sintaxis que el trailer: syncBeats de tools/sync.mjs)
//   4. teaser-ig/index.html: el teaser entero para Studio, con la musica (no se renderiza:
//      el entregable sale de render + assemble, escena por escena)
//
// Comprueba que cada escena tenga su plano en la hoja y que todas las letras existan en la
// fuente. Lo llaman render y assemble; a mano: npm run teaser:prepare.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { syncBeats } from "../../tools/sync.mjs";
import { ROOT, TEASER, WEB, config, cues, fail, readJson, scenes } from "./lib.mjs";

export function prepare({ quiet = false } = {}) {
  const sheet = cues();
  const cfg = config();
  mkdirSync(join(TEASER, "js"), { recursive: true });
  writeFileSync(join(TEASER, "js", "cues.js"),
    "// GENERADO por teaser-ig/tools/prepare.mjs desde teaser-ig/audio/teaser_cues.json.\n" +
      `window.TRAILER_CUES = ${JSON.stringify(sheet)};\n`);

  const glyphs = new Set(readJson(join(ROOT, "shared", "fonts", "glyphs.json")));
  const texts = readJson(join(TEASER, "texts", `${cfg.lang}.json`));
  for (const [scene, entries] of Object.entries(texts)) {
    if (scene.startsWith("_")) continue;
    for (const [key, value] of Object.entries(entries)) {
      for (const ch of String(value)) {
        if (!glyphs.has(ch.codePointAt(0))) {
          fail(`teaser-ig/texts/${cfg.lang}.json ${scene}.${key}: la fuente no tiene "${ch}"`);
        }
      }
    }
  }
  writeFileSync(join(TEASER, "js", "texts.js"),
    "// GENERADO por teaser-ig/tools/prepare.mjs desde teaser-ig/texts/*.json. No editar.\n" +
      `window.TRAILER_TEXTS = ${JSON.stringify({ [cfg.lang]: texts })};\n`);

  let changed = 0;
  for (const scene of scenes()) {
    const cue = sheet.scenes.find((s) => s.id === scene);
    if (!cue) fail(`la escena ${scene} no esta en teaser_cues.json (teaser.config.json > sections)`);
    const path = join(TEASER, "scenes", scene, "index.html");
    const html = readFileSync(path, "utf8");
    let next = html.replace(
      /(<div[^>]*data-composition-id="[^"]*"[^>]*?data-duration=")([^"]*)(")/,
      (m, a, _old, c) => a + String(cue.duration) + c
    );
    next = syncBeats(next, cue, scene);
    if (next !== html) {
      writeFileSync(path, next);
      changed++;
    }
  }
  writeIndex(sheet, cfg);
  if (!quiet) {
    console.log(`prepare: ${sheet.scenes.length} planos, ${scenes().length} escenas, ` +
      `${changed} actualizadas, ${sheet.duration} s`);
  }
  return sheet;
}

function writeIndex(sheet, cfg) {
  const NL = String.fromCharCode(10);
  const hosts = sheet.scenes
    .filter((s) => scenes().includes(s.id))
    .map((s) => {
      const cid = "t" + s.id.slice(0, 2);
      return `      <div id="${cid}" data-composition-id="${cid}" ` +
        `data-composition-src="${WEB}/scenes/${s.id}/index.html"` + NL +
        `        data-start="${s.start}" data-duration="${s.duration}" data-track-index="0"></div>`;
    })
    .join(NL);
  const html = `<!doctype html>
<!--
  GENERADO por teaser-ig/tools/prepare.mjs (npm run teaser:prepare). No editar: se reescribe.
  El teaser entero, para mirarlo en Studio con la musica. Lo que se entrega sale de
  npm run teaser:render + npm run teaser:assemble, escena por escena.
-->
<html lang="${cfg.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${cfg.width}, height=${cfg.height}" />
    <title>Just One More Bet · teaser de Instagram</title>
    <script src="shared/vendor/gsap.min.js"></script>
    <script src="${WEB}/js/cues.js"></script>
    <script src="${WEB}/js/texts.js"></script>
    <script src="shared/js/trailer.js"></script>
    <link rel="stylesheet" href="shared/css/trailer.css" />
    <link rel="stylesheet" href="${WEB}/css/teaser.css" />
    <style>
      @font-face {
        font-family: "Geist Pixel Trailer";
        src: url("shared/fonts/GeistPixelTrailer.ttf") format("truetype");
      }
    </style>
  </head>
  <body>
    <div
      id="teaser"
      data-composition-id="teaser"
      data-start="0"
      data-duration="${sheet.duration}"
      data-width="${cfg.width}"
      data-height="${cfg.height}"
      data-fps="${cfg.fps}"
    >
${hosts}
      <audio id="teaser-musica" src="${WEB}/audio/teaser_music.wav" data-start="0"
        data-duration="${sheet.duration}" data-volume="1" data-track-index="30"></audio>
    </div>
    <script>
      window.__timelines["teaser"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  writeFileSync(join(TEASER, "index.html"), html);
}

// Corrido directamente (npm run teaser:prepare), no importado por render o assemble.
if (process.argv[1] && process.argv[1].split("\\").join("/").endsWith("teaser-ig/tools/prepare.mjs")) {
  prepare();
}
