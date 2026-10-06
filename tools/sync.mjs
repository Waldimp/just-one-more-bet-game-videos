// Sincroniza lo que las escenas leen y que NO se edita a mano:
//
//   1. shared/js/cues.js   <- audio/trailer_cues.json (la hoja de cortes de la musica)
//   2. shared/js/texts.js  <- texts/es.json + texts/en.json
//   3. data-duration de la raiz de cada scenes/NN-*/index.html <- su duracion en la hoja
//
// Y comprueba dos cosas que si fallan se ven tarde y mal:
//   - que cada escena tenga su entrada en la hoja de cortes;
//   - que todos los caracteres de los textos existan en la fuente (si no, el navegador los
//     pintaria con otra fuente y se romperia la rejilla de pixeles).
//
// Lo llaman `render` y `assemble` antes de hacer nada; a mano: `npm run sync`.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LANGS, ROOT, cues, fail, readJson, scenes } from "./lib.mjs";

export function sync({ quiet = false } = {}) {
  const sheet = cues();
  writeFileSync(
    join(ROOT, "shared", "js", "cues.js"),
    "// GENERADO por tools/sync.mjs desde audio/trailer_cues.json. No editar.\n" +
      `window.TRAILER_CUES = ${JSON.stringify(sheet)};\n`
  );

  const glyphs = new Set(readJson(join(ROOT, "shared", "fonts", "glyphs.json")));
  const texts = {};
  for (const lang of LANGS) {
    texts[lang] = readJson(join(ROOT, "texts", `${lang}.json`));
    for (const [scene, entries] of Object.entries(texts[lang])) {
      if (scene.startsWith("_")) continue;
      for (const [key, value] of Object.entries(entries)) {
        for (const ch of String(value)) {
          if (!glyphs.has(ch.codePointAt(0))) {
            fail(`texts/${lang}.json ${scene}.${key}: la fuente no tiene "${ch}" ` +
              `(U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`);
          }
        }
      }
    }
  }
  writeFileSync(
    join(ROOT, "shared", "js", "texts.js"),
    "// GENERADO por tools/sync.mjs desde texts/*.json. No editar: edita los JSON.\n" +
      `window.TRAILER_TEXTS = ${JSON.stringify(texts)};\n`
  );

  let changed = 0;
  for (const scene of scenes()) {
    const cue = sheet.scenes.find((s) => s.id === scene);
    if (!cue) fail(`la escena ${scene} no esta en audio/trailer_cues.json`);
    const path = join(ROOT, "scenes", scene, "index.html");
    const html = readFileSync(path, "utf8");
    const duration = String(cue.duration);
    // Solo la raiz: es el primer elemento con data-composition-id.
    let next = html.replace(
      /(<div[^>]*data-composition-id="[^"]*"[^>]*?data-duration=")([^"]*)(")/,
      (m, a, _old, c) => a + duration + c
    );
    next = syncBeats(next, cue, scene);
    if (next !== html) {
      writeFileSync(path, next);
      changed++;
    }
  }
  writeIndex(sheet);
  if (!quiet) {
    console.log(`sync: ${sheet.scenes.length} planos en la hoja, ${scenes().length} escenas, ` +
      `${changed} duraciones actualizadas`);
  }
  return sheet;
}

/**
 * Cortes a golpe de musica. Un <video> o <audio> con `data-beats` se coloca por TIEMPOS de la
 * hoja de cortes y no por segundos, asi que si la musica cambia de tempo los cortes la siguen:
 *
 *   data-beats="2 4"     del tiempo 2 al 4 de la escena ("end" = final de la escena;
 *                        fracciones: 2.5 es la corchea)
 *   data-beats="3"       empieza en el tiempo 3 (la duracion es la que ya tenga)
 *   data-sync="9.0@4"    el segundo 9,0 del clip fuente cae justo en el tiempo 4
 *   "2-0.5s"             medio segundo antes del tiempo 2 (vale en los dos atributos)
 *
 * Reescribe `data-start`, `data-duration` y `data-media-start`, redondeados al fotograma.
 * Exportada: el teaser vertical (teaser-ig/tools/prepare.mjs) usa la misma sintaxis.
 */
