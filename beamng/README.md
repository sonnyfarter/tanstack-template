# Ridgeline Pass — BeamNG.drive map

A brand-new off-road **mountain** environment for BeamNG.drive: a 2 km alpine
basin ringed by jagged peaks with a winding gravel pass carved through a central
valley, a branch trail climbing to a summit overlook, three spawn points, golden
"early morning" lighting, and a forest layer ready to paint.

```
beamng/
├── levels/
│   └── ridgeline_pass/
│       ├── info.json                         # level metadata + spawn points
│       ├── theTerrain.ter                    # PRE-BAKED terrain binary (v9) — loads as-is
│       ├── ridgeline_pass_heightmap.png      # 16-bit source heightmap (fallback re-import)
│       ├── ridgeline_pass_preview.png        # level-selector preview
│       ├── main/MissionGroup/items.level.json# scene graph (terrain, lighting, roads, spawns)
│       ├── art/
│       │   ├── terrains/ridgeline_pass.terrain.json  # 4 terrain materials
│       │   ├── terrains/t_*.color.png                # placeholder terrain textures
│       │   ├── shapes/ , skies/                       # optional mesh/texture drop-ins
│       │   └── ASSETS.md
│       └── forest/managedItemData.json       # tree/shrub/boulder defs (optional, paint later)
└── tools/
    ├── generate_heightmap.py                 # (re)generate the source heightmap PNG
    ├── generate_ter.py                       # bake the terrain binary (theTerrain.ter)
    └── generate_textures.py                  # generate placeholder terrain textures
```

## Install — drop-in, no editor step

The terrain is **pre-baked**, so the map loads straight into a drivable mountain.

1. Put `dist/ridgeline_pass.zip` in your BeamNG **mods** folder
   (`…\BeamNG.drive\<version>\mods\ridgeline_pass.zip`) — **don't unzip it**.
   *(Or copy the unpacked `levels/ridgeline_pass` folder into
   `…\<version>\levels\`.)*
2. Launch BeamNG → **Singleplayer / Freeroam** → **Ridgeline Pass** → load.

> 📋 Full step-by-step + troubleshooting:
> [`levels/ridgeline_pass/LOADING.md`](levels/ridgeline_pass/LOADING.md).

## Fallback — re-bake terrain in-editor (only if needed)

The `.ter` was authored to BeamNG's documented v9 format outside the game. If a
BeamNG version ever reads it differently (flat/void terrain), rebuild from the
bundled heightmap in ~1 minute:

1. Load the level, **F11 → Window → Terrain Importer**.
2. **Heightmap:** `ridgeline_pass_heightmap.png`; **Size 1024**, **Square 2.0**,
   **Max Height 380**; add the four materials from
   `art/terrains/ridgeline_pass.terrain.json`; **Import**, then **Ctrl+S**.

## Reshape / regenerate the terrain

All three are pure-Python (no numpy/Pillow). To reshape the mountain, change the
seed and rebuild the heightmap, the baked terrain, and the preview together:

```bash
python3 tools/generate_heightmap.py --size 1024 --seed 1337   # source heightmap
python3 tools/generate_ter.py       --size 1024 --seed 1337   # baked theTerrain.ter
python3 tools/generate_textures.py                            # placeholder textures
```

`generate_ter.py` and the valley curve in `items.level.json` use the **same**
world-space formula, so with the default seed the gravel pass and spawns stay in
the carved valley. Change the seed and you'll want to re-snap the roads (select
them, **Edit → Drop to ground**) in the editor.

## Finishing touches (optional)

- **Paint terrain:** Terrain Painter — gravel along the pass, dirt on the ridges,
  rock on the steep cliff faces (the `rock_cliff` material side-projects on
  slopes), grass on the valley floor. Replace the `t_*.color.png` placeholders
  with real PBR textures for a finished look.
- **Forest / rocks:** drop tree and rock `.dae` meshes in per
  `art/ASSETS.md`, then add a `Forest` object and paint vegetation in the Forest
  Editor (item defs are ready in `forest/managedItemData.json`). These were left
  out of the shipped scene so the map loads with zero missing-asset errors.
- **Previews:** replace `ridgeline_pass_preview.png` with an in-game screenshot.

## Packaging as a mod zip

Zip so that `levels/…` is at the **root** of the archive:

```bash
cd beamng
zip -r ridgeline_pass.zip levels/ridgeline_pass
```

Place `ridgeline_pass.zip` in `…\BeamNG.drive\<version>\mods\` and enable it in
the in-game Mod Manager.

## Scene contents at a glance

| Object            | Class        | Purpose                                  |
|-------------------|--------------|------------------------------------------|
| `theLevelInfo`    | LevelInfo    | gravity, fog, view distance              |
| `tod` / `sunsky`  | TimeOfDay / ScatterSky | golden early-morning lighting  |
| `theTerrain`      | TerrainBlock | pre-baked terrain (`theTerrain.ter`)      |
| `spawn_trailhead` | SpawnSphere  | default spawn, mid-valley                 |
| `spawn_summit`    | SpawnSphere  | ridge overlook                            |
| `spawn_valley`    | SpawnSphere  | valley floor                              |
| `pass_main`       | DecalRoad    | main gravel pass through the valley       |
| `trail_summit`    | DecalRoad    | branch climb to the overlook              |

> Trees, roadside rocks and clouds are intentionally **not** in the shipped scene
> (they need mesh/texture assets that aren't bundled) so the map loads clean. Add
> them via `art/ASSETS.md` + the Forest Editor.
