// Monta el teaser: une las escenas renderizadas, les pone la musica debajo y lo masteriza con
// las mismas normas que el trailer.
//
//   npm run teaser:assemble                 monta out/teaser_ig_es.mp4 y las revisiones
//   npm run teaser:assemble -- --entregar   ademas lo copia, con su portada, a entregables/
//
// No renderiza nada: lee teaser-ig/renders/NN-*.mp4 tal como estan.
//
// Que hace:
//   1. Comprueba que estan las seis escenas y que cada una tiene los fotogramas de la hoja.
//   2. Imagen: une las escenas y codifica UNA sola vez a H.264 (yuv420p, 1080x1920, 60 fps).
//   3. Sonido: el de cada escena (juego y efectos), recortado o rellenado a su duracion, mas
//      teaser-ig/audio/teaser_music.wav; sonoridad a `targetLufs` con una ganancia fija y un
//      limitador sobremuestreado a `truePeakDb`. Falla si el pico (tambien el real) del AAC
//      decodificado no queda por debajo de -1 dBFS. AAC 320 kb/s.
//   4. Revision, en teaser-ig/review/:
//      - teaser_hoja.png: hoja de contacto de 9 fotogramas;
//      - teaser_zonas_seguras.png: el ultimo fotograma con las zonas de Instagram encima
//        (cabecera de 250 px, barra de respuesta de 350 px, margenes y el hueco del sticker);
//      - teaser_portada.png: el ultimo fotograma, 1080x1920 (la portada).
//      Y comprueba que el hueco del sticker queda limpio: igual en el ultimo fotograma que
//      antes de que aparezca ningun texto del cierre.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepare } from "./prepare.mjs";
import { ROOT, TEASER, config, fail, hasAudio, probe, run } from "./lib.mjs";

/** Zonas del cuadro (px de video). Las usa la revision y las respeta el cierre. */
export const ZONES = {
  top: 250, // cabecera de la historia (barra de progreso, perfil)
  bottom: 350, // barra de respuesta y "enviar mensaje"
  side: 108, // 10 %: margen de titulo
  sticker: [1110, 1404], // hueco limpio del cierre para el sticker del enlace (y0, y1)
};

const deliver = process.argv.includes("--entregar");
const sheet = prepare({ quiet: true });
const cfg = config();
const music = join(TEASER, "audio", "teaser_music.wav");
if (!existsSync(music)) fail("falta teaser-ig/audio/teaser_music.wav: npm run teaser:music");

