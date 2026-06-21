#!/usr/bin/env python3
"""
Procedural heightmap generator for the BeamNG.drive level "Ridgeline Pass".

Produces a 16-bit grayscale PNG that can be imported directly through the
BeamNG World Editor ("Terrain Importer" -> Heightmap). The output is a ridged
multifractal field shaped into a mountain basin with a carved valley running
through the middle, giving natural off-road trails up the ridges.

Pure standard library only (struct + zlib + math) so it runs anywhere with
Python 3.8+. No numpy / Pillow required.

Usage:
    python3 generate_heightmap.py [--size 1024] [--seed 1337] \
        [--out ../levels/ridgeline_pass/ridgeline_pass_heightmap.png]
"""

from __future__ import annotations

import argparse
import math
import os
import struct
import zlib

# Default to the level folder next to this script.
_DEFAULT_OUT = os.path.normpath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "levels",
        "ridgeline_pass",
        "ridgeline_pass_heightmap.png",
    )
)


def _build_permutation(seed: int) -> list[int]:
    """Deterministic Fisher-Yates shuffle of 0..255, doubled for wrapping."""
    perm = list(range(256))
    state = seed & 0xFFFFFFFF
    for i in range(255, 0, -1):
        # xorshift32 PRNG keeps this dependency-free and reproducible.
        state ^= (state << 13) & 0xFFFFFFFF
        state ^= state >> 17
        state ^= (state << 5) & 0xFFFFFFFF
        j = state % (i + 1)
        perm[i], perm[j] = perm[j], perm[i]
    return perm + perm


def _fade(t: float) -> float:
    return t * t * t * (t * (t * 6 - 15) + 10)


def _lerp(a: float, b: float, t: float) -> float:
    return a + t * (b - a)


def _grad(h: int, x: float, y: float) -> float:
    # 8 gradient directions is plenty for terrain.
    g = h & 7
    u = x if g < 4 else y
    v = y if g < 4 else x
    return (u if (g & 1) == 0 else -u) + (v if (g & 2) == 0 else -v)


def _perlin(perm: list[int], x: float, y: float) -> float:
    xi = int(math.floor(x)) & 255
    yi = int(math.floor(y)) & 255
    xf = x - math.floor(x)
    yf = y - math.floor(y)
    u = _fade(xf)
    v = _fade(yf)
    aa = perm[perm[xi] + yi]
    ab = perm[perm[xi] + yi + 1]
    ba = perm[perm[xi + 1] + yi]
    bb = perm[perm[xi + 1] + yi + 1]
    x1 = _lerp(_grad(aa, xf, yf), _grad(ba, xf - 1, yf), u)
    x2 = _lerp(_grad(ab, xf, yf - 1), _grad(bb, xf - 1, yf - 1), u)
    return _lerp(x1, x2, v)  # roughly [-1, 1]


def _ridged_fbm(perm: list[int], x: float, y: float, octaves: int) -> float:
    """Ridged multifractal — gives sharp mountain crests instead of rolling hills."""
    total = 0.0
    freq = 1.0
    amp = 0.5
    weight = 1.0
    for _ in range(octaves):
        n = _perlin(perm, x * freq, y * freq)
        n = 1.0 - abs(n)      # fold to create ridges
        n *= n                # sharpen crests
        n *= weight
        weight = max(0.0, min(1.0, n * 2.0))  # feedback so detail clings to ridges
        total += n * amp
        freq *= 2.0
        amp *= 0.5
    return total  # roughly [0, 1]


def generate(size: int, seed: int) -> bytes:
    """Return raw 16-bit big-endian heightmap rows (PNG scanline layout)."""
    perm = _build_permutation(seed)
    half = size / 2.0
    inv = 4.0 / size  # world-noise frequency scale

    rows = bytearray()
    for y in range(size):
        # PNG needs a filter byte (0 = none) at the start of each scanline.
        rows.append(0)
        ny = y * inv
        dy = (y - half) / half
        for x in range(size):
            nx = x * inv
            dx = (x - half) / half

            # Base mountain mass from ridged fBm.
            h = _ridged_fbm(perm, nx, ny, 7)

            # Radial basin: high rim, lower toward the center so the map reads
            # as a bowl-shaped valley ringed by peaks.
            dist = math.sqrt(dx * dx + dy * dy)
            basin = 0.55 + 0.45 * min(1.0, dist)  # 0.55 center -> 1.0 edge
            h *= basin

            # Carve a winding valley/riverbed across the map for the main trail.
            valley_axis = dx + 0.35 * math.sin(dy * 3.0 + 1.5)
            valley = math.exp(-(valley_axis * valley_axis) / 0.015)
            h *= (1.0 - 0.75 * valley)

            # Gentle floor so the valley isn't a knife-edge crevasse.
            h = 0.06 + 0.94 * max(0.0, min(1.0, h))

            v = int(h * 65535)
            v = 0 if v < 0 else (65535 if v > 65535 else v)
            rows += struct.pack(">H", v)
    return bytes(rows)


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path: str, size: int, raw_rows: bytes) -> None:
    sig = b"\x89PNG\r\n\x1a\n"
    # bit depth 16, color type 0 (grayscale).
    ihdr = struct.pack(">IIBBBBB", size, size, 16, 0, 0, 0, 0)
    idat = zlib.compress(raw_rows, 9)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(sig)
        fh.write(_png_chunk(b"IHDR", ihdr))
        fh.write(_png_chunk(b"IDAT", idat))
        fh.write(_png_chunk(b"IEND", b""))


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate Ridgeline Pass heightmap.")
    ap.add_argument("--size", type=int, default=1024, help="terrain resolution (power of 2)")
    ap.add_argument("--seed", type=int, default=1337, help="noise seed")
    ap.add_argument("--out", default=_DEFAULT_OUT, help="output PNG path")
    args = ap.parse_args()

    if args.size & (args.size - 1) != 0:
        raise SystemExit("--size must be a power of two (256, 512, 1024, 2048).")

    print(f"Generating {args.size}x{args.size} heightmap (seed {args.seed})...")
    raw = generate(args.size, args.seed)
    write_png(args.out, args.size, raw)
    print(f"Wrote {args.out} ({os.path.getsize(args.out)} bytes)")


if __name__ == "__main__":
    main()
