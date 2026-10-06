# Tráiler de Just One More Bet

Proyecto editable del tráiler (~86 s, 1920×1080, 60 fps, español e inglés), hecho con
**HyperFrames** (vídeo desde HTML) sobre clips del juego grabados con el **Movie Maker de
Godot**. Una composición por escena: cambiar un texto o una escena obliga a renderizar **solo
esa escena** y volver a montar.

Entregables: `out/trailer_es.mp4` y `out/trailer_en.mp4` (H.264 yuv420p 60 fps, AAC 320 kb/s,
picos por debajo de −1 dBFS).

## Requisitos

- Node 22+ (`npx` descarga `hyperframes@0.8.136` la primera vez) y **ffmpeg/ffprobe** en el PATH.
- Python 3 con `numpy`, `scipy` (música y efectos) y `fontTools` (solo para rehacer la fuente).
- El repo del juego al lado: `../just-one-more-bet` (ruta en `trailer.config.json`), con su
  Godot 4.7.1 declarado en `.godot-bin`. Solo hace falta para **capturar** y para **la música**.
- Bash (Git Bash en Windows) para capturar.

## Estructura

```
scenes/NN-nombre/index.html   una composición por escena (el diseño). Se versiona.
texts/es.json, texts/en.json  los textos. Cambiar una frase NO toca el diseño.
shared/css/trailer.css        sistema visual (rejilla de 3 px, paleta, tipos). Ver frame.md.
shared/js/trailer.js          ayudas: textos, tiempos de la música, máquina de escribir, carrete.
shared/fonts/                 Geist Pixel con el colón (OFL). tools/build_font.py la rehace.
shared/img/                   ficha del logo y símbolos de tragamonedas del juego.
tools/                        scripts (abajo).
trailer.config.json           ruta al juego, calidad, sonoridad objetivo.

captures/   clips del juego (1920×1080, H.264 RGB sin pérdida) + su sonido   [ignorado]
audio/      música del tráiler + hoja de cortes (trailer_cues.json)          [ignorado]
sfx/        efectos sintetizados + ambiente del casino                        [ignorado]
renders/es, renders/en   cada escena renderizada                              [ignorado]
review/es, review/en     hoja de contacto de cada escena (6 fotogramas)       [ignorado]
out/        los tráileres montados                                            [ignorado]
index.html  el tráiler completo para Studio (GENERADO por sync)               [ignorado]
```

## Las escenas

| Escena | Dur. | Qué es |
|---|---|---|
| 01-carcel | 4,0 | Negro, la reja se abre. "Saliste de la cárcel." Entra el jazz. |
| 02-calle | 5,7 | Cartel, portazo y NO, cada uno a golpe. "Nadie te contrata." |
| 03-callejon | 5,7 | El cobrador sale a la luz; la firma en el cheque, el sello APROBADO (con su golpe) y el sobre. "Pero alguien sí te presta." |
| 04-parqueo | 5,7 | La fachada del león; entra por la boca. 150 s, 3 acciones, ₡88.888.000. Zoom a la boca. |
| 05-hud | 5,2 | Dentro. La tarjeta del HUD: DÍA 1 y el reloj; las acciones, la plata y la deuda. |
| 06-tragamonedas | 4,8 | Cuatro sietes y el quinto a cámara lenta: GANASTE. "Ganar se siente bien." |
| 07-ruleta | 4,4 | La bola en el 2; la carta que se voltea y es un rey. "Perder… también se olvida rápido." |
| 08-tomar-aire | 4,3 | Se fuma algo y mira a cámara. "(Es tabaco. Probablemente.)" Solo el contrabajo. |
| 09-barra | 4,0 | Tres whiskys y ¡MODO EBRIO! ×1,25, con la pantalla meciéndose. |
| 10-brujo | 5,7 | El Brujo, su tienda (con el plano del casino), la camisa de la pausa llenándose de pines. "Te vende suerte. O eso dice." |
| 11-montaje | 9,7 | A todo trapo (132→168): mesas, caballos a cámara lenta, el HUD. "Una más." ×3 |
| 12-reloj | 4,0 | Silencio. 0:00. Tictac. |
| 13-cobrador | 6,0 | La puerta se entreabre; la calva, las gafas, la mano con el expediente. "Él siempre llega." |
| 14-negro | 2,0 | Negro y el clic de una palanca. |
| 15-solo-una-mas | 6,0 | La palanca de cerca. "Solo una más." |
| 16-logo | 9,0 | El golpe. Logo, itch.io, la web, la deuda subiendo y el aviso legal. |

Las duraciones las manda la **música** (cada escena es una sección musical y cada corte cae en
un tiempo fuerte). Están en `audio/trailer_cues.json`; `npm run sync` las copia a cada escena.