const work = mkdtempSync(join(tmpdir(), "teaser-montaje-"));
try {
  const out = assemble();
  const review = reviewSheets(out);
  if (deliver) {
    const dir = join(ROOT, cfg.deliverables);
    mkdirSync(dir, { recursive: true });
    copyFileSync(out, join(dir, "teaser_ig_es.mp4"));
    copyFileSync(review.cover, join(dir, "portada_1080x1920.png"));
    console.log(`   entregables -> ${dir}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

function assemble() {
  console.log(`\n== teaser de Instagram [${cfg.lang}]`);
  const list = [];
  const audioList = [];
  for (const scene of sheet.scenes) {
    const file = join(TEASER, "renders", `${scene.id}.mp4`);
    if (!existsSync(file)) fail(`falta ${file}: npm run teaser:render -- ${scene.id}`);
    const got = probe(file);
    if (got.frames !== scene.frames) {
      fail(`${scene.id} tiene ${got.frames} fotogramas y la hoja pide ${scene.frames}: ` +
        "vuelve a renderizarla");
    }
    list.push(`file '${file.replace(/\\/g, "/")}'`);
    const wav = join(work, `${scene.id}.wav`);
    const dur = scene.duration.toFixed(6);
    if (hasAudio(file)) {
      run("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-vn",
        "-af", `aresample=48000,apad,atrim=0:${dur}`, "-ac", "2", "-c:a", "pcm_s16le", wav]);
    } else {
      run("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi",
        "-i", "anullsrc=r=48000:cl=stereo", "-t", dur, "-c:a", "pcm_s16le", wav]);
    }
    audioList.push(`file '${wav.replace(/\\/g, "/")}'`);
  }
  writeFileSync(join(work, "video.txt"), list.join("\n") + "\n");
  writeFileSync(join(work, "audio.txt"), audioList.join("\n") + "\n");

  const sfx = join(work, "sfx.wav");
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
    "-i", join(work, "audio.txt"), "-c:a", "pcm_s16le", sfx]);
  const mix = join(work, "mix.wav");
  const total = sheet.duration.toFixed(6);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", sfx, "-i", music, "-filter_complex",
    "[1:a]apad[m];[0:a][m]amix=inputs=2:normalize=0:duration=first," +
      `atrim=0:${total}[a]`,
    "-map", "[a]", "-c:a", "pcm_f32le", mix]);

  const lufs = measureLufs(mix);
  const gain = cfg.targetLufs - lufs;
  const limit = Math.pow(10, cfg.truePeakDb / 20).toFixed(4);
  const master = join(work, "master.wav");
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", mix, "-af",
    `volume=${gain.toFixed(2)}dB,aresample=192000:resampler=soxr:precision=28,` +
      `alimiter=limit=${limit}:attack=1:release=60:level=false:latency=true,` +
      "aresample=48000:resampler=soxr:precision=28",
    "-c:a", "pcm_s16le", master]);

  const out = join(ROOT, cfg.output);
  mkdirSync(join(ROOT, "out"), { recursive: true });
  run("ffmpeg", ["-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", join(work, "video.txt"), "-i", master,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", String(cfg.finalCrf),
    "-pix_fmt", "yuv420p", "-profile:v", "high", "-level:v", "4.2", "-r", String(cfg.fps),
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
    "-movflags", "+faststart", "-shortest", out]);
  report(out, lufs, gain);
  return out;
}

function measureLufs(file) {
  const out = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af",
    "ebur128=peak=true", "-f", "null", "-"], { capture: "all" });
  return integrated(out);
}

function integrated(text) {
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(text.split("Summary:").pop() || "");
  if (!m) fail("no se pudo medir la sonoridad (ebur128)");
  return Number(m[1]);
}

function report(out, lufsBefore, gain) {
  const v = probe(out);
  const stats = run("ffmpeg", ["-hide_banner", "-nostats", "-i", out, "-vn", "-af",
    "astats=measure_perchannel=none:measure_overall=Peak_level+RMS_level,ebur128=peak=true",
    "-f", "null", "-"], { capture: "all" });
  const peak = Number((/Peak level dB:\s+(-?[\d.]+|-inf)/.exec(stats) || [])[1]);
  const truePeak = Number((/Peak:\s+(-?[\d.]+) dBFS/.exec(stats.split("Summary:").pop()) || [])[1]);
  const lufs = integrated(stats);
  console.log(`   ${out}`);
  console.log(`   video ${v.duration.toFixed(3)} s (${v.frames} fotogramas; hoja ${sheet.frames})`);
  console.log(`   mezcla ${lufsBefore.toFixed(1)} LUFS -> ganancia ${gain.toFixed(1)} dB -> ` +
    `${lufs.toFixed(1)} LUFS, pico ${peak.toFixed(2)} dBFS, pico real ${truePeak.toFixed(2)} dBTP`);
  if (v.frames !== sheet.frames) fail("el teaser no tiene los fotogramas de la hoja");
  if (!(peak < -1.0)) fail(`el pico (${peak} dBFS) no queda por debajo de -1 dBFS`);
  if (!(truePeak < -1.0)) fail(`el pico real (${truePeak} dBTP) no queda por debajo de -1 dBTP`);
}

function reviewSheets(video) {
  const dir = join(TEASER, "review");
  mkdirSync(dir, { recursive: true });
  const font = "shared/fonts/GeistPixelTrailer.ttf";
  const last = (sheet.frames - 1) / cfg.fps;

  // Hoja de contacto: 9 fotogramas, uno o dos por escena, a un cuarto de tamano.
  const picks = [0.05, 0.9, 2.3, 3.75, 7.6, 10.2, 12.9, 14.9, last];
  picks.forEach((t, k) => {
    run("ffmpeg", ["-y", "-loglevel", "error", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1",
      "-vf", "scale=270:480:flags=neighbor,drawtext=fontfile=" + font +
        `:text='t=${t.toFixed(2)}s':x=6:y=h-th-6:fontsize=14:fontcolor=0xd9c773:box=1:` +
        "boxcolor=0x06080d:boxborderw=4",
      join(work, `h${k}.png`)], { cwd: ROOT });
  });
  const contact = join(dir, "teaser_hoja.png");
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", join(work, "h%d.png"),
    "-vf", "tile=9x1:padding=6:color=0x0c0a10", "-frames:v", "1", contact]);

  // Portada: el ultimo fotograma, del render sin perdida de la escena (no del mp4 final).
  const closing = join(TEASER, "renders", `${sheet.scenes[sheet.scenes.length - 1].id}.mp4`);
  const closingCue = sheet.scenes[sheet.scenes.length - 1];
  const cover = join(dir, "teaser_portada.png");
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", ((closingCue.frames - 1) / cfg.fps).toFixed(4),
    "-i", closing, "-frames:v", "1", cover]);

  // Zonas seguras sobre la portada.
  const z = ZONES;
  const H = cfg.height;
  const W = cfg.width;
  const label = (text, y) => `drawtext=fontfile=${font}:text='${text}':x=(w-tw)/2:y=${y}:` +
    "fontsize=26:fontcolor=white:box=1:boxcolor=0x000000@0.6:boxborderw=8";
  const filters = [
    `drawbox=x=0:y=0:w=${W}:h=${z.top}:color=0xdd292d@0.45:t=fill`,
    `drawbox=x=0:y=${H - z.bottom}:w=${W}:h=${z.bottom}:color=0xdd292d@0.45:t=fill`,
    `drawbox=x=${z.side}:y=${z.top}:w=${W - 2 * z.side}:h=${H - z.top - z.bottom}:` +
      "color=0xffffff@0.5:t=3",
    `drawbox=x=0:y=${z.sticker[0]}:w=${W}:h=${z.sticker[1] - z.sticker[0]}:color=0x2bd96b@0.25:t=fill`,
    `drawbox=x=0:y=${z.sticker[0]}:w=${W}:h=${z.sticker[1] - z.sticker[0]}:color=0x2bd96b:t=4`,
    label(`CABECERA DE INSTAGRAM  ${z.top} px`, Math.round(z.top / 2 - 16)),
    label(`BARRA DE RESPUESTA  ${z.bottom} px`, H - Math.round(z.bottom / 2) - 16),
    label(`HUECO LIMPIO PARA EL STICKER  ${z.sticker[1] - z.sticker[0]} px`,
      Math.round((z.sticker[0] + z.sticker[1]) / 2) - 16),
  ];
  const zonesPng = join(dir, "teaser_zonas_seguras.png");
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", cover, "-vf", filters.join(","), zonesPng],
    { cwd: ROOT });

  checkStickerGap(closing, closingCue);
  console.log(`   revision -> ${contact}`);
  console.log(`               ${zonesPng}`);
  console.log(`               ${cover}`);
  return { contact, zones: zonesPng, cover };
}

/**
 * El hueco del sticker tiene que quedar limpio: en el ultimo fotograma del cierre, la franja
 * del hueco es igual (salvo ruido de codificacion) que en el cuarto fotograma, cuando aun no ha
 * aparecido ningun texto del cierre debajo del titulo.
 */
function checkStickerGap(closing, cue) {
  const [y0, y1] = ZONES.sticker;
  const crop = `crop=${cfg.width}:${y1 - y0}:0:${y0}`;
  const grab = (frame) => {
    const res = spawnSync("ffmpeg", ["-loglevel", "error", "-ss", (frame / cfg.fps).toFixed(4),
      "-i", closing, "-frames:v", "1", "-vf", `${crop},format=gray`, "-f", "rawvideo", "-"],
    { maxBuffer: 1 << 28 });
    if (res.status !== 0 || !res.stdout.length) fail("no se pudo leer el cierre para el hueco");
    return res.stdout;
  };
  const a = grab(3);
  const b = grab(cue.frames - 1);
  let diff = 0;
  let worst = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const d = Math.abs(a[i] - b[i]);
    diff += d;
    worst = Math.max(worst, d);
  }
  const mean = diff / a.length;
  console.log(`   hueco del sticker (y ${y0}-${y1}): diferencia media ${mean.toFixed(3)}, ` +
    `maxima ${worst}`);
  if (mean > 0.5 || worst > 24) fail("el hueco del sticker no queda limpio: hay algo encima");
}
