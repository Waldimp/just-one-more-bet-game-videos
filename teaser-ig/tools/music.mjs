// La musica del teaser: un REMONTAJE de la del trailer (audio/trailer_music.wav), sin
// componer nada nuevo. Cada plano del teaser coge el tramo de un plano del trailer que diga
// teaser.config.json (`sections`):
//
//   01-apuestas  el montaje entero (accelerando de 132 a 168 que acaba en la dominante)
//   02-deuda     silencio (el corte en seco del trailer: solo el golpe del sello)
//   03-reloj     silencio (solo el tictac)
//   04-cobrador  el pedal grave del cobrador
//   05-una-mas   los ultimos segundos del platillo al reves y el tictac de carrete de la palanca
//   06-cierre    el golpe del logo (La-9, que resuelve la dominante) y su cola
//
// Escribe teaser-ig/audio/teaser_music.wav (48 kHz, estereo, 16 bits, al fotograma exacto) y
// teaser-ig/audio/teaser_cues.json: donde empieza cada plano, cuantos fotogramas dura y, en
// el montaje, en que instante cae cada tiempo (sale de la hoja del trailer).
//
//   npm run teaser:music        (necesita audio/trailer_music.wav: `npm run music`)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, TEASER, config, fail, readJson, run } from "./lib.mjs";

const SR = 48000;
const cfg = config();
const music = join(ROOT, "audio", "trailer_music.wav");
const trailerCues = join(ROOT, "audio", "trailer_cues.json");
if (!existsSync(music) || !existsSync(trailerCues)) {
  fail("falta la musica del trailer (audio/trailer_music.wav y trailer_cues.json): npm run music");
}
const sheet = readJson(trailerCues);
const outDir = join(TEASER, "audio");
mkdirSync(outDir, { recursive: true });

const filters = [];
const labels = [];
const scenes = [];
let frame = 0;
// Rampa minima en cada empalme, como el corte del trailer: sin chasquido.
const RAMP = 0.003;

cfg.sections.forEach((section, k) => {
  const samples = section.frames * (SR / cfg.fps);
  const seconds = section.frames / cfg.fps;
  const label = `s${k}`;
  const entry = {
    id: section.id,
    start: Number((frame / cfg.fps).toFixed(6)),
    frames: section.frames,
    duration: Number(seconds.toFixed(6)),
  };
  if (!section.from) {
    filters.push(`anullsrc=r=${SR}:cl=stereo,atrim=end_sample=${samples}[${label}]`);
  } else {
    const cue = sheet.scenes.find((s) => s.id === section.from);
    if (!cue) fail(`teaser.config.json: el plano ${section.from} no esta en la hoja del trailer`);
    const offset = section.tail ? cue.duration - seconds : section.offset || 0;
    const from = Math.round((cue.start + offset) * SR);
    const fadeIn = Math.max(section.fadeIn || 0, RAMP);
    const fadeOut = Math.max(section.fadeOut || 0, RAMP);
    filters.push(
      `[0:a]atrim=start_sample=${from}:end_sample=${from + samples},asetpts=N/SR/TB,` +
        `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${(seconds - fadeOut).toFixed(6)}:` +
        `d=${fadeOut}[${label}]`
    );
    // Los tiempos del plano del trailer, en segundos del plano del teaser.
    if (cue.beats) {
      entry.beats = cue.beats
        .map((b) => Number((b - offset).toFixed(4)))
        .filter((b) => b >= -0.01 && b <= seconds + 0.01);
      entry.bpm = cue.bpm;
    }
    entry.source = { scene: section.from, offset: Number(offset.toFixed(6)) };
  }
  labels.push(`[${label}]`);
  scenes.push(entry);
  frame += section.frames;
});

const wav = join(outDir, "teaser_music.wav");
run("ffmpeg", ["-y", "-loglevel", "error", "-i", music, "-filter_complex",
  filters.join(";") + ";" + labels.join("") + `concat=n=${labels.length}:v=0:a=1[out]`,
  "-map", "[out]", "-ar", String(SR), "-ac", "2", "-c:a", "pcm_s16le", wav]);

const cues = {
  fps: cfg.fps,
  sample_rate: SR,
  duration: Number((frame / cfg.fps).toFixed(6)),
  frames: frame,
  source: "audio/trailer_music.wav",
  scenes,
};
writeFileSync(join(outDir, "teaser_cues.json"), JSON.stringify(cues, null, 2) + "\n");
console.log(`teaser_music.wav: ${cues.duration} s (${frame} fotogramas)`);
for (const s of scenes) {
  console.log(`  ${s.id.padEnd(14)} ${s.start.toFixed(3).padStart(7)} s  ${String(s.frames).padStart(4)} fot.` +
    (s.source ? `  <- ${s.source.scene} +${s.source.offset.toFixed(2)} s` : "  silencio"));
}
