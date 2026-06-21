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
│       ├── ridgeline_pass_heightmap.png      # 16-bit procedural terrain (1024²)
│       ├── preview_heightmap.png             # 8-bit visual reference only
│       ├── main/MissionGroup/items.level.json# scene graph (lighting, roads, spawns, rocks, forest)
│       ├── art/
│       │   ├── terrains/ridgeline_pass.terrain.json  # 4 terrain materials
│       │   ├── shapes/ , skies/                       # mesh/texture drop-ins (see art/ASSETS.md)
│       │   └── ASSETS.md
│       └── forest/managedItemData.json       # tree/shrub/boulder definitions
└── tools/
    └── generate_heightmap.py                 # regenerate / reshape the terrain
```

## Install

1. Copy the `levels/ridgeline_pass` folder into your BeamNG user folder:
   - Windows: `%LocalAppData%\BeamNG.drive\<version>\levels\ridgeline_pass`
   - Or zip it (see **Packaging** below) and drop the zip into `…\mods\`.
2. Launch BeamNG.

## First load — import the terrain (~1 minute, one time)

Custom terrain in BeamNG is a baked binary (`.ter`) that the editor generates
from a heightmap. This kit ships the heightmap; you bake it once:

1. Open the level and press **F11** for the World Editor.
2. **Window → Terrain Importer** (or *Terrain → Import Terrain*).
3. Set:
   - **Heightmap:** `ridgeline_pass_heightmap.png`
   - **Terrain size:** `1024`, **Square size:** `2.0` m (→ 2048 m map)
   - **Max height:** `380` m  *(matches the elevations the scene was laid out for)*
   - **Materials:** add the four from `art/terrains/ridgeline_pass.terrain.json`
     (`alpine_grass`, `mountain_dirt`, `gravel_pass`, `rock_cliff`).
4. Import. The roads, spawns and rock gates already align to the valley.
5. **Ctrl+S** to save — this writes the `.ter` and updates `items.level.json`.

> Keep `Max height = 380` and `Square size = 2` so the pre-placed DecalRoads,
> spawn points and rock gates sit on the terrain. Changing them just means
> nudging objects (or use *Edit → Drop to ground* on a selection).

## Reshape / regenerate the terrain

`tools/generate_heightmap.py` is pure-Python (no numpy/Pillow). It builds a
ridged-multifractal mountain field shaped into a bowl with a sinusoidal valley.

```bash
python3 tools/generate_heightmap.py --size 1024 --seed 1337
# try other seeds for a different mountain, or --size 2048 for more detail
```

The valley curve in `items.level.json` is computed from the **same** formula, so
re-running with the default seed keeps roads aligned. Change the seed and you'll
want to re-snap the roads (Drop to ground) after importing.

## Finishing touches (optional)

- **Paint terrain:** Terrain Painter — gravel along the pass, dirt on the ridges,
  rock on the steep cliff faces (the `rock_cliff` material auto side-projects on
  slopes), grass on the valley floor.
- **Forest:** open the Forest Editor; the brush palette is pre-populated from
  `forest/managedItemData.json` (pines, shrubs, boulder clusters). Paint trees up
  the lower slopes and thin them out toward the peaks.
- **Previews:** screenshot the map and save as `ridgeline_pass_preview.jpg` and
  `spawn_*.jpg` in the level root for the selector thumbnails.
- **Art:** see `levels/ridgeline_pass/art/ASSETS.md` for the texture/mesh files
  the materials and forest reference.

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
| `clouds`          | CloudLayer   | drifting cloud cover                      |
| `spawn_trailhead` | SpawnSphere  | default spawn, mid-valley                 |
| `spawn_summit`    | SpawnSphere  | ridge overlook                            |
| `spawn_valley`    | SpawnSphere  | valley floor                              |
| `pass_main`       | DecalRoad    | main gravel pass through the valley       |
| `trail_summit`    | DecalRoad    | branch climb to the overlook              |
| `forest`          | Forest       | vegetation layer (paint with the editor)  |
| `rock_gate_l/r`   | TSStatic     | hero rock formations framing the pass     |