## Uso diario

```bash
npm run render -- 06 es          # renderiza una escena en un idioma (06, 06-tragamonedas o tragamonedas)
npm run render -- 06             # la misma escena en los dos idiomas
npm run render-all               # las 16 escenas en los dos idiomas (~25 min)
npm run render -- all en         # las 16 escenas en inglés
npm run assemble -- es           # monta out/trailer_es.mp4 (sin renderizar nada)
npm run assemble                 # monta los dos
npm run render -- 06 es --draft  # borrador rápido para mirar (no sirve para montar)
npm run preview                  # Studio de HyperFrames con el tráiler completo y la música
```

Cada `render` deja una hoja de contacto en `review/<idioma>/<escena>.png`: mírala antes de montar.

### Cambiar un texto

1. Edita `texts/es.json` (o `en.json`). Las claves van por escena: `"02-calle": { "line": ... }`.
2. `npm run render -- 02 es`
3. `npm run assemble -- es`

`sync` comprueba que todos los caracteres existan en la fuente (si no, avisa y para).

### Cambiar una escena

Edita `scenes/NN-nombre/index.html`. Cada escena dice arriba qué hace. Lo habitual:

- **Cortes a golpe de música**: un clip se coloca con `data-beats="desde hasta"` (tiempos de la
  escena; `2.5` es la corchea, `end` el final, `"2-0.5s"` medio segundo antes del tiempo 2) y
  `data-sync="9.0@4"` (el segundo 9,0 del clip fuente cae en el tiempo 4). `sync` los convierte
  a `data-start`, `data-duration` y `data-media-start`: no edites esos tres a mano en un clip
  que tenga `data-beats`.
- **Encuadre**: `<div class="zoom" style="transform: translate(Xpx, Ypx) scale(N)">` con N entero.
  Para mirar el píxel de juego (gx, gy) en la esquina: X = −gx·3·N, Y = −gy·3·N.
- **Animación**: el script de abajo; `TRAILER.type` (máquina de escribir), `TRAILER.slam`
  (de golpe), `TRAILER.jolt` (sacudida), `TRAILER.beat(SCENE, n)` (segundo del tiempo n).

Después: `npm run render -- NN` y `npm run assemble`.

### Cambiar la imagen del juego (recapturar)

Los planos se graban con guion en el repo del juego: `tools/trailer/trailer_shots.gd` (qué se
graba y con qué parámetros) y `tools/trailer/directors/` (cómo se monta cada uno: la intro
remontada, el parqueo, las mesas con su resultado buscado por semilla, el mundo con su HUD,
el cobrador). Todo determinista: grabar dos veces da los mismos fotogramas.

```bash
npm run capture -- 06_slots_lento      # recaptura un plano (abre una ventana de Godot)
npm run capture -- all                 # todos (~6 min)
```

Luego renderiza las escenas que usan ese clip y monta.

### Cambiar la música

`tools/trailer/build_trailer_music.py` (repo del juego) define las secciones: compases, tempo y
textura de cada escena. `npm run music` la regenera junto con los efectos y la hoja de cortes.
Si cambian compases o tempos, cambian las duraciones: hay que renderizar las escenas afectadas
(los cortes con `data-beats` se mueven solos).

## Calidad

- Clips del juego: H.264 RGB sin pérdida; HyperFrames los lee como PNG (`--video-frame-format
  png`). Escenas: H.264 sin pérdida (`sceneCrf: 0`). Una sola compresión con pérdida, al montar.
- `assemble` mide la sonoridad, la lleva a `targetLufs` (−16 LUFS) y pasa un limitador
  sobremuestreado a `truePeakDb` (−2,5 dB). Falla si el pico del AAC decodificado, o su pico
  real, no queda por debajo de −1 dBFS. Deja `review/trailer_<idioma>.png` (una imagen por escena).
- `npm run lint` y `npm run check` (lint, runtime, maquetación y contraste sobre `index.html`
  con las 16 escenas) deben pasar. Los avisos de `container_overflow` de los `.zoom` son el
  recorte buscado, no un error.
- Los niveles del sonido del juego en cada escena (`data-volume` de los `<audio>` que leen
  `captures/*.wav`) están bajados para que la música mande: el golpe del logo es lo más fuerte.

## Licencias

- Geist Pixel: SIL Open Font License (`shared/fonts/OFL.txt`); versión modificada (colón añadido).
- Música y efectos sintetizados: propios. El ambiente del casino y los sonidos de mesa salen del
  juego.
- Arte del juego: el tileset y los personajes de Jephed (Game Between The Lines) piden
  atribución: ver `docs/CREDITS.md` del juego.
