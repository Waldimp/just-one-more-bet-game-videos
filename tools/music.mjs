// Regenera el audio que sale de scripts del repo del juego:
//
//   audio/trailer_music.wav + audio/trailer_cues.json   (tools/trailer/build_trailer_music.py)
//   sfx/*.wav                                           (tools/trailer/build_trailer_sfx.py)
//   sfx/casino_ambience.mp3                             (el ambiente del casino del juego)
//
// y sincroniza la hoja de cortes con las escenas. Si cambia la musica (tempo, compases),
// cambian las duraciones: hay que volver a renderizar las escenas afectadas.
//
//   npm run music
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, gameRepo, run } from "./lib.mjs";
import { sync } from "./sync.mjs";

const game = gameRepo();
const python = process.platform === "win32" ? "python" : "python3";
mkdirSync(join(ROOT, "audio"), { recursive: true });
mkdirSync(join(ROOT, "sfx"), { recursive: true });
run(python, [join(game, "tools", "trailer", "build_trailer_music.py"), join(ROOT, "audio")]);
run(python, [join(game, "tools", "trailer", "build_trailer_sfx.py"), join(ROOT, "sfx")]);
copyFileSync(
  join(game, "assets", "audio", "music", "casino-ambience.mp3"),
  join(ROOT, "sfx", "casino_ambience.mp3")
);
sync();
