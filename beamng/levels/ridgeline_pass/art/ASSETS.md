# Art assets for Ridgeline Pass

This kit ships the **level definition** (terrain heightmap, scene graph, material
and forest setup) but not large binary art (textures `.dds/.png`, meshes `.dae`),
which are typically the modder's own or reused from the BeamNG core library under
the game's license. Drop the following files in, or remap to existing in-game
assets via the World Editor's material/shape pickers.

## Terrain textures — `art/terrains/`
Referenced by `ridgeline_pass.terrain.json`. Each material wants a color, normal
and data (roughness/AO/height) map:

| Material        | Files expected (prefix)         |
|-----------------|---------------------------------|
| `alpine_grass`  | `t_alpine_grass_b.*`            |
| `mountain_dirt` | `t_dirt_b.*`                    |
| `gravel_pass`   | `t_gravel_b.*`                  |
| `rock_cliff`    | `t_rock_b.*`                    |

Quick start without custom textures: in the Terrain Painter, pick any of
BeamNG's stock terrain materials and the maps resolve automatically.

## Tree / rock meshes — `art/shapes/trees/` and `art/shapes/`
Referenced by `../forest/managedItemData.json` and the two `TSStatic` rock gates
in the scene: `pine_tall_a.dae`, `pine_tall_b.dae`, `pine_young.dae`,
`alpine_shrub.dae`, `rock_medium.dae`, `rock_large.dae`.

## Sky — `art/skies/`
`cloud.dds` for the `CloudLayer`. Any tiling cloud texture works, or delete the
CloudLayer object for a clear sky.

## Previews — level root
`ridgeline_pass_preview.jpg`, `spawn_*.jpg` — shown in the level/spawn selector.
Take these as in-game screenshots once the map loads.
