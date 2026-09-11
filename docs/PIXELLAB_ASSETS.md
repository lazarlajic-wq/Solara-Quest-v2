# Generating real art with PixelLab

The game currently renders **procedurally-drawn placeholder art**. This document
is a ready-to-run task for producing real pixel-art in the reference style with
the **PixelLab MCP** and wiring it into the game's drop-in asset pipeline.

> ⚠️ PixelLab is **not reachable from cloud / web Claude Code sessions** — the
> sandbox network policy blocks `api.pixellab.ai`. Run this **locally**, where
> Claude Code has no egress restriction.

## 1. Enable PixelLab locally

In a local Claude Code terminal (do **not** commit the token anywhere):

```bash
claude mcp add pixellab https://api.pixellab.ai/mcp -t http -H "Authorization: Bearer <YOUR_PIXELLAB_TOKEN>"
```

Confirm the `mcp__pixellab__*` tools are listed, then ask Claude Code to carry
out the task below.

## 2. How the game consumes art (engine already built — don't change it)

Everything renders behind stable **texture keys**. Any PNG placed in
`public/assets/` and listed in `public/assets/manifest.json` is loaded *before*
the procedural generators and replaces that key automatically — see
`src/game/assetManifest.ts`, `src/game/scenes/PreloadScene.ts` and
`public/assets/README.md`. So the whole job is: generate PNGs → save under
`public/assets/` → add manifest entries. No engine change is needed for
tiles/objects/portal.

Manifest shape (paths relative to site root, i.e. start with `assets/`):

```json
{
  "images":       [{ "key": "tile_0", "path": "assets/grass.png" }],
  "spritesheets": [{ "key": "char_swordsman", "path": "assets/hero.png", "frameWidth": 48, "frameHeight": 48 }]
}
```

## 3. Style

High top-down pixel art. Teal-cloaked heroes; warm stone-and-wood buildings with
blue/green shingle roofs; a swirling arcane portal in a stone arch. Consistent
palette + pixel density across all assets (`src/art/palette.ts` shows current
colors).

## 4. Assets, keys and sizes

**Ground tiles — 32×32, single images (tileable if possible):**
`tile_0` grass · `tile_1` sand · `tile_2` snow · `tile_3` ash · `tile_4` stone ·
`tile_5` water · `tile_6` dirt road · `tile_7` interior floor · `tile_8` lava.

**Objects — single images, drawn with feet near the bottom:**
`obj_tree` (40×52) · `obj_rock` (34×30) · `obj_bush` (30×24) · `obj_ruin` (40×44) ·
`obj_wall` (32×32, tileable) · `obj_crystal` (26×34) · `obj_chest` (30×24) ·
`obj_fountain` (40×32) · `obj_gate` (32×40) · `obj_sign` (20×24) · `obj_flag`
(24×40) · `obj_building` (96×88, ideally blacksmith/alchemist/hall variants — if
you add extra keys like `obj_building_smithy`, map building POIs to them in
`src/game/scenes/WorldScene.ts::buildObjects`; otherwise just override
`obj_building`).

**Portal — `portal_sheet`:** 6-frame horizontal strip, each frame 48×64
(288×64 total), swirling vortex in a stone arch, looping. Register as a
spritesheet (frameWidth 48, frameHeight 64); the engine builds `portal_spin`
from frames 0–5.

**Characters — 8-direction sheets, 48×48 frames:**
players `char_novice`, `char_swordsman`, `char_assassin`, `char_tank`,
`char_mage`, `char_archer`; enemies `enemy_normal`, `enemy_ranged`,
`enemy_magic`, `enemy_brute`, `enemy_elite`, `enemy_boss`; masters
`master_assassin`, `master_tank`, `master_mage`, `master_archer`,
`master_swordsman`; NPCs `npc_Versammlungsleiter`, `npc_Schmied`,
`npc_Alchemist`, `npc_Händler`, `npc_Wirt`, `npc_Wache`, `npc_Hafenmeister`,
`npc_Gilden-NPC`, `npc_Questgeber`, `npc_Pet-NPC`.

The current animation code (`src/game/animations.ts`) expects **9 columns × 8
rows** of 48×48 frames: rows are directions in order **S, SW, W, NW, N, NE, E,
SE**; columns are `idle, walk1..walk4, attack1..attack3, cast`. PixelLab output
will likely differ, so either:

- **(a)** compose PixelLab frames into that exact 9×8 / 48×48 layout, or
- **(b)** update the frame constants in `src/art/sprites.ts` (`COL`, `SHEET_COLS`,
  `SHEET_ROWS`) and `src/game/animations.ts` to a per-sheet config matching
  PixelLab's real output (frame size, direction rows, frame ranges).

Either way keep all 8 directions and the idle/walk/attack/cast set, and make sure
`registerAllAnims` in `src/game/scenes/WorldScene.ts` still registers each sheet.
Do **one** character (`char_swordsman`) end-to-end first, verify it animates in
all 8 directions in-game, then batch the rest.

## 5. Verify

1. Save PNGs under `public/assets/`; add each to `public/assets/manifest.json`
   (keep valid JSON — it currently has empty arrays).
2. `npm install` if needed, then `npm run verify` (typecheck + tests + build).
3. `npm run preview` in one terminal; `npm run smoke` and `npm run smoke:class`
   in another — both must pass with `0 console errors` (adjust `PW_EXE` /
   `SMOKE_URL` for your local Playwright browser path).
4. `npm run dev` and confirm visually: 8-direction movement/attack/dash with the
   new sprites, new buildings and animated portal in town.

## Constraints

- Never commit the PixelLab token or any secret.
- Do not change gameplay logic in `src/core/*` — art/integration only.
- Keep the built page well under 16 MB.
