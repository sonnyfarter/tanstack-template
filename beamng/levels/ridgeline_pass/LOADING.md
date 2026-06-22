# Loading Ridgeline Pass

This build is **pre-baked** — the terrain binary (`theTerrain.ter`) and
placeholder terrain textures are already included, so the map loads straight into
a drivable mountain. There is **no in-editor import step**.

## Install (two steps, ~30 seconds)

1. Put `ridgeline_pass.zip` in your BeamNG **mods** folder. In BeamNG:
   **Options → Misc → Open user folder**, open the highest version number folder
   (e.g. `0.36`), then `mods` (create it if missing):
   ```
   …\BeamNG.drive\0.36\mods\ridgeline_pass.zip
   ```
   **Do not unzip it** — BeamNG reads the zip directly.
2. Launch BeamNG → **Singleplayer / Freeroam** → pick **Ridgeline Pass** → load.

That's it. You spawn at the Trailhead in the valley; the gravel pass runs the
length of the central valley and a branch trail climbs to the summit overlook.
Pick a different start from the spawn-point menu (Trailhead / Summit Overlook /
Valley Floor).

## What it looks like

The terrain is green grass with grey rock on the steep faces (placeholder
textures). Trees and roadside rocks are **not** included yet — the map drives
fine without them; see `art/ASSETS.md` if you want to add real vegetation and
rock meshes, then paint them in the Forest Editor.

---

## Fallback: if the terrain ever looks wrong

The baked terrain was generated to BeamNG's documented `.ter` v9 format but
authored outside the game, so if a future BeamNG version reads it differently
(flat ground, wrong height, or void), you can rebuild terrain from the bundled
heightmap in ~1 minute:

1. Load the level, press **F11** → **Window → Terrain Importer**.
2. Heightmap: `ridgeline_pass_heightmap.png`; **Size 1024**, **Square 2.0**,
   **Max Height 380**; add the materials from
   `art/terrains/ridgeline_pass.terrain.json`; **Import**, then **Ctrl+S**.

## Troubleshooting

- **Not in the level list:** the zip must be directly in `…/<version>/mods/`
  (not unzipped, not nested). Re-check the path and relaunch.
- **Car falls through / void:** see the fallback import above.
- **Everything flat grey:** the terrain materials didn't resolve — open the
  Terrain Painter and assign any stock material, or run the fallback import.
