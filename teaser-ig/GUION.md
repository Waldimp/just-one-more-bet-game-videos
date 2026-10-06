# Guion · Teaser de Instagram (historias)

**Just One More Bet** · vertical 1080×1920 · 60 fps · **23,95 s** (1437 fotogramas) · español
con voseo salvadoreño.

Encargo: un teaser corto para las historias de Instagram que deje la duda y lleve al link del
juego (https://mohhamedsamu.itch.io/just-one-more-bet; el link lo pone el sticker de la historia).
Gancho en el primer segundo, ritmo rápido de apuestas, el golpe de la deuda, el reloj y el
cobrador, y un final sin resolver: ¿ganó o perdió?

## Reglas del formato

- **Todo es el juego de hoy en vertical**: la composición de móvil (viewport 360×640) grabada
  con el Movie Maker a ×3, píxel a píxel. HUD en tarjeta, cheque crema con el sello APROBADO,
  fachada del león nuevo. Los acercamientos son ×6 (escala entera).
- **Zonas de Instagram**: nada que haya que leer en los 250 px de arriba (cabecera de la
  historia) ni en los 350 px de abajo (barra de respuesta). Texto entre y = 250 y y = 1570.
  Cuando la tarjeta del HUD sale a ×6, se baja 252 px para que el reloj no quede bajo la
  cabecera.
- **Textos cortos y grandes** (Geist Pixel, la fuente del juego): c4–c6, una o dos palabras.
- **Música**: la del tráiler, remontada (sin componer nada nuevo): el montaje en accelerando,
  el corte a silencio, el pedal del cobrador, el platillo al revés de la palanca y el golpe
  del logo. Efectos: los del tráiler y los del juego (palanca, sello, tictac, ficha).
- **Sonoridad**: como el tráiler: −16 LUFS integrados, picos (también el real) por debajo de
  −1 dBFS.

## Planos

| # | Tiempo | Plano (material) | Texto | Sonido |
|---|---|---|---|---|
| **01** | **0:00,0–0:09,65** | **Las apuestas** · música: el montaje del tráiler (132→168 negras) | | |
| 1a | 0:00,0–0:01,35 | **Gancho.** Carretes girando a ×6; caen cinco sietes uno tras otro | **¿TE LA / JUGÁS?** (c6, arriba) desde el primer fotograma hasta el cartel | palanca + tiempo fuerte |
| 1b | 0:01,35–0:01,78 | La tragamonedas entera (×3): cartel **GANASTE ₡210k** y lluvia de monedas | | máquina |
| 1c | 0:01,78–0:02,64 | Ruleta: la bola cae en el **2 NEGRO** (no había fichas ahí) | | ruleta |
| 1d | 0:02,64–0:03,49 | Caballos: la repetición cenital, **final de foto** cruzando la línea de meta (×6) | | carrera |
| 1e | 0:03,49–0:04,31 | Tarjeta del HUD a ×6: la plata sube (₡50.600 → ₡125.600 → ₡335.600) | **GANÁS.** (oro) | |
| 1f | 0:04,31–0:05,12 | Blackjack a ×6: 16, pide, la carta llega boca abajo, se voltea: **un rey** | **PERDÉS.** | cartas |
| 1g | 0:05,12–0:09,65 | Un corte por tiempo, cada vez más rápido: monedas, ruleta, HUD, caballos a cámara lenta, reparto, HUD (₡665.600), carretes, GANASTE en la carrera, HUD (₡1.315.600), los sietes otra vez, la palanca baja, el reloj volando | **UNA MÁS.** (c5) y **UNA MÁS.** (c6, rojo, hasta el corte) | cada mesa, bajo |
| **02** | **0:09,65–0:11,40** | **La deuda** · corte en seco a silencio | | |
| 2 | | El préstamo de la intro, a ×6: ₡500 / **₡88.888.000** / RAZONABLE; cae el sello **APROBADO** | **DEBÉS / ₡88.888.000** (rojo) con el golpe del sello | golpe del sello |
| **03** | **0:11,40–0:13,05** | **El reloj** · silencio | | |
| 3 | | Tarjeta del HUD a ×6: 0:04, 0:03, 0:02, 0:01, **0:00** en rojo, parpadea | **150 SEGUNDOS / AL DÍA.** | tic, tac, tic, tac |
| **04** | **0:13,05–0:15,25** | **El cobrador** · el pedal grave del tráiler | | |
| 4 | | La puerta a ×6 se entreabre; en la rendija, la calva y las gafas con un brillo. No entra | **Y ÉL SIEMPRE / LLEGA.** (arriba) | puerta |
| **05** | **0:15,25–0:17,25** | **¿Solo una más?** · platillo al revés y tictac de carrete | | |
| 5 | | La tragamonedas a ×6, la palanca a la derecha; al final tira otra vez y los carretes echan a girar… **corte antes del resultado** | **¿SOLO / UNA MÁS?** | palanca, carretes |
| **06** | **0:17,25–0:23,95** | **El cierre** · el golpe del logo (La-9) y un tictac suave | | |
| 6 | | Fachada del león en vertical, velada. Fogonazo, la ficha del logo gira y frena; el título de golpe. Se queda quieto hasta el final (no funde a negro) | **JUST ONE / MORE BET** (oro) · **¿CUÁNTOS DÍAS / AGUANTÁS?** · botón **JUGALO GRATIS** · **TOCÁ EL LINK ↓** · *hueco limpio para el sticker* (y 1110–1404) · **+18 · APUESTAS SIMULADAS / SIN DINERO REAL** | ficha, tictac |

## Material (planos grabados para el teaser)

Los graba `tools/trailer/teaser_shots.gd` del repo del juego (`npm run teaser:capture -- all`),
con los mismos directores que el tráiler y la composición de móvil:

| Plano | Qué | Usado en |
|---|---|---|
| `ig_slots` | Cinco sietes a ×5 y GANASTE con monedas (semilla 7) | 1a, 1b, 1g |
| `ig_ruleta` | Tres fichas y la bola en el 2 | 1c, 1g |
| `ig_caballos` | Llegada a cámara lenta, repetición cenital y GANASTE | 1d, 1g |
| `ig_hud` | La tarjeta del HUD: reloj volando, plata a golpes, acciones a cero | 1e, 1g |
| `ig_blackjack` | 16, pide, la carta se voltea: rey | 1f, 1g |
| `ig_palanca` | La palanca quieta y, al final, tira | 1g, 5 |
| `ig_firma` | El cheque del préstamo y el sello APROBADO | 2 |
| `ig_reloj` | El reloj de 0:04 a 0:00 | 3 |
| `ig_cobrador` | La puerta entreabierta y el cobrador | 4 |
| `ig_parqueo` | La fachada del león (fondo del cierre: `img/fachada_vertical.png`) | 6 |
