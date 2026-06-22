# Loading Ridgeline Pass — step-by-step

This is the foolproof version of the import step. Follow it once and the map is
permanently drivable (the bake is saved into the level). Budget ~2 minutes.

> **Why there's a step at all:** BeamNG renders terrain from a baked binary
> `.ter` file that the game builds from a heightmap *inside* the editor. This kit
> ships the heightmap (`ridgeline_pass_heightmap.png`); you bake the `.ter` once,
> save, and you never do it again.

---

## 1. Put the level where BeamNG can see it

Copy the whole `ridgeline_pass` folder into your BeamNG user folder so the path is:

```
%LocalAppData%\BeamNG.drive\<version>\levels\ridgeline_pass\
```

- Find the user folder fast: in BeamNG, **Options → Misc → Open user folder**, then
  go into the highest-numbered version folder (e.g. `0.36`), then `levels`
  (create the `levels` folder if it isn't there).
- The folder must contain `info.json` directly inside `ridgeline_pass\` — not
  nested in a second `ridgeline_pass\ridgeline_pass\`.

Launch BeamNG.

## 2. Open the level

- Main menu → **Singleplayer** (or **Freeroam**).
- Pick **Ridgeline Pass** from the level list and load it.
- You'll spawn over a flat/empty area — that's expected; there's no terrain yet.

## 3. Open the World Editor

- Press **F11**. The editor docks open across the screen.
- If a "safe mode / editor" prompt appears, accept it.

## 4. Import the heightmap

- Top menu bar: **Window → Terrain Importer**
  *(older builds: **Terrain → Import Terrain Heightmap**).*
- Fill the dialog in **exactly** these values so the pre-placed roads, spawns and
  rocks line up:

  | Field | Value |
  |-------|-------|
  | **Height Map** | browse to `levels/ridgeline_pass/ridgeline_pass_heightmap.png` |
  | **Texture Map / Opacity** | leave empty |
  | **Terrain Size** | **1024** |
  | **Square Size (meters)** | **2.0** |
  | **Max Height (meters)** | **380** |
  | **Height (base/offset)** | **0** |
  | **Flip / Y-up** | leave default; if the valley looks mirrored after import, redo with the flip toggled |

- **Materials:** add the four shipped materials so the importer has something to
  paint with. Click **Add** and pick each of:
  `alpine_grass`, `mountain_dirt`, `gravel_pass`, `rock_cliff`
  (they're defined in `art/terrains/ridgeline_pass.terrain.json`). If the picker
  doesn't show them, just add any one stock material now — you can paint properly
  later; the terrain shape is what matters.
- Click **Import / OK**. After a moment the mountains appear.

## 5. Save

- **Ctrl + S** (or **File → Save**). This writes `ridgeline_pass.ter` next to
  `info.json` and records the `TerrainBlock` in `main/MissionGroup/items.level.json`.
- Done — from now on the level loads straight into terrain. You can close the
  editor (**F11**) and drive.

## 6. Drive it

- **Esc → choose a spawn point** (Trailhead / Summit Overlook / Valley Floor), or
  just reset (**Insert / R**) and you'll drop onto the terrain.
- The main gravel pass runs the length of the central valley; the branch trail
  climbs east to the summit overlook.

---

## Troubleshooting

- **Car falls forever / black void:** terrain wasn't imported or wasn't saved.
  Re-do steps 4–5; confirm `ridgeline_pass.ter` now exists in the level folder.
- **Terrain is flat:** the heightmap path was wrong or **Max Height** was 0. Set
  **Max Height = 380** and re-import.
- **Spawns / roads float above or sink into the ground:** you used different
  Size/Square/Max-Height values. Either redo with `1024 / 2.0 / 380`, or select
  the objects and use **Edit → Drop to ground**.
- **Everything is one flat gray/checker color:** terrain textures (`.dds/.png`)
  aren't bundled. Open the **Terrain Painter**, select a layer, and assign any
  stock BeamNG terrain material — it'll resolve and paint normally. See
  `art/ASSETS.md` for the full texture/mesh list if you want the intended look.
- **No trees / rocks missing:** the forest and rock-gate meshes (`.dae`) aren't
  bundled either; the level still drives. Add meshes per `art/ASSETS.md`, or paint
  trees in the **Forest Editor** (the brush palette is pre-loaded from
  `forest/managedItemData.json`).
- **Level not in the list:** the folder is nested one level too deep, or it's not
  under `…/<version>/levels/`. Fix the path and relaunch.
