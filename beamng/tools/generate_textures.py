#!/usr/bin/env python3
"""
Generate simple tiling placeholder terrain textures (8-bit RGB PNG) for
Ridgeline Pass, so the baked terrain renders with believable colour instead of
flat grey before the user drops in real art.

Pure standard library (struct + zlib + math). Run: python3 generate_textures.py
"""

from __future__ import annotations

import math
import os
import struct
import zlib

import generate_heightmap as gh

OUT_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "levels", "ridgeline_pass", "art", "terrains")
)

# (filename, base RGB, secondary RGB, grain strength)
TEXTURES = [
    ("t_alpine_grass.color.png", (78, 104, 56), (96, 120, 66), 16),
    ("t_dirt.color.png",         (110, 86, 60), (128, 102, 72), 18),
    ("t_gravel.color.png",       (122, 120, 114), (140, 138, 130), 22),
    ("t_rock.color.png",         (96, 92, 86), (118, 112, 104), 20),
]


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def _write_rgb_png(path: str, size: int, pixels: bytes) -> None:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit, RGB
    rows = bytearray()
    stride = size * 3
    for y in range(size):
        rows.append(0)  # filter: none
        rows += pixels[y * stride:(y + 1) * stride]
    with open(path, "wb") as fh:
        fh.write(sig)
        fh.write(_png_chunk(b"IHDR", ihdr))
        fh.write(_png_chunk(b"IDAT", zlib.compress(bytes(rows), 9)))
        fh.write(_png_chunk(b"IEND", b""))


def _make(size: int, base, second, grain, seed) -> bytes:
    perm = gh._build_permutation(seed)
    px = bytearray(size * size * 3)
    freq = 6.0 / size
    for y in range(size):
        for x in range(size):
            # Low-frequency blotch blends base<->secondary colour.
            n = (gh._perlin(perm, x * freq, y * freq) + 1.0) * 0.5  # 0..1
            # High-frequency deterministic grain.
            g = ((x * 73856093) ^ (y * 19349663) ^ seed) & 0xFF
            g = (g / 255.0 - 0.5) * 2.0 * grain
            i = (y * size + x) * 3
            for c in range(3):
                v = base[c] + (second[c] - base[c]) * n + g
                px[i + c] = 0 if v < 0 else (255 if v > 255 else int(v))
    return bytes(px)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    size = 256
    for idx, (name, base, second, grain) in enumerate(TEXTURES):
        data = _make(size, base, second, grain, 1337 + idx * 7)
        out = os.path.join(OUT_DIR, name)
        _write_rgb_png(out, size, data)
        print(f"Wrote {out} ({os.path.getsize(out)} bytes)")


if __name__ == "__main__":
    main()
