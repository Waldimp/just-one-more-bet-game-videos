# frame.md — sistema visual del tráiler

La marca es el juego: pixel art, casino, tragicómico y oscuro. Este archivo fija cómo se
traduce eso a 1920×1080. Lo aplican `shared/css/trailer.css` y `shared/js/trailer.js`.

## Rejilla

- El juego mide 640×360 y escala ×3 exacto: **1 píxel de juego = 3 px de vídeo**.
- Todo lo que se dibuja encima (bordes, sombras, rellenos, posiciones) va en múltiplos de 3 px.
- Zoom sobre la imagen del juego: **solo enteros** (×2, ×3, ×6), con `image-rendering: pixelated`
  y desplazamientos enteros. Nunca escalas fraccionarias, nunca rotaciones, nunca desenfoque.
- Movimiento en escalones (`steps()`), no interpolado: un texto aparece de golpe o letra a
  letra, un fundido tiene 4 escalones, como los fundidos de paleta.

## Paleta (sale del juego)

| Token | Hex | De dónde |
|---|---|---|
| `--ink` | `#06080D` | negro azulado de las bandas de la intro |
| `--ui` | `#1A1921` | fondo de los botones y la barra de tiempo del HUD |
| `--ui-edge` | `#9B8A4B` | filo dorado apagado de los botones |
| `--cream` | `#F0E8D4` | color de la narración de la intro |
| `--gold` | `#D9C773` | oro de la interfaz (lo que dice el cobrador va en oro) |
| `--red` | `#DD292D` | rojo de casino de la paleta maestra: la deuda |

## Tipografía

- **Geist Pixel** (la fuente del juego, OFL), fijada en su estilo *Regular* y con el colón
  añadido: `shared/fonts/GeistPixelTrailer.ttf` (`tools/build_font.py`).
- Su celda mide 38/1000 del cuerpo. Tamaños por celda: c2 = 2 px (52,63 px de cuerpo, legal),
  **c3 = 3 px (78,95 px, el texto normal: una celda = un píxel de juego)**, c4, c5 y c6 para los
  golpes ("Una más.", "Solo una más.", el título).
- Contorno de un píxel de juego en `--ink` en las 8 direcciones (sin desenfoque); los grandes
  llevan además sombra dura de 2 píxeles.
- Centrado por código en la rejilla (`TRAILER.center`): centrar con CSS deja medio píxel.

## Estructura por actos

| Acto | Planos | Encuadre del texto |
|---|---|---|
| 1 · La premisa | 01–04 | **bandas de cine** de 120 px; el texto vive en ellas, como un subtítulo |
| 2 · El ritmo | 05–11 | sin bandas (se recogen en escalones al entrar al casino); texto en **cajas de la interfaz del juego** |
| 3 · El cobrador | 12–15 | silencio; vuelven las bandas; texto solo, lento |
| Cierre | 16 | negro, ficha del logo a ×6, título en oro, la deuda en rojo |

## Transiciones

- Cortes secos a golpe de música (la regla).
- **Zoom entero a la boca del león** (04→05): ×2, ×3, ×4, ×6 a golpe de corchea y negro.
- **Las bandas se recogen** (inicio de 05): el casino ocupa la pantalla.
- **Pase de carrete** (10→11): cinco carretes de tragamonedas con los símbolos del juego que
  bajan y tapan el cuadro.
- **Corte a silencio** (11→12): el montaje acaba en la dominante y no resuelve.
- **Golpe** (15→16): fogonazo de dos fotogramas y el La-9 que resuelve.

## No

Degradados lineales a pantalla completa, desenfoques, fundidos encadenados genéricos,
texto en fuentes que no sean la del juego, escalas no enteras de la imagen del juego.
