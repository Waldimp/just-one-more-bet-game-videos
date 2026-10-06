/*
 * Ayudas comunes de las escenas del trailer. Sin estado propio: todo se calcula al montar
 * la escena y se apunta en la linea de tiempo de GSAP, que es lo unico que avanza.
 *
 * Depende de dos archivos GENERADOS por `npm run sync` (no se editan a mano):
 *   shared/js/cues.js   -> window.TRAILER_CUES   (de audio/trailer_cues.json, la musica)
 *   shared/js/texts.js  -> window.TRAILER_TEXTS  (de texts/es.json y texts/en.json)
 *
 * El idioma lo elige la variable `lang` de cada escena (`es` por defecto); `render` la pasa
 * con --variables.
 */
(function () {
  const T = (window.TRAILER = window.TRAILER || {});

  /** Lado de un pixel del juego en el video. */
  T.PX = 3;

  T.lang = function () {
    const api = window.__hyperframes;
    const vars = api && api.getVariables ? api.getVariables() : {};
    return vars && vars.lang ? vars.lang : "es";
  };

  /** Los textos de una escena en el idioma activo. */
  T.texts = function (scene) {
    const all = window.TRAILER_TEXTS || {};
    const lang = all[T.lang()] ? T.lang() : "es";
    return (all[lang] && all[lang][scene]) || {};
  };

  /** Rellena cada `[data-t="clave"]` con su texto. */
  T.fill = function (scene, root) {
    const texts = T.texts(scene);
    (root || document).querySelectorAll("[data-t]").forEach(function (el) {
      const key = el.getAttribute("data-t");
      if (texts[key] !== undefined) el.textContent = texts[key];
    });
    return texts;
  };

  /** La entrada de la hoja de cortes de una escena: inicio, duracion y tiempos. */
  T.cue = function (scene) {
    const cues = window.TRAILER_CUES || { scenes: [] };
    return cues.scenes.find(function (s) {
      return s.id === scene;
    });
  };

  /** Segundo (relativo a la escena) del tiempo `i`. Fracciones: 2.5 = la corchea. */
  T.beat = function (scene, i) {
    const beats = T.cue(scene).beats;
    const k = Math.floor(i);
    const f = i - k;
    if (f === 0 || k + 1 >= beats.length) return beats[Math.min(k, beats.length - 1)];
    return beats[k] + (beats[k + 1] - beats[k]) * f;
  };

  /** Al multiplo de 3 px mas cercano. */
  T.snap = function (v) {
    return Math.round(v / T.PX) * T.PX;
  };

  /**
   * Centra en horizontal un texto absoluto sobre `cx`, en la rejilla de 3 px. Centrar con CSS
   * puede dejar el texto a medio pixel y la letra pixelada sale borrosa.
   */
  T.center = function (el, cx) {
    const w = el.getBoundingClientRect().width;
    el.style.left = T.snap(cx - w / 2) + "px";
    return el;
  };

  /** Parte un texto en una letra por <span> (una vez, al montar). */
  T.split = function (el) {
    if (el.dataset.split) return el.querySelectorAll(".ch");
    const text = el.textContent;
    el.textContent = "";
    for (const c of Array.from(text)) {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = c;
      el.appendChild(span);
    }
    el.dataset.split = "1";
    return el.querySelectorAll(".ch");
  };

  /**
   * Maquina de escribir con saltos, como la narracion de la intro del juego: cada letra
   * aparece de golpe en su instante. `cps` letras por segundo. Devuelve cuando acaba.
   */
  T.type = function (tl, el, at, cps) {
    const chars = T.split(el);
    const step = 1 / (cps || 32);
    chars.forEach(function (ch, i) {
      tl.set(ch, { opacity: 1 }, at + i * step);
    });
    return at + chars.length * step;
  };

  /** Todo el texto de golpe en `at` (para los textos que caen con un golpe de musica). */
  T.slam = function (tl, el, at) {
    const chars = T.split(el);
    tl.set(chars, { opacity: 1 }, at);
    return at;
  };

  /** Oculta de golpe en `at`, el elemento y sus letras. Todo se oculta con opacidad (ver
   *  `.ch` en trailer.css). */
  T.hide = function (tl, el, at) {
    const targets = [el].concat(Array.from(el.querySelectorAll(".ch")));
    tl.set(targets, { opacity: 0 }, at);
  };

  /** Temblor de golpe: dos pixeles de juego, cuatro fotogramas, y quieto. */
  T.jolt = function (tl, el, at, px) {
    const d = (px || 2) * T.PX;
    const f = 1 / 60;
    tl.set(el, { x: d, y: -T.PX }, at);
    tl.set(el, { x: -d, y: T.PX }, at + 2 * f);
    tl.set(el, { x: T.PX, y: 0 }, at + 4 * f);
    tl.set(el, { x: 0, y: 0 }, at + 6 * f);
  };

  /** Fundido en escalones (4 por defecto), como los fundidos de paleta de los juegos. */
  T.stepFade = function (tl, el, from, to, at, dur, steps) {
    tl.fromTo(
      el,
      { opacity: from },
      { opacity: to, duration: dur, ease: "steps(" + (steps || 4) + ")" },
      at
    );
  };

  /**
   * Pase de carrete: cinco carretes de tragamonedas que bajan girando y tapan el cuadro.
   * `mode` "in" entra y tapa al final de una escena; "out" destapa al empezar la siguiente.
   * Los simbolos son los del juego, a x6 (dos pixeles de video por pixel de juego, x3 del
   * juego), y cada carrete va a su velocidad.
   */
  T.reelPass = function (tl, root, mode, at, dur) {
    const symbols = ["seven", "bar", "bell", "cherry", "grape", "lemon", "watermelon"];
    // Medidas de los simbolos del juego, en pixeles de su PNG: se pintan a x6 exacto.
    const sizes = {
      seven: [26, 26], bar: [28, 14], bell: [28, 28], cherry: [25, 27],
      grape: [32, 32], lemon: [28, 25], watermelon: [32, 32],
    };
    const pass = document.createElement("div");
    pass.className = "reelpass";
    const strips = [];
    for (let c = 0; c < 5; c++) {
      const col = document.createElement("div");
      col.className = "col";
      const strip = document.createElement("div");
      strip.className = "strip";
      for (let k = 0; k < 14; k++) {
        const name = symbols[(k * 3 + c * 2) % symbols.length];
        const cell = document.createElement("div");
        cell.style.height = "252px";
        cell.style.display = "flex";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";
        const img = document.createElement("img");
        img.src = "shared/img/symbols/" + name + ".png";
        img.style.width = sizes[name][0] * 6 + "px";
        img.style.height = sizes[name][1] * 6 + "px";
        cell.appendChild(img);
        strip.appendChild(cell);
      }
      col.appendChild(strip);
      pass.appendChild(col);
      strips.push(strip);
    }
    root.appendChild(pass);
    const H = 1080;
    // Entrar: el carrete baja desde arriba hasta tapar. Salir: sigue bajando y destapa.
    const fromY = mode === "in" ? -H : 0;
    const toY = mode === "in" ? 0 : H;
    if (mode === "in") tl.set(pass, { opacity: 1 }, at);
    strips.forEach(function (strip, i) {
      tl.fromTo(
        pass.children[i],
        { y: fromY },
        { y: toY, duration: dur, ease: "steps(" + Math.max(2, Math.round(dur * 60)) + ")" },
        at
      );
      // Los simbolos giran dentro del carrete: el desplazamiento cae en la rejilla.
      tl.fromTo(
        strip,
        { y: -T.snap(240 * i) },
        {
          y: -T.snap(240 * i + 1300),
          duration: dur,
          ease: "steps(" + Math.max(2, Math.round(dur * 60)) + ")",
        },
        at
      );
    });
    if (mode === "out") tl.set(pass, { opacity: 0 }, at + dur);
    else tl.set(pass, { opacity: 0 }, 0);
    if (mode === "out") tl.set(pass, { opacity: 1 }, 0);
    return pass;
  };

  /**
   * Caja de interfaz con varias lineas que aparecen de una en una: el ancho se fija al de la
   * linea mas larga (asi no se descentra al crecer) y las lineas que aun no tocan no ocupan
   * sitio: la caja crece hacia abajo, como un globo de dialogo. `at` de cada linea en segundos.
   */
  T.growBox = function (tl, box, cx, top, ats) {
    box.style.top = top + "px";
    const w = box.getBoundingClientRect().width;
    box.style.width = T.snap(w) + "px";
    box.style.left = T.snap(cx - w / 2) + "px";
    const lines = box.querySelectorAll(".line");
    tl.set(box, { opacity: 0 }, 0);
    tl.set(box, { opacity: 1 }, ats[0]);
    lines.forEach(function (line, i) {
      if (i > 0) {
        tl.set(line, { display: "none" }, 0);
        tl.set(line, { display: "block" }, ats[i]);
      }
    });
    return lines;
  };

  /** Formato de dinero de la escena: simbolo y separador de miles del idioma. */
  T.money = function (amount, sep) {
    const digits = String(Math.floor(Math.abs(amount)));
    let out = "";
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) out += sep;
      out += digits[i];
    }
    return "₡" + out;
  };
})();
