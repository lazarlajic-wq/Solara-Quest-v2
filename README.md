# Solara Quest

A fast, top-down **2D pixel-art action MMORPG** for the browser — built from
scratch with TypeScript, Vite, Phaser 3 and React. This repository contains a
**playable vertical slice** with all core systems working end-to-end and a
**data-driven architecture for all five demo regions** (levels 1–50), plus the
locked scaffolding for regions 6–10.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm run verify     # typecheck + unit tests + production build
npm run smoke      # headless browser smoke test (needs `npm run preview` running)
```

Controls: **WASD** move · **Shift** dash · **Left-click** attack (aim with mouse) ·
**Q/E/R** skills · **Space** interact.

---

## What is actually implemented and verified

Everything below runs in the browser today and is covered by automated tests
(45 unit tests + 2 headless-browser smoke tests, **0 console errors**).

- **8-direction movement** with correct diagonal-speed normalization (diagonals
  are not faster) and idle preserving the last facing.
- **Animated dash on `Shift`** — a real multi-phase state machine (startup →
  active → recovery) with i-frames, cooldown, stamina cost, wall/border
  collision stop, and a **distinct dash style per class**.
- **Fast combat**: combo chains, cancel windows, input buffering, dash-cancel,
  hit-stop, knockback, crits, screen shake, and readable enemy telegraphs.
- **Novice → Level 5 → class selection**: every character starts classless
  (*Anfänger*). Class choice is locked until level 5, then a staged selection
  screen at the training camp (with 5 class masters) grants the chosen class,
  its region-1 equipment, stats and three starter skills.
- **Five classes** — Assassine, Wächter (Tank), Magier, Bogenschütze,
  Schwertkämpfer — each with its own stats, resource, combo, dash style and
  skills. Melee arc hits and ranged projectiles both work.
- **Enemy AI**: idle → chase → telegraph → attack → recover, with ranged/magic
  projectiles, brutes, elites and multi-phase bosses.
- **Large, chunk-streamed maps**: maps are generated from modular tiles with a
  winding main path, side paths, arenas, 8–12+ points of interest, hidden
  areas, shortcuts, danger zones, and edge transitions. Ground renders through
  cached per-chunk RenderTextures with **viewport culling + neighbour
  preloading**; entities are y-sorted sprites.
- **World progression**: 10 regions in the data model, **5 playable**; beating a
  region's raid boss unlocks the next; **region 6 stays locked** through the
  demo. Town portals only appear in towns and only list unlocked destinations.
- **Enterable buildings** with generated interiors and return paths, **NPCs**,
  **town portals** (animated), **quests**, **equipment** (25 class sets + starter
  gear), **pets** (15), and **save/load** with migration and position-resume.

Run `npm run smoke` / `npm run smoke:class` to see it boot, play, level to 5 and
pick a class in a real headless Chromium.

## Honest status vs. the full design spec

The full brief describes a multi-region MMORPG at a scale of many months of
studio work. This slice deliberately prioritizes **working, tested systems and
a complete data model** over hand-authored content and AAA art:

- **Maps** are procedurally generated at (and above) the spec's minimum tile
  sizes for every region rather than hand-placed tile by tile. The generator is
  deterministic and produces the required exploration structure; bespoke
  hand-designed layouts would be the next content pass.
- **Art is procedural placeholder art** drawn at runtime in code (see below).
  It is stylistically consistent (top-down, teal-cloaked heroes) but **not** the
  hand-drawn fidelity of the reference images.
- Regions 2–5 share the same systems and generated content pipeline as region 1;
  the demo-ending region-5 raid records the clear and shows the region-6 teaser.

Nothing here is a fake placeholder that pretends to be finished — the code that
exists, runs and is tested; the parts that are scaffolding are called out as
scaffolding.

## Art & the drop-in asset pipeline

There is **no bundled image-generation tool in this environment**, so all
current sprites/tiles/objects are generated procedurally in `src/art/`. The
engine renders everything behind stable **texture keys**, and
`public/assets/manifest.json` lets you override any of them with real PNGs
(e.g. from PixelLab or an art pack) **without touching engine code** — the
procedural generators skip any key that already exists. See
`public/assets/README.md` for keys and the character-sheet layout.

To wire up a real pixel-art generator (e.g. PixelLab) for a web session, add it
as an MCP connector in claude.ai settings (its traffic then routes through the
allowed Anthropic MCP proxy); a raw `api.pixellab.ai` call is blocked by the
sandbox network policy.

## Architecture

```
src/core/      Framework-agnostic game logic (unit-tested, no Phaser/React):
               direction, movement, dash, combat, progression, classes,
               regions, worldState, equipment, quests, pets, mapgen, rng, save
src/art/       Procedural pixel-art generators + palette + entity art registry
src/game/      Phaser layer: scenes, entities (Player/Enemy/Npc), ChunkManager,
               session, event bus, animations, asset-manifest override
src/ui/        React overlay: main menu, HUD, class select, portal, dialog, toasts
tests/         Vitest suites for the spec invariants (§27 of the design brief)
scripts/       Playwright smoke tests (boot+play, class-selection flow)
```

The `src/core` modules contain no rendering code, which is why the invariants
(diagonal speed, dash phases, cancel windows, class-unlock gating, map sizes,
region gating, save round-trips) are testable in plain Node.

## Tech stack

TypeScript · Vite · Phaser 3 (world/render/input/collision) · React (menus/HUD)
· Vitest (unit) · Playwright (browser smoke). Performance: chunked ground
rendering, viewport/entity culling, fixed-step simulation separate from render,
and Phaser's built-in pause on hidden tab.
