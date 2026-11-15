"""
Build src/data/lithology.json from the GLiM 0.5 degree raster (Hartmann & Moosdorf 2012).

Usage:
  python3 artifacts/analog-finder/scripts/build_lithology.py <path to glim_wgs84_0point5deg.txt.asc>

The raster comes from https://doi.org/10.1594/PANGAEA.788537 (CC-BY-3.0); it is in the
Terrestrial_Analog_Data pack at raw/earth/glim/hartmann-moosdorf_2012.zip. The raw file is not
committed; only this small derived JSON is.

What the output is, and is not:
- For each Earth site in src/data/sites.ts: the GLiM class of the 0.5 degree pixel that contains the
  app's own coordinate, plus the class counts of the 3x3 pixel block around it (about +/-55 km).
- For each 4 degree grid-cell centre: the class of the pixel containing the centre.
- Broad regional context only. It does not add or prove geology tags and is not used in any score.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITES_TS = HERE.parent / "src/data/sites.ts"
OUT = HERE.parent / "src/data/lithology.json"
CELL_SIZE_DEG = 4  # must match CELL_SIZE_DEG in artifacts/api-server/src/lib/grid-job.ts

CLASSES = {
    1: ("su", "Unconsolidated sediments"),
    2: ("vb", "Basic volcanic rocks"),
    3: ("ss", "Siliciclastic sedimentary rocks"),
    4: ("pb", "Basic plutonic rocks"),
    5: ("sm", "Mixed sedimentary rocks"),
    6: ("sc", "Carbonate sedimentary rocks"),
    7: ("va", "Acid volcanic rocks"),
    8: ("mt", "Metamorphic rocks"),
    9: ("pa", "Acid plutonic rocks"),
    10: ("vi", "Intermediate volcanic rocks"),
    11: ("wb", "Water bodies"),
    12: ("py", "Pyroclastics"),
    13: ("pi", "Intermediate plutonic rocks"),
    14: ("ev", "Evaporites"),
    15: ("nd", "No data"),
    16: ("ig", "Ice and glaciers"),
}


def read_asc(path: Path):
    lines = path.read_text().splitlines()
    head = {}
    for i in range(6):
        k, v = lines[i].split()
        head[k.lower()] = float(v)
    assert head["cellsize"] == 0.5 and head["xllcorner"] == -180 and head["yllcorner"] == -90, head
    ncols, nrows, nodata = int(head["ncols"]), int(head["nrows"]), int(head["nodata_value"])
    grid = [[int(float(x)) for x in row.split()] for row in lines[6 : 6 + nrows]]
    assert len(grid) == nrows and all(len(r) == ncols for r in grid)
    return grid, nodata


def pixel(grid, lat: float, lon: float):
    row = min(len(grid) - 1, max(0, int((90 - lat) // 0.5)))
    col = min(len(grid[0]) - 1, max(0, int((lon + 180) // 0.5)))
    return row, col


def code_at(grid, nodata, row, col):
    v = grid[row][col % len(grid[0])] if 0 <= row < len(grid) else nodata
    if v == nodata or v not in CLASSES or v == 15:
        return None
    return CLASSES[v][0]


def earth_sites():
    text = SITES_TS.read_text()
    out = []
    for m in re.finditer(r'id: "(earth-[^"]+)",[\s\S]*?lat: (-?[\d.]+),\s*lon: (-?[\d.]+),', text):
        out.append((m.group(1), float(m.group(2)), float(m.group(3))))
    return out


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    grid, nodata = read_asc(Path(sys.argv[1]))

    sites = {}
    for sid, lat, lon in earth_sites():
        r, c = pixel(grid, lat, lon)
        block = Counter(code_at(grid, nodata, r + dr, c + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1))
        block.pop(None, None)
        sites[sid] = {
            "lat": lat,
            "lon": lon,
            "classAtPoint": code_at(grid, nodata, r, c),
            "block3x3": dict(block.most_common()),
        }
    assert len(sites) >= 20, f"only {len(sites)} Earth sites parsed from sites.ts"

    cells = {}
    half = CELL_SIZE_DEG / 2
    lat = -90 + half
    while lat < 90:
        lon = -180 + half
        while lon < 180:
            code = code_at(grid, nodata, *pixel(grid, lat, lon))
            if code:
                cells[f"{lat:g},{lon:g}"] = code
            lon += CELL_SIZE_DEG
        lat += CELL_SIZE_DEG

    OUT.write_text(
        json.dumps(
            {
                "source": "GLiM global lithological map, Hartmann & Moosdorf (2012), 0.5 degree raster",
                "url": "https://doi.org/10.1594/PANGAEA.788537",
                "license": "CC-BY-3.0",
                "resolutionDeg": 0.5,
                "note": "Class of the 0.5 degree pixel containing the point. Regional context only; not a site geology map and not used in scoring.",
                "classes": {code: name for code, name in CLASSES.values()},
                "sites": sites,
                "cells": cells,
            },
            separators=(",", ":"),
        )
    )
    print(f"wrote {OUT} with {len(sites)} sites and {len(cells)} grid cells")


if __name__ == "__main__":
    main()
