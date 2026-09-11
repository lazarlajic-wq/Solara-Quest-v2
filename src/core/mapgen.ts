/**
 * Procedural generation of a large tile map from a MapDef. Maps are built from
 * many modular tiles (never one giant PNG) and carry the layers the design
 * spec requires: ground, roads, water, collision, decorations/objects, plus
 * gameplay layers (enemy spawns, npc spawns, POIs, transitions, portal).
 *
 * The generator also shapes each map for tension: a winding main path, at
 * least three side paths, optional exploration lobes, a hidden area, a
 * shortcut, and a dangerous zone — so the player never sees the whole map at
 * once and rarely crosses empty space.
 */

import { Rng } from './rng';
import { MapDef, Biome, getMap } from './regions';

export enum Ground {
  Grass = 0,
  Sand = 1,
  Snow = 2,
  Ash = 3,
  Stone = 4,
  Water = 5,
  Road = 6,
  Floor = 7,
  Lava = 8,
}

export type ObjectKind =
  | 'tree' | 'rock' | 'ruin' | 'wall' | 'bush' | 'crystal'
  | 'chest' | 'building' | 'portal' | 'fountain' | 'torch'
  | 'sign' | 'gate' | 'flag';

export interface PlacedObject {
  kind: ObjectKind;
  tx: number;
  ty: number;
  solid: boolean;
  /** For animated/lit objects the render layer reads this. */
  animated?: boolean;
  lit?: boolean;
}

export type PoiKind =
  | 'landmark' | 'treasure' | 'hidden' | 'shortcut' | 'danger'
  | 'safe' | 'encounter' | 'event' | 'elite' | 'resource' | 'entrance';

export interface Poi {
  kind: PoiKind;
  tx: number;
  ty: number;
  label: string;
}

export interface SpawnPoint {
  tx: number;
  ty: number;
  tier: 'normal' | 'ranged' | 'magic' | 'brute' | 'elite' | 'boss';
}

export interface MapTransition {
  tx: number;
  ty: number;
  toMapId: string;
  label: string;
}

export interface GeneratedMap {
  def: MapDef;
  w: number;
  h: number;
  ground: Uint8Array;
  /** 1 = solid/blocked, 0 = walkable. */
  collision: Uint8Array;
  objects: PlacedObject[];
  pois: Poi[];
  enemySpawns: SpawnPoint[];
  npcSpawns: { tx: number; ty: number; role: string }[];
  transitions: MapTransition[];
  portal: { tx: number; ty: number } | null;
  playerSpawn: { tx: number; ty: number };
}

const BIOME_GROUND: Record<Biome, Ground> = {
  coast: Ground.Grass,
  forest: Ground.Grass,
  desert: Ground.Sand,
  ice: Ground.Snow,
  volcano: Ground.Ash,
  city: Ground.Stone,
  ruins: Ground.Stone,
  cave: Ground.Stone,
};

const BIOME_OBSTACLE: Record<Biome, ObjectKind> = {
  coast: 'tree',
  forest: 'tree',
  desert: 'rock',
  ice: 'rock',
  volcano: 'rock',
  city: 'wall',
  ruins: 'ruin',
  cave: 'rock',
};

const idx = (x: number, y: number, w: number) => y * w + x;

/** Carve a walkable corridor of the given radius along a poly-line. */
function carvePath(
  collision: Uint8Array,
  ground: Uint8Array,
  w: number,
  h: number,
  points: { x: number; y: number }[],
  radius: number,
  roadTile: Ground,
): void {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)));
    for (let s = 0; s <= steps; s++) {
      const cx = Math.round(a.x + ((b.x - a.x) * s) / steps);
      const cy = Math.round(a.y + ((b.y - a.y) * s) / steps);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
          if (dx * dx + dy * dy > radius * radius) continue;
          collision[idx(x, y, w)] = 0;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) ground[idx(x, y, w)] = roadTile;
        }
      }
    }
  }
}

