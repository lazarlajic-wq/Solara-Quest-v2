# Art assets (drop-in overrides)

Any PNG placed here and listed in `manifest.json` is loaded **before** the
procedural placeholder art and rendered in its place — no code changes needed.

## How to add real assets (e.g. from PixelLab or the reference pack)

1. Put the PNG(s) in this folder.
2. Add an entry to `manifest.json` (see `manifest.example.json` for the shape).
3. Match the engine texture key:
   - Ground tiles: `tile_0` (grass) … `tile_8` (lava) — see `Ground` enum in `src/core/mapgen.ts`.
   - Objects: `obj_tree`, `obj_rock`, `obj_building`, `obj_chest`, `obj_fountain`, `obj_gate`, …
   - Portal sheet: `portal_sheet` (6 frames, 48×64 each).
   - Characters: `char_novice`, `char_swordsman`, `char_assassin`, `char_tank`, `char_mage`, `char_archer`;
     enemies `enemy_normal` … `enemy_boss`; NPCs `npc_<Rolle>`; masters `master_<class>`.

## Character sheet layout

A character spritesheet override must use 48×48 frames arranged as
9 columns × 8 rows: rows are the 8 directions (S, SW, W, NW, N, NE, E, SE),
columns are `idle, walk×4, attack×3, cast` (see `COL` in `src/art/sprites.ts`).
Sheets with a different layout need a small per-sheet anim config — trivial to
add once the real sheet exists.
