// Graba los planos VERTICALES del teaser con el Movie Maker de Godot y los deja en
// teaser-ig/captures/ (1080x1920, H.264 RGB sin perdida, y su sonido en WAV).
//
//   npm run teaser:capture -- all              todos los planos de tools/trailer/teaser_shots.gd
//   npm run teaser:capture -- ig_slots ig_hud  solo esos
//
// Usa el mismo capture.sh que el trailer (repo del juego): los planos de teaser_shots.gd se
// graban a 360x640 con la composicion de movil. Abre una ventana de Godot por plano.
import { join } from "node:path";
import { ROOT, fail, gameRepo, run } from "../../tools/lib.mjs";

const args = process.argv.slice(2);
if (args.length === 0) fail("uso: npm run teaser:capture -- <plano>... | all");
const shots = args.length === 1 && args[0] === "all" ? ["teaser"] : args;
const slash = (p) => p.split("\\").join("/");
const script = slash(join(gameRepo(), "tools", "trailer", "capture.sh"));
const out = slash(join(ROOT, "teaser-ig", "captures"));
run("bash", [script, out, ...shots]);
