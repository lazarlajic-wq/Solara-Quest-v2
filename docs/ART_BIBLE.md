# Solara Quest — Art Bible

## Style formula
High-detail 16/32-bit pixel art inspired by classic top-down adventure RPG readability, with crisp hand-placed pixel clusters, organic silhouettes and restrained dark outlines. Environments use region-specific natural palettes; heroes and enemies use stronger value contrast, while magic and interactables glow turquoise-violet. Lighting is warm and readable with compact painted shadows. All assets use a consistent true top-down three-quarter view, fixed pixel density, nearest-neighbour scaling, no anti-aliasing and no copied franchise designs.

## Technical standard
- Tile size: 32x32 px
- Character frame: 64x64 px
- Large boss frame: 128x128 px
- Directions in row order: N, NE, E, SE, S, SW, W, NW
- Pivot: bottom-centre, identical across body, hair, armour and weapon layers
- Required player actions: idle 4f, walk 8f, run 8f, dash 6f, attack-1 6f, attack-2 6f, attack-3 8f, skill 8f, hit 4f, death 8f
- Required mob actions: idle 4f, walk 6f, attack 6f, hit 3f, death 6f
- Export: transparent PNG, indexed or RGBA, nearest-neighbour only
- Maps are assembled from tiles and objects, never delivered as one flat background image.

## Regions
1. Solara Coast (Lv 1–10): warm stone towns, green fields, harbour, coast and sunken ruins.
2. Elderwood (Lv 11–20): ancient forest, mushroom hollows, overgrown ruins and nature magic.
3. Sundervale (Lv 21–30): desert, oasis, caravan city, buried temples and arcane machinery.
4. Frostspire (Lv 31–40): snow towns, frozen lakes, mountain passes, mines and ice fortress.
5. Emberfall (Lv 41–50): ash fields, lava channels, foundry, black citadel and final raid.

## Map kit per region
Each region receives: arrival/start city, specialist area, three field maps, advanced combat map, elite area, world-boss arena, capital/end city and raid interior. Interiors are separate maps. Portals appear only in cities.
