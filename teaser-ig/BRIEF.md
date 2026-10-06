---
workflow: general-video
flow: automation
storyboard: no
message: "¿Te la jugás? Una deuda de ₡88.888.000, 150 segundos al día y el cobrador: ¿solo una más?"
destination: Instagram (historias), con el sticker del link a https://mohhamedsamu.itch.io/just-one-more-bet
aspect: 1080x1920
language: es (voseo salvadoreño)
length: 24s
fps: 60
---

## Intent

Teaser corto para las historias de Instagram de *Just One More Bet* (encargo del usuario y
Samuel, 2026-10-06). Dejar la duda y llevar al link del juego. Gancho en el primer fotograma,
ritmo rápido de apuestas (sietes, la bola, la carta que se voltea, el final de foto, el dinero
que sube), el golpe (la deuda, el reloj, el cobrador) y un final sin resolver: la palanca baja
y se corta antes del resultado. Cierre con logo, título, «Jugalo gratis», un hueco limpio para
el sticker del link y el aviso «+18 · Apuestas simuladas · Sin dinero real».

Es una pieza aparte del tráiler (otro formato), dentro del mismo proyecto y con su propia
carpeta, configuración y herramientas: el tráiler no se toca. Guion plano a plano: `GUION.md`.

## Assets

- `captures/` — planos verticales del juego (composición de móvil, 360×640 a ×3) grabados con
  `tools/trailer/teaser_shots.gd` del repo del juego. Deterministas.
- `audio/teaser_music.wav` — remontaje de `audio/trailer_music.wav` (la música propia del
  tráiler) según `teaser.config.json`.
- `img/fachada_vertical.png` — la fachada del león en vertical, sacada de `ig_parqueo`.
- Del tráiler: `shared/` (fuente, CSS, JS, ficha del logo), `sfx/` (palanca, sello, tictac,
  ficha, puerta, ambiente del casino).

## Notes

- Zonas de Instagram: texto solo entre y = 250 y y = 1570; hueco del sticker en y 1110–1404.
- Píxel perfecto: ×3 y ×6 (escalas enteras), vecino más cercano.
- Sonoridad como el tráiler: −16 LUFS, picos por debajo de −1 dBFS.
