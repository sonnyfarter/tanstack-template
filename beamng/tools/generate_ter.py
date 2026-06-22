#!/usr/bin/env python3
"""
Bake a BeamNG.drive terrain binary (theTerrain.ter, format version 9) for
"Ridgeline Pass", so the level loads with terrain immediately — no in-editor
heightmap import required.

Binary layout (little-endian), verified against the mapng exportTer
implementation and a real BeamNG TerrainBlock:

    U8   version            = 0x09
    U32  size               (square terrain dimension, power of two)
    U16  height[size*size]   row-major, FIRST row = south edge (y flipped)
    U8   layer[size*size]    material index per cell (0 = first material)
    U32  materialCount
    repeat materialCount:
        U8  nameLen          (or 0xFF then U16 nameLen for >=255)
        ..  name bytes (UTF-8)

Height encoding: BeamNG stores terrain height as fixed-point 1/32 m per unit,
so a world height of H metres -> U16 round(H / 0.03125) == round(H * 32).
With MAX_HEIGHT = 380 the tallest peak stores 12160, well under 65535.

The height field is evaluated in WORLD coordinates using the exact same
ridged-fbm + basin + sinusoidal-valley formula as generate_heightmap.py and the
road layout, so the gravel pass and spawns sit in the carved valley.

Pure standard library. Run:  python3 generate_ter.py
"""

from __future__ import annotations

import argparse
import math
import os
import struct

import generate_heightmap as gh  # reuse the noise + ridged-fbm helpers

# World layout — must match items.level.json (TerrainBlock squareSize/position).
SIZE = 1024            # terrain grid resolution
SQUARE = 2             # metres per cell -> 2048 m span
HALF = SIZE * SQUARE / 2.0   # 1024 m, terrain centered on origin
MAX_HEIGHT = 380.0     # metres at full height
FIXED = 0.03125        # BeamNG terrain fixed-point step (1/32 m)

# Layer 0 is painted everywhere until the user paints in the editor.
MATERIALS = ["alpine_grass", "mountain_dirt", "gravel_pass", "rock_cliff"]

_DEFAULT_OUT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "levels", "ridgeline_pass", "theTerrain.ter")
)


def _height_norm(perm, world_x: float, world_y: float) -> float:
    """Normalised height [0..1] at a world position (mirrors generate_heightmap)."""
    # Map world -> the same noise/space the PNG generator used.
    px = world_x / SQUARE + SIZE / 2.0
    py = world_y / SQUARE + SIZE / 2.0
    inv = 4.0 / SIZE
    nx, ny = px * inv, py * inv

    dx = world_x / HALF
    dy = world_y / HALF

    h = gh._ridged_fbm(perm, nx, ny, 7)

    dist = math.sqrt(dx * dx + dy * dy)
    basin = 0.55 + 0.45 * min(1.0, dist)
    h *= basin

    valley_axis = dx + 0.35 * math.sin(dy * 3.0 + 1.5)
    valley = math.exp(-(valley_axis * valley_axis) / 0.015)
    h *= (1.0 - 0.75 * valley)

    return 0.06 + 0.94 * max(0.0, min(1.0, h))


def build(size: int, seed: int) -> bytes:
    perm = gh._build_permutation(seed)
    buf = bytearray()
    buf += struct.pack("B", 9)                 # version
    buf += struct.pack("<I", size)             # size

    # Heights: south row first (row 0 = world_y = -HALF), west -> east.
    scale = 1.0 / FIXED  # == 32
    for row in range(size):                     # 0 = south
        world_y = -HALF + (row + 0.5) * SQUARE
        for col in range(size):                 # 0 = west
            world_x = -HALF + (col + 0.5) * SQUARE
            metres = _height_norm(perm, world_x, world_y) * MAX_HEIGHT
            val = int(round(metres * scale))
            if val < 0:
                val = 0
            elif val > 65535:
                val = 65535
            buf += struct.pack("<H", val)

    # Layer map: all zeros -> MATERIALS[0] everywhere.
    buf += bytes(size * size)

    # Material name list.
    buf += struct.pack("<I", len(MATERIALS))
    for name in MATERIALS:
        b = name.encode("utf-8")
        if len(b) < 255:
            buf += struct.pack("B", len(b))
        else:
            buf += struct.pack("B", 0xFF) + struct.pack("<H", len(b))
        buf += b

    return bytes(buf)


def main() -> None:
    ap = argparse.ArgumentParser(description="Bake Ridgeline Pass terrain .ter")
    ap.add_argument("--size", type=int, default=SIZE)
    ap.add_argument("--seed", type=int, default=1337)
    ap.add_argument("--out", default=_DEFAULT_OUT)
    args = ap.parse_args()

    print(f"Baking {args.size}x{args.size} terrain (seed {args.seed}, max {MAX_HEIGHT} m)...")
    data = build(args.size, args.seed)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "wb") as fh:
        fh.write(data)
    print(f"Wrote {args.out} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
