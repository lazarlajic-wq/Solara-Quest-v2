# Solara Quest V2

Browser-first 2D pixel-art action RPG foundation built with Phaser 3, TypeScript and Vite.

## Start

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run check
```

## Playable Region 1 slice

- Five selectable classes: Assassin, Tank, Mage, Archer and Swordsman.
- Four fixed directions: north, west, south and east.
- Large connected maps: coastal spawn town, training camp, harbour, four field areas, boss ruins and capital.
- Enterable inn, equipment shop, smithy, guild hall, alchemy shop, quest hall and raid antechamber.
- Local combat loop with enemy pursuit, health, damage and death.
- Class-specific movement speed, health, dash, melee/projectile attack and signature skill.
- Validated portal destinations and spawn IDs.

The spawn town is the Region 1 visual reference slice. It uses extracted runtime
terrain, six transparent building sprites, animated water, wind-reactive
vegetation, a six-frame fountain, invisible collision bodies and art-free portal
zones. The other connected maps intentionally remain prototype layouts until the
reference slice has passed visual review.

## Controls

| Input | Action |
| --- | --- |
| WASD or arrow keys | Move |
| Shift | Dash |
| Space | Primary attack |
| Q | Signature skill |
| E | Enter/leave location or change map |
| 1–5 | Select class on the character screen |

The files under `assets/design/region_01/` are transparent four-direction motion masters. They are loaded as a strict 7-column by 4-row Phaser sheet. Collision and portal data remain separate from rendered art.

Region 1 world assets live under `assets/runtime/region_01/`. Their exact keys,
dimensions, alpha requirements and animation metadata are declared in the local
`manifest.json`. Rebuild them deterministically with
`python3 scripts/build_region_one_runtime_assets.py` (Pillow required).

The full Universal LPC source can be installed reproducibly with `scripts/setup_lpc_source.sh`; see `assets/source/lpc/README.md` for archive verification and licence requirements.
