// Monta el trailer: concatena las escenas renderizadas y les pone la musica debajo.
//
//   npm run assemble -- [es|en|all]      (por defecto, los dos idiomas)
//
// No vuelve a renderizar nada: lee renders/<idioma>/NN-*.mp4 tal como estan. Por eso cambiar
// un texto cuesta un render de UNA escena y un assemble.
//
// Que hace, por idioma:
//   1. Comprueba que estan las 16 escenas y que cada una tiene los fotogramas de la hoja de
//      cortes (si una no cuadra, todo lo que viene detras se desincroniza de la musica).
//   2. Imagen: une las escenas y codifica UNA sola vez a H.264 (yuv420p, 60 fps).
//   3. Sonido: une el sonido de cada escena (efectos y sonido del juego) recortado o
//      rellenado a su duracion exacta, lo mezcla con audio/trailer_music.wav, lo lleva a la
//      sonoridad de trailer.config.json (LUFS) y pasa un limitador sobremuestreado a `truePeakDb` (-2,5 dB: el
//      AAC rebota algo por encima) para que el pico, tambien el real entre muestras, quede por
//      debajo de -1 dBFS. AAC a 320 kb/s.
//   4. Mide el resultado (duracion, pico del AAC decodificado, LUFS) y lo imprime.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT, config, fail, hasAudio, probe, resolveLangs, run } from "./lib.mjs";
import { sync } from "./sync.mjs";

const langs = resolveLangs(process.argv[2]);
const sheet = sync({ quiet: true });
const cfg = config();
const music = join(ROOT, "audio", "trailer_music.wav");
if (!existsSync(music)) fail("falta audio/trailer_music.wav: npm run music");

for (const lang of langs) assemble(lang);

function assemble(lang) {
  console.log(`\n== trailer [${lang}]`);
  const work = mkdtempSync(join(tmpdir(), `trailer-montaje-${lang}-`));
  try {
    const list = [];
    const audioList = [];
    for (const scene of sheet.scenes) {
      const file = join(ROOT, "renders", lang, `${scene.id}.mp4`);
      if (!existsSync(file)) fail(`falta ${file}: npm run render -- ${scene.id} ${lang}`);
      const got = probe(file);
      if (got.frames !== scene.frames) {
        fail(`${scene.id} [${lang}] tiene ${got.frames} fotogramas y la hoja pide ` +
          `${scene.frames}: vuelve a renderizarla`);
      }
      list.push(`file '${file.replace(/\\/g, "/")}'`);
      // Sonido de la escena, al milisimo de su duracion (o silencio si no tiene).
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

    // Efectos de todas las escenas, seguidos, y la mezcla con la musica.
    const sfx = join(work, "sfx.wav");
    run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
      "-i", join(work, "audio.txt"), "-c:a", "pcm_s16le", sfx]);
    const mix = join(work, "mix.wav");
    const total = sheet.duration.toFixed(6);
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", sfx, "-i", music, "-filter_complex",
      `[0:a]volume=${cfg.sfxGainDb}dB[s];[1:a]volume=${cfg.musicGainDb}dB,apad[m];` +
      `[s][m]amix=inputs=2:normalize=0:duration=first,atrim=0:${total}[a]`,
      "-map", "[a]", "-c:a", "pcm_f32le", mix]);

    // Sonoridad: se mide y se corrige con una ganancia fija (no un compresor), y el limitador
    // se encarga solo de los picos.
    const lufs = measureLufs(mix);
    const gain = cfg.targetLufs - lufs;
    const limit = Math.pow(10, cfg.truePeakDb / 20).toFixed(4);
    const master = join(work, "master.wav");
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", mix, "-af",
      // Limitador sobremuestreado x4: asi tambien frena los picos ENTRE muestras, que son
      // los que el AAC convierte en picos de verdad al decodificar.
      `volume=${gain.toFixed(2)}dB,aresample=192000:resampler=soxr:precision=28,` +
      `alimiter=limit=${limit}:attack=1:release=60:level=false:latency=true,` +
      `aresample=48000:resampler=soxr:precision=28`,
      "-c:a", "pcm_s16le", master]);

    mkdirSync(join(ROOT, "out"), { recursive: true });
    const out = join(ROOT, "out", `trailer_${lang}.mp4`);
    run("ffmpeg", ["-y", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", join(work, "video.txt"), "-i", master,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", String(cfg.finalCrf),
      "-pix_fmt", "yuv420p", "-profile:v", "high", "-level:v", "4.2", "-r", String(cfg.fps),
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
      "-movflags", "+faststart", "-shortest", out]);

    report(out, lufs, gain);
    trailerSheet(out, lang, work);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
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
  const audioDur = Number(run("ffprobe", ["-v", "error", "-select_streams", "a:0",
    "-show_entries", "stream=duration", "-of", "csv=p=0", out], { capture: true }));
  console.log(`   ${out}`);
  console.log(`   video ${v.duration.toFixed(3)} s (${v.frames} fotogramas; hoja ${sheet.frames}), ` +
    `audio ${audioDur.toFixed(3)} s`);
  console.log(`   mezcla ${lufsBefore.toFixed(1)} LUFS -> ganancia ${gain.toFixed(1)} dB -> ` +
    `${lufs.toFixed(1)} LUFS, pico ${peak.toFixed(2)} dBFS, pico real ${truePeak.toFixed(2)} dBTP`);
  if (v.frames !== sheet.frames) fail("el trailer no tiene los fotogramas de la hoja");
  if (!(peak < -1.0)) fail(`el pico (${peak} dBFS) no queda por debajo de -1 dBFS`);
  if (!(truePeak < -1.0)) fail(`el pico real (${truePeak} dBTP) no queda por debajo de -1 dBTP`);
}

/** review/trailer_<idioma>.png: un fotograma de cada escena (al 60 %), 4x4, con su nombre. */
function trailerSheet(video, lang, work) {
  const frames = [];
  sheet.scenes.forEach((scene, k) => {
    const t = scene.start + scene.duration * 0.6;
    const png = join(work, `t${String(k).padStart(2, "0")}.png`);
    run("ffmpeg", ["-y", "-loglevel", "error", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1",
      "-vf", "scale=480:270:flags=neighbor,drawtext=fontfile=shared/fonts/GeistPixelTrailer.ttf:" +
        `text='${scene.id}':x=8:y=8:fontsize=16:fontcolor=0xd9c773:box=1:boxcolor=0x06080d:` +
        "boxborderw=4", png]);
    frames.push(png);
  });
  mkdirSync(join(ROOT, "review"), { recursive: true });
  const out = join(ROOT, "review", `trailer_${lang}.png`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", join(work, "t%02d.png"),
    "-vf", "tile=4x4:padding=4:color=0x0c0a10", "-frames:v", "1", out]);
  console.log(`   hoja del trailer -> ${out}`);
}
