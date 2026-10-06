// Graba clips del juego con el Movie Maker de Godot (tools/trailer/capture.sh del repo del
// juego) y los deja en captures/.
//
//   npm run capture -- all                 todos los planos de tools/trailer/trailer_shots.gd
//   npm run capture -- 06_slots 07_ruleta  solo esos
//
// Abre una ventana de Godot por plano. Hace falta Git Bash (o cualquier bash) en el PATH.
import { join } from "node:path";
import { ROOT, fail, gameRepo, run } from "./lib.mjs";

const shots = process.argv.slice(2);
if (shots.length === 0) fail("uso: npm run capture -- <plano>... | all");
// Bash quiere barras normales, tambien en Windows.
const slash = (p) => p.split("\\").join("/");
const script = slash(join(gameRepo(), "tools", "trailer", "capture.sh"));
const out = slash(join(ROOT, "captures"));
run("bash", [script, out, ...shots]);