export function generateMap(def: MapDef): GeneratedMap {
  const w = def.w;
  const h = def.h;
  const rng = new Rng(def.seed);
  const base = BIOME_GROUND[def.biome];
  const isTown = def.type === 'small-town' || def.type === 'capital';
  const isInterior = def.type === 'interior';

  const ground = new Uint8Array(w * h).fill(base);
  const collision = new Uint8Array(w * h); // starts all walkable
  const objects: PlacedObject[] = [];
  const pois: Poi[] = [];
  const enemySpawns: SpawnPoint[] = [];
  const npcSpawns: { tx: number; ty: number; role: string }[] = [];
  const transitions: MapTransition[] = [];

  // Solid border wall so nothing leaves the map.
  for (let x = 0; x < w; x++) {
    collision[idx(x, 0, w)] = 1;
    collision[idx(x, h - 1, w)] = 1;
  }
  for (let y = 0; y < h; y++) {
    collision[idx(0, y, w)] = 1;
    collision[idx(w - 1, y, w)] = 1;
  }

  // --- Natural obstacle fill (creates sightline breaks) ---
  if (!isInterior) {
    const obstacle = BIOME_OBSTACLE[def.biome];
    // Cluster obstacles using value-noise-ish blobs.
    const clusters = Math.round((w * h) / (isTown ? 1400 : 520));
    for (let c = 0; c < clusters; c++) {
      const cx = rng.int(2, w - 3);
      const cy = rng.int(2, h - 3);
      const r = rng.int(1, isTown ? 2 : 4);
      const density = rng.float(0.35, 0.85);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
          if (dx * dx + dy * dy > r * r) continue;
          if (!rng.chance(density)) continue;
          collision[idx(x, y, w)] = 1;
          objects.push({ kind: obstacle, tx: x, ty: y, solid: true });
        }
      }
    }

    // Water / lava bodies for coast, ice, volcano.
    if (def.biome === 'coast' || def.biome === 'ice' || def.biome === 'volcano') {
      const liquid =
        def.biome === 'volcano' ? Ground.Lava : def.biome === 'ice' ? Ground.Water : Ground.Water;
      const bodies = rng.int(1, 3);
      for (let b = 0; b < bodies; b++) {
        const cx = rng.int(4, w - 5);
        const cy = rng.int(4, h - 5);
        const rr = rng.int(3, 7);
        for (let dy = -rr; dy <= rr; dy++) {
          for (let dx = -rr; dx <= rr; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
            if (dx * dx + dy * dy > rr * rr) continue;
            ground[idx(x, y, w)] = liquid;
            collision[idx(x, y, w)] = 1;
          }
        }
      }
    }
  }

  // --- Player spawn near an edge / entrance ---
  const spawn = { tx: Math.round(w * 0.12), ty: Math.round(h * 0.5) };

  // --- Main winding path across the map ---
  const waypoints = [
    { x: spawn.tx, y: spawn.ty },
    { x: Math.round(w * 0.3), y: rng.int(Math.round(h * 0.2), Math.round(h * 0.8)) },
    { x: Math.round(w * 0.5), y: rng.int(Math.round(h * 0.15), Math.round(h * 0.85)) },
    { x: Math.round(w * 0.7), y: rng.int(Math.round(h * 0.2), Math.round(h * 0.8)) },
    { x: Math.round(w * 0.88), y: Math.round(h * 0.5) },
  ];
  const roadTile = isTown || def.biome === 'city' ? Ground.Road : Ground.Road;
  carvePath(collision, ground, w, h, waypoints, isInterior ? 2 : 3, roadTile);

  // --- Side paths (at least three) ---
  const sidePathCount = isInterior ? 1 : Math.max(3, rng.int(3, 5));
  for (let s = 0; s < sidePathCount; s++) {
    const from = rng.pick(waypoints);
    const to = { x: rng.int(3, w - 4), y: rng.int(3, h - 4) };
    carvePath(collision, ground, w, h, [from, to], 2, roadTile);
  }

  // --- Exploration lobes (open combat arenas) ---
  const arenaCount = isInterior ? 1 : Math.max(2, Math.round((w * h) / 40000));
  const arenas: { x: number; y: number; r: number }[] = [];
  for (let a = 0; a < arenaCount; a++) {
    const ax = rng.int(Math.round(w * 0.25), Math.round(w * 0.85));
    const ay = rng.int(Math.round(h * 0.2), Math.round(h * 0.8));
    const ar = rng.int(5, 9);
    arenas.push({ x: ax, y: ay, r: ar });
    for (let dy = -ar; dy <= ar; dy++) {
      for (let dx = -ar; dx <= ar; dx++) {
        const x = ax + dx;
        const y = ay + dy;
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
        if (dx * dx + dy * dy > ar * ar) continue;
        collision[idx(x, y, w)] = 0;
        // remove obstacle objects sitting inside the arena
      }
    }
    // connect arena to nearest waypoint
    carvePath(collision, ground, w, h, [{ x: ax, y: ay }, rng.pick(waypoints)], 2, roadTile);
  }
  // Drop objects that ended up on walkable tiles (arena carving).
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.solid && collision[idx(o.tx, o.ty, w)] === 0) objects.splice(i, 1);
  }

  // --- Points of interest (8-12 for large maps) ---
  const poiTarget = isInterior ? 2 : Math.max(8, Math.min(14, Math.round((w * h) / 20000) + 8));
  const wantKinds: PoiKind[] = [
    'landmark', 'landmark', 'treasure', 'hidden', 'shortcut', 'danger',
    'safe', 'encounter', 'event', 'resource', 'elite',
  ];
  const placePoi = (kind: PoiKind, label: string) => {
    for (let tries = 0; tries < 60; tries++) {
      const x = rng.int(2, w - 3);
      const y = rng.int(2, h - 3);
      if (collision[idx(x, y, w)] === 0) {
        pois.push({ kind, tx: x, ty: y, label });
        return { x, y };
      }
    }
    return { x: spawn.tx, y: spawn.ty };
  };
  for (let i = 0; i < poiTarget; i++) {
    const kind = i < wantKinds.length ? wantKinds[i] : rng.pick(wantKinds);
    const at = placePoi(kind, kind);
    if (kind === 'treasure') {
      objects.push({ kind: 'chest', tx: at.x, ty: at.y, solid: true, animated: true });
      collision[idx(at.x, at.y, w)] = 1;
    }
    if (kind === 'danger' || kind === 'encounter' || kind === 'elite') {
      const tier = kind === 'elite' ? 'elite' : rng.pick(['normal', 'ranged', 'magic', 'brute'] as const);
      enemySpawns.push({ tx: at.x, ty: at.y, tier });
    }
  }

  // --- Enemy spawns in arenas & along paths (fields/wilderness) ---
  if (!isTown && !isInterior) {
    const spawnBudget =
      def.type === 'wilderness' ? 26 : def.type === 'field' ? 18 :
      def.type === 'elite' ? 14 : def.type === 'world-boss' ? 6 :
      def.type === 'raid' ? 10 : 8;
    const tiers = ['normal', 'normal', 'normal', 'ranged', 'magic', 'brute'] as const;
    for (const arena of arenas) {
      const count = rng.int(3, 6);
      for (let e = 0; e < count && enemySpawns.length < spawnBudget; e++) {
        const x = arena.x + rng.int(-arena.r + 1, arena.r - 1);
        const y = arena.y + rng.int(-arena.r + 1, arena.r - 1);
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
        if (collision[idx(x, y, w)] !== 0) continue;
        enemySpawns.push({ tx: x, ty: y, tier: rng.pick(tiers) });
      }
    }
    if (def.type === 'world-boss') {
      const c = arenas[0] ?? { x: Math.round(w / 2), y: Math.round(h / 2) };
      enemySpawns.push({ tx: c.x, ty: c.y, tier: 'boss' });
    }
    if (def.type === 'raid') {
      const c = { x: Math.round(w * 0.85), y: Math.round(h * 0.5) };
      // clear a boss arena
      for (let dy = -8; dy <= 8; dy++)
        for (let dx = -8; dx <= 8; dx++) {
          const x = c.x + dx, y = c.y + dy;
          if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && dx * dx + dy * dy <= 64)
            collision[idx(x, y, w)] = 0;
        }
      enemySpawns.push({ tx: c.x, ty: c.y, tier: 'boss' });
    }
  }

  // --- Town content: NPCs, buildings, portal, fountain ---
  let portal: { tx: number; ty: number } | null = null;
  if (isTown) {
    const roles = [
      'Versammlungsleiter', 'Schmied', 'Alchemist', 'Händler', 'Wirt',
      'Wache', 'Hafenmeister', 'Gilden-NPC', 'Questgeber', 'Pet-NPC',
    ];
    for (const role of roles) {
      for (let tries = 0; tries < 40; tries++) {
        const x = rng.int(3, w - 4);
        const y = rng.int(3, h - 4);
        if (collision[idx(x, y, w)] === 0) {
          npcSpawns.push({ tx: x, ty: y, role });
          break;
        }
      }
    }
    // buildings (enterable): pick a few free spots
    const buildings = ['Versammlungshaus', 'Gasthaus', 'Schmiede', 'Alchemieladen', 'Gildenhaus'];
    for (let b = 0; b < buildings.length; b++) {
      const x = rng.int(4, w - 6);
      const y = rng.int(4, h - 6);
      objects.push({ kind: 'building', tx: x, ty: y, solid: true });
      collision[idx(x, y, w)] = 1;
      pois.push({ kind: 'safe', tx: x, ty: y + 2, label: buildings[b] });
    }
    // portal near center of town
    const px = Math.round(w * 0.5);
    const py = Math.round(h * 0.4);
    portal = { tx: px, ty: py };
    objects.push({ kind: 'portal', tx: px, ty: py, solid: false, animated: true, lit: true });
    pois.push({ kind: 'landmark', tx: px, ty: py, label: 'Stadtportal' });
    // fountain
    objects.push({ kind: 'fountain', tx: px + 4, ty: py, solid: true, animated: true });
  }

  // --- Transitions to connected maps, spread across edges ---
  const conns = def.connections;
  conns.forEach((toId, i) => {
    const info = getMap(toId);
    const label = info ? info.map.name : toId;
    // place transitions on alternating edges
    let tx: number, ty: number;
    const side = i % 4;
    if (side === 0) { tx = w - 2; ty = Math.round(h * (0.3 + 0.15 * i)); }
    else if (side === 1) { tx = 2; ty = Math.round(h * (0.3 + 0.15 * i)); }
    else if (side === 2) { tx = Math.round(w * (0.3 + 0.15 * i)); ty = 2; }
    else { tx = Math.round(w * (0.3 + 0.15 * i)); ty = h - 2; }
    tx = Math.max(1, Math.min(w - 2, tx));
    ty = Math.max(1, Math.min(h - 2, ty));
    collision[idx(tx, ty, w)] = 0;
    // carve a short path to the transition so it is reachable
    carvePath(collision, ground, w, h, [{ x: tx, y: ty }, rng.pick(waypoints)], 2, roadTile);
    transitions.push({ tx, ty, toMapId: toId, label });
    objects.push({ kind: 'gate', tx, ty, solid: false });
  });

  // Ensure the player spawn is walkable.
  collision[idx(spawn.tx, spawn.ty, w)] = 0;

  return {
    def, w, h, ground, collision, objects, pois,
    enemySpawns, npcSpawns, transitions, portal, playerSpawn: spawn,
  };
}

/** Count how many POIs of a given kind exist (used by tests). */
export function countPoi(gen: GeneratedMap, kind: PoiKind): number {
  return gen.pois.filter((p) => p.kind === kind).length;
}
