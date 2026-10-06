---
workflow: general-video
flow: automation
storyboard: no
message: "Sobrevivir una deuda predatoria apostando: una más, solo una más."
destination: itch.io / web / YouTube
aspect: 1920x1080
language: es, en
length: 86s
fps: 60
---

## Intent

Tráiler de *Just One More Bet* (Godot 4.7.1, pixel art). Guion aprobado por el usuario:
premisa lenta (cárcel, calle, callejón, parqueo), ritmo que acelera hasta el doble (HUD,
tragamonedas, ruleta y blackjack, el chiste del cigarro, la barra, el Brujo, montaje), corte
seco al reloj en 0:00, el cobrador que nunca entra, la palanca y el logo con su golpe.
Tragicómico, oscuro, pixel art y casino. Dos versiones: español e inglés.

## Assets

- `captures/` — clips del juego grabados con Movie Maker por `tools/trailer/` del repo del juego
  (deterministas: semilla fija y guion por plano).
- `audio/trailer_music.wav` — variante del tema de la intro (84 → 168 negras por minuto), de
  `tools/trailer/build_trailer_music.py` del repo del juego. Sin samples de terceros.
- `sfx/` — efectos sintetizados (`build_trailer_sfx.py`) y el ambiente del casino del juego.
- `shared/fonts/` — Geist Pixel (OFL) con el colón añadido.
- `shared/img/` — ficha del logo y símbolos de tragamonedas del juego.

## Customizations

- Proyecto editable por escenas: una composición por plano en `scenes/NN-nombre/`.
- Textos por idioma en `texts/es.json` y `texts/en.json`.
- Scripts: `render <escena> [es|en]`, `render-all`, `assemble [es|en]`.

## Notes

- Píxel perfecto: ×3 vecino más cercano, zooms enteros, fuente en su rejilla.
- La cifra de la deuda es la real (`initial_loan_principal` = 88.888.000).
- Aviso legal en el cierre: apuestas simuladas, sin dinero real, +18.
