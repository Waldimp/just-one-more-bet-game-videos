"""Fuente del trailer: Geist Pixel fija en su estilo "Regular", con los glifos que le faltan.

Por que existe
--------------
Geist Pixel (la fuente del juego, OFL) es variable y NO trae tres glifos que el trailer
necesita: el colon (U+20A1, la moneda del juego) y los cuadros de acciones del HUD (U+25A0,
U+25A1). Si el navegador no los encuentra, los pinta con otra fuente y se rompe la rejilla
de pixeles justo en la cifra de la deuda.

Que hace
--------
1. Fija el eje ELSH en 0 (el estilo "Regular": cuadrados).
2. Dibuja los glifos que faltan con la MISMA celda que el resto (38 unidades de 1000; los
   trazos son de 2 celdas):
   - ₡: la "C" mas dos trazos verticales que la atraviesan, como el "$" de la fuente.
   - ■ y □: un cuadro de 12 celdas a la altura de la x.
3. Cambia el nombre de la familia a "Geist Pixel Trailer" (la OFL lo permite y pide no
   confundir una version modificada con la original) y deja la licencia al lado.

Correr (necesita fontTools):
    python tools/build_font.py ../just-one-more-bet/assets/fonts/Geist_Pixel.zip

Escribe shared/fonts/GeistPixelTrailer.ttf y shared/fonts/OFL.txt.
"""

from __future__ import annotations

import io
import json
import os
import sys
import zipfile

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

CELL = 38
FAMILY = "Geist Pixel Trailer"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "shared", "fonts")
VARIABLE_NAME = "GeistPixel-Regular-VariableFont_ELSH.ttf"


def cells_of(font: TTFont, name: str) -> set[tuple[int, int]]:
    glyf = font["glyf"]
    coords, ends, _flags = glyf[name].getCoordinates(glyf)
    cells = set()
    start = 0
    for end in ends:
        pts = coords[start : end + 1]
        start = end + 1
        cells.add((round(min(p[0] for p in pts) / CELL), round(min(p[1] for p in pts) / CELL)))
    return cells


def draw_cells(cells: set[tuple[int, int]]) -> object:
    """Glifo hecho de celdas cuadradas de 38 unidades, como las de la fuente. (Las de la
    fuente redondean la esquina 5 unidades: menos de medio pixel a cualquier tamano del
    trailer, asi que un cuadrado limpio no se distingue.)"""
    pen = TTGlyphPen(None)
    for cx, cy in sorted(cells):
        x0, y0 = cx * CELL, cy * CELL
        pen.moveTo((x0, y0))
        pen.lineTo((x0, y0 + CELL))
        pen.lineTo((x0 + CELL, y0 + CELL))
        pen.lineTo((x0 + CELL, y0))
        pen.closePath()
    return pen.glyph()


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("uso: python tools/build_font.py <ruta a Geist_Pixel.zip>")
    with zipfile.ZipFile(sys.argv[1]) as archive:
        variable = TTFont(io.BytesIO(archive.read(VARIABLE_NAME)))
        ofl = archive.read("OFL.txt")
    font = instancer.instantiateVariableFont(variable, {"ELSH": 0})
    c_cells = cells_of(font, "C")
    colon = set(c_cells)
    for column in (6, 7, 10, 11):
        for row in range(-2, 21):
            colon.add((column, row))
    square = {(x, y) for x in range(2, 14) for y in range(0, 12)}
    hollow = {(x, y) for (x, y) in square if x in (2, 3, 12, 13) or y in (0, 1, 10, 11)}

    additions = {
        "colonsign": (0x20A1, colon, font["hmtx"]["C"][0]),
        "filledbox": (0x25A0, square, 16 * CELL),
        "whitebox": (0x25A1, hollow, 16 * CELL),
    }
    order = font.getGlyphOrder()
    for name, (codepoint, cells, advance) in additions.items():
        glyph = draw_cells(cells)
        font["glyf"][name] = glyph
        if name not in order:
            order.append(name)
        font["hmtx"][name] = (advance, CELL * 2)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[codepoint] = name
    font.setGlyphOrder(order)
    font["glyf"].glyphOrder = order
    font["maxp"].numGlyphs = len(order)

    names = font["name"]
    for record in list(names.names):
        if record.nameID in (1, 4, 16, 21):
            names.setName(FAMILY if record.nameID in (1, 16, 21) else FAMILY + " Regular",
                          record.nameID, record.platformID, record.platEncID, record.langID)
        elif record.nameID == 6:
            names.setName("GeistPixelTrailer-Regular", 6, record.platformID,
                          record.platEncID, record.langID)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "GeistPixelTrailer.ttf")
    font.save(out)
    with open(os.path.join(OUT_DIR, "OFL.txt"), "wb") as handle:
        handle.write(ofl)
    # Lista de lo que la fuente sabe dibujar: `npm run sync` comprueba contra ella que ningun
    # texto de texts/*.json use un caracter que el navegador tendria que sacar de otra fuente.
    codepoints = sorted(font.getBestCmap().keys())
    with open(os.path.join(OUT_DIR, "glyphs.json"), "w", encoding="utf-8") as handle:
        json.dump(codepoints, handle)
    print("escrito %s (%d glifos)" % (os.path.normpath(out), len(order)))


if __name__ == "__main__":
    main()