export function syncBeats(html, cue, scene) {
  if (!cue.beats) return html;
  const frame = (v) => Math.round(v * 60) / 60;
  const at = (raw) => {
    // "4", "2.5" (corchea), "end", y con desfase en segundos: "2-0.5s", "end-0.2s".
    const m = /^(end|[\d.]+)([+-][\d.]+)s$/.exec(raw);
    if (m) return at(m[1]) + Number(m[2]);
    const token = raw;
    if (token === "end") return cue.duration;
    const i = Number(token);
    const k = Math.floor(i);
    const f = i - k;
    if (Number.isNaN(i) || k < 0 || k >= cue.beats.length) {
      fail(`${scene}: tiempo "${token}" fuera de la hoja (0..${cue.beats.length - 1})`);
    }
    const base = cue.beats[k];
    return f === 0 ? base : base + (cue.beats[k + 1] - base) * f;
  };
  const fmt = (v) => String(Number(frame(Math.max(v, 0)).toFixed(4)));
  return html.replace(/<(video|audio)\b[^>]*>/g, (tag) => {
    const beats = /data-beats="([^"]+)"/.exec(tag);
    if (!beats) return tag;
    const [from, to] = beats[1].trim().split(/\s+/);
    const start = frame(at(from));
    let out = setAttr(tag, "data-start", fmt(start));
    if (to !== undefined) out = setAttr(out, "data-duration", fmt(frame(at(to)) - start));
    const sync = /data-sync="([\d.]+)@([\w.]+)"/.exec(tag);
    if (sync) {
      const media = Number(sync[1]) - (at(sync[2]) - start);
      out = setAttr(out, "data-media-start", fmt(media));
    }
    return out;
  });
}

/**
 * index.html: el trailer completo para Studio (`npm run preview`) y para `npm run check`.
 * Monta las 16 escenas una detras de otra como sub-composiciones, con la musica debajo. No se
 * renderiza: el entregable sale de `render` + `assemble`, escena por escena.
 */
function writeIndex(sheet) {
  const NL = String.fromCharCode(10);
  const hosts = sheet.scenes
    .filter((s) => scenes().includes(s.id))
    .map((s) => {
      const cid = "s" + s.id.slice(0, 2);
      return `      <div id="${cid}" data-composition-id="${cid}" ` +
        `data-composition-src="scenes/${s.id}/index.html"` + NL +
        `        data-start="${s.start}" data-duration="${s.duration}" data-track-index="0"></div>`;
    })
    .join(NL);
  const html = `<!doctype html>
<!--
  GENERADO por tools/sync.mjs (npm run sync). No editar: se reescribe.
  El trailer completo, para mirarlo en Studio con la musica: npm run preview.
  Lo que se entrega NO sale de aqui, sale de render (una escena cada vez) + assemble.
-->
<html
  lang="es"
  data-composition-variables='[{"id":"lang","type":"enum","label":"Idioma","default":"es","options":[{"value":"es","label":"Español"},{"value":"en","label":"English"}]}]'
>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Just One More Bet · trailer</title>
    <script src="shared/vendor/gsap.min.js"></script>
    <script src="shared/js/cues.js"></script>
    <script src="shared/js/texts.js"></script>
    <script src="shared/js/trailer.js"></script>
    <link rel="stylesheet" href="shared/css/trailer.css" />
    <style>
      @font-face {
        font-family: "Geist Pixel Trailer";
        src: url("shared/fonts/GeistPixelTrailer.ttf") format("truetype");
      }
    </style>
  </head>
  <body>
    <div
      id="trailer"
      data-composition-id="trailer"
      data-start="0"
      data-duration="${sheet.duration}"
      data-width="1920"
      data-height="1080"
      data-fps="60"
    >
${hosts}
      <audio id="trailer-musica" src="audio/trailer_music.wav" data-start="0"
        data-duration="${sheet.duration}" data-volume="1" data-track-index="30"></audio>
    </div>
    <script>
      window.__timelines["trailer"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  writeFileSync(join(ROOT, "index.html"), html);
}

function setAttr(tag, name, value) {
  const re = new RegExp(`${name}="[^"]*"`);
  if (re.test(tag)) return tag.replace(re, `${name}="${value}"`);
  return tag.replace(/^<(\w+)/, `<$1 ${name}="${value}"`);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1].endsWith("sync.mjs")) {
  sync();
}
