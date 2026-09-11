/**
 * World data model. The long-term world is 10 regions (levels 1-100); the
 * demo builds regions 1-5 (levels 1-50) as playable, and keeps 6-10 in the
 * data model as locked stubs. Each region has 8-10 large main maps plus a
 * raid. Beating a region's raid boss unlocks the next region.
 */

export const TILE_SIZE = 32;
export const CHUNK_TILES = 16;

export type MapType =
  | 'small-town'
  | 'capital'
  | 'training-camp'
  | 'harbor'
  | 'field'
  | 'wilderness'
  | 'elite'
  | 'world-boss'
  | 'raid'
  | 'interior';

/** Minimum map size in tiles per map type (from the design spec). */
export const MAP_MIN_SIZE: Record<MapType, { w: number; h: number }> = {
  'small-town': { w: 224, h: 192 },
  capital: { w: 320, h: 256 },
  'training-camp': { w: 192, h: 160 },
  harbor: { w: 288, h: 224 },
  field: { w: 384, h: 320 },
  wilderness: { w: 448, h: 384 },
  elite: { w: 320, h: 288 },
  'world-boss': { w: 256, h: 224 },
  raid: { w: 384, h: 320 },
  interior: { w: 64, h: 48 },
};

export type Biome =
  | 'coast'
  | 'forest'
  | 'desert'
  | 'ice'
  | 'volcano'
  | 'city'
  | 'ruins'
  | 'cave';

export interface MapDef {
  id: string;
  name: string;
  type: MapType;
  biome: Biome;
  /** Size in tiles. Must be >= MAP_MIN_SIZE for the type. */
  w: number;
  h: number;
  /** Whether a town portal stands here (portals only exist in towns). */
  hasPortal: boolean;
  /** ids of maps reachable on foot from this one. */
  connections: string[];
  /** Deterministic seed for the procedural generator. */
  seed: number;
}

export interface RegionDef {
  id: number; // 1..10
  key: string;
  name: string;
  theme: string;
  levelMin: number;
  levelMax: number;
  playable: boolean;
  maps: MapDef[];
  worldBossMapId: string;
  raidMapId: string;
  /** Region that must be cleared (raid boss beaten) to unlock this one. */
  unlockedBy: number | null;
}

let seedCounter = 1000;
function nextSeed(): number {
  seedCounter += 7919;
  return seedCounter;
}

/** Helper: build a region's map with type-driven sizing (>= minimum). */
function map(
  id: string,
  name: string,
  type: MapType,
  biome: Biome,
  opts: { scale?: number; portal?: boolean; connections?: string[] } = {},
): MapDef {
  const min = MAP_MIN_SIZE[type];
  const scale = opts.scale ?? 1;
  return {
    id,
    name,
    type,
    biome,
    w: Math.round(min.w * scale),
    h: Math.round(min.h * scale),
    hasPortal: opts.portal ?? false,
    connections: opts.connections ?? [],
    seed: nextSeed(),
  };
}

/** Two-way road linking helper applied after all maps of a region exist. */
function linkChain(maps: MapDef[], order: string[]): void {
  const byId = new Map(maps.map((m) => [m.id, m]));
  for (let i = 0; i < order.length - 1; i++) {
    const a = byId.get(order[i]);
    const b = byId.get(order[i + 1]);
    if (!a || !b) continue;
    if (!a.connections.includes(b.id)) a.connections.push(b.id);
    if (!b.connections.includes(a.id)) b.connections.push(a.id);
  }
}

// ---- Region 1: Solara-Küste (levels 1-10) ----
const r1Maps: MapDef[] = [
  map('r1_start', 'Solara Startstadt', 'small-town', 'coast', { portal: true }),
  map('r1_training', 'Trainingslager', 'training-camp', 'coast'),
  map('r1_harbor', 'Hafen von Solara', 'harbor', 'coast'),
  map('r1_coastpath', 'Küstenpfad', 'field', 'coast'),
  map('r1_field1', 'Wiesen der Küste', 'field', 'coast'),
  map('r1_field2', 'Alte Ruinenfelder', 'field', 'ruins'),
  map('r1_field3', 'Klippenwildnis', 'wilderness', 'coast'),
  map('r1_elite', 'Verlassene Wachtürme', 'elite', 'ruins'),
  map('r1_worldboss', 'Brandungskliff', 'world-boss', 'coast'),
  map('r1_capital', 'Solara Hauptstadt', 'capital', 'city', { portal: true }),
  map('r1_raid', 'Tempel der Gezeiten', 'raid', 'ruins'),
];
linkChain(r1Maps, [
  'r1_start', 'r1_training', 'r1_harbor', 'r1_coastpath', 'r1_field1',
  'r1_field2', 'r1_field3', 'r1_elite', 'r1_worldboss', 'r1_capital', 'r1_raid',
]);
// extra branches for exploration
linkChain(r1Maps, ['r1_start', 'r1_field1']);
linkChain(r1Maps, ['r1_harbor', 'r1_field3']);

// ---- Region 2: Alter Wald (levels 11-20) ----
const r2Maps: MapDef[] = [
  map('r2_town', 'Waldsiedlung Eichhain', 'small-town', 'forest', { portal: true }),
  map('r2_grove', 'Nebelhain', 'field', 'forest'),
  map('r2_deepwood', 'Tiefer Wald', 'wilderness', 'forest'),
  map('r2_mushroom', 'Pilzsenke', 'field', 'forest'),
  map('r2_ruins', 'Überwachsene Ruinen', 'field', 'ruins'),
  map('r2_hollow', 'Wurzelhöhle', 'field', 'cave'),
  map('r2_elite', 'Hain der Wächter', 'elite', 'forest'),
  map('r2_worldboss', 'Lichtung des Alten', 'world-boss', 'forest'),
  map('r2_capital', 'Baumstadt Sylvaris', 'capital', 'city', { portal: true }),
  map('r2_raid', 'Herz des Waldes', 'raid', 'forest'),
];
linkChain(r2Maps, [
  'r2_town', 'r2_grove', 'r2_deepwood', 'r2_mushroom', 'r2_ruins',
  'r2_hollow', 'r2_elite', 'r2_worldboss', 'r2_capital', 'r2_raid',
]);
linkChain(r2Maps, ['r2_grove', 'r2_ruins']);

// ---- Region 3: Wüste & versunkene Ruinen (levels 21-30) ----
const r3Maps: MapDef[] = [
  map('r3_caravan', 'Karawanenstadt Oasis', 'small-town', 'desert', { portal: true }),
  map('r3_oasis', 'Große Oase', 'field', 'desert'),
  map('r3_dunes', 'Sturmdünen', 'wilderness', 'desert'),
  map('r3_temple', 'Sonnentempel', 'field', 'ruins'),
  map('r3_sunkfield', 'Versunkene Felder', 'field', 'ruins'),
  map('r3_underruins', 'Unterirdische Ruinen', 'field', 'cave'),
  map('r3_elite', 'Halle der Maschinen', 'elite', 'ruins'),
  map('r3_worldboss', 'Grabkammer', 'world-boss', 'desert'),
  map('r3_capital', 'Sonnenstadt Solheim', 'capital', 'city', { portal: true }),
  map('r3_raid', 'Versiegelte Pyramide', 'raid', 'ruins'),
];
linkChain(r3Maps, [
  'r3_caravan', 'r3_oasis', 'r3_dunes', 'r3_temple', 'r3_sunkfield',
  'r3_underruins', 'r3_elite', 'r3_worldboss', 'r3_capital', 'r3_raid',
]);
linkChain(r3Maps, ['r3_oasis', 'r3_temple']);

// ---- Region 4: Eis & Gebirge (levels 31-40) ----
const r4Maps: MapDef[] = [
  map('r4_town', 'Bergdorf Frostheim', 'small-town', 'ice', { portal: true }),
  map('r4_pass', 'Gefrorener Pass', 'field', 'ice'),
  map('r4_lake', 'Eissee', 'field', 'ice'),
  map('r4_mine', 'Alte Mine', 'field', 'cave'),
  map('r4_ridge', 'Lawinenkamm', 'wilderness', 'ice'),
  map('r4_cave', 'Eishöhle', 'field', 'cave'),
  map('r4_elite', 'Gefrorene Festung', 'elite', 'ice'),
  map('r4_worldboss', 'Gipfel des Sturms', 'world-boss', 'ice'),
  map('r4_capital', 'Festungsstadt Nordwall', 'capital', 'city', { portal: true }),
  map('r4_raid', 'Halle des ewigen Eises', 'raid', 'ice'),
];
linkChain(r4Maps, [
  'r4_town', 'r4_pass', 'r4_lake', 'r4_mine', 'r4_ridge',
  'r4_cave', 'r4_elite', 'r4_worldboss', 'r4_capital', 'r4_raid',
]);
linkChain(r4Maps, ['r4_pass', 'r4_mine']);

// ---- Region 5: Vulkan & dunkle Zitadelle (levels 41-50) ----
const r5Maps: MapDef[] = [
  map('r5_town', 'Aschenlager', 'small-town', 'volcano', { portal: true }),
  map('r5_flats', 'Lavafelder', 'field', 'volcano'),
  map('r5_blackrock', 'Schwarzfels', 'wilderness', 'volcano'),
  map('r5_glowruins', 'Glühende Ruinen', 'field', 'ruins'),
  map('r5_causeway', 'Aschendamm', 'field', 'volcano'),
  map('r5_forge', 'Feuerschlünde', 'field', 'cave'),
  map('r5_elite', 'Zitadellenvorhof', 'elite', 'volcano'),
  map('r5_worldboss', 'Krater des Zorns', 'world-boss', 'volcano'),
  map('r5_capital', 'Zitadellenstadt Emberfall', 'capital', 'city', { portal: true }),
  map('r5_raid', 'Dunkle Zitadelle', 'raid', 'volcano'),
];
linkChain(r5Maps, [
  'r5_town', 'r5_flats', 'r5_blackrock', 'r5_glowruins', 'r5_causeway',
  'r5_forge', 'r5_elite', 'r5_worldboss', 'r5_capital', 'r5_raid',
]);
linkChain(r5Maps, ['r5_flats', 'r5_glowruins']);

export const REGIONS: RegionDef[] = [
  {
    id: 1, key: 'solara-coast', name: 'Solara-Küste',
    theme: 'Grüne Küstenlandschaft, warme Steinstädte, Hafen, Wälder, Ruinen.',
    levelMin: 1, levelMax: 10, playable: true, maps: r1Maps,
    worldBossMapId: 'r1_worldboss', raidMapId: 'r1_raid', unlockedBy: null,
  },
  {
    id: 2, key: 'ancient-forest', name: 'Alter Wald',
    theme: 'Dichter alter Wald, überwachsene Ruinen, Nebel, Naturmagie.',
    levelMin: 11, levelMax: 20, playable: true, maps: r2Maps,
    worldBossMapId: 'r2_worldboss', raidMapId: 'r2_raid', unlockedBy: 1,
  },
  {
    id: 3, key: 'desert-ruins', name: 'Wüste & Versunkene Ruinen',
    theme: 'Wüstenflächen, Oasen, Tempel, Sandstürme, unterirdische Ruinen.',
    levelMin: 21, levelMax: 30, playable: true, maps: r3Maps,
    worldBossMapId: 'r3_worldboss', raidMapId: 'r3_raid', unlockedBy: 2,
  },
  {
    id: 4, key: 'ice-mountains', name: 'Eis & Gebirge',
    theme: 'Schnee, Eisflächen, Bergpässe, Minen, Festungen, Lawinen.',
    levelMin: 31, levelMax: 40, playable: true, maps: r4Maps,
    worldBossMapId: 'r4_worldboss', raidMapId: 'r4_raid', unlockedBy: 3,
  },
  {
    id: 5, key: 'volcano-citadel', name: 'Vulkan & Dunkle Zitadelle',
    theme: 'Lava, Asche, schwarze Felsen, glühende Ruinen, finale Zitadelle.',
    levelMin: 41, levelMax: 50, playable: true, maps: r5Maps,
    worldBossMapId: 'r5_worldboss', raidMapId: 'r5_raid', unlockedBy: 4,
  },
  // Regions 6-10: reserved in the data model, not yet built as playable maps.
  {
    id: 6, key: 'sky-isles', name: 'Fliegende Inseln',
    theme: 'Schwebende Inseln über den Wolken. (Nach der Demo.)',
    levelMin: 51, levelMax: 60, playable: false, maps: [],
    worldBossMapId: '', raidMapId: '', unlockedBy: 5,
  },
  {
    id: 7, key: 'sunken-depths', name: 'Versunkene Tiefen',
    theme: 'Unterwasserwelt und versunkene Städte.',
    levelMin: 61, levelMax: 70, playable: false, maps: [],
    worldBossMapId: '', raidMapId: '', unlockedBy: 6,
  },
  {
    id: 8, key: 'shadow-marsh', name: 'Schattensumpf',
    theme: 'Giftiger Sumpf und Nebelmoore.',
    levelMin: 71, levelMax: 80, playable: false, maps: [],
    worldBossMapId: '', raidMapId: '', unlockedBy: 7,
  },
  {
    id: 9, key: 'crystal-caverns', name: 'Kristallhöhlen',
    theme: 'Leuchtende Kristallhöhlen tief unter der Welt.',
    levelMin: 81, levelMax: 90, playable: false, maps: [],
    worldBossMapId: '', raidMapId: '', unlockedBy: 8,
  },
  {
    id: 10, key: 'celestial-spire', name: 'Himmelsspitze',
    theme: 'Die letzte Region und das Ende der Welt von Solara.',
    levelMin: 91, levelMax: 100, playable: false, maps: [],
    worldBossMapId: '', raidMapId: '', unlockedBy: 9,
  },
];

export function getRegion(id: number): RegionDef | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function getMap(mapId: string): { region: RegionDef; map: MapDef } | undefined {
  for (const region of REGIONS) {
    const m = region.maps.find((mm) => mm.id === mapId);
    if (m) return { region, map: m };
  }
  return undefined;
}

/** Validate a single map meets the minimum size for its type. */
export function mapMeetsMinSize(m: MapDef): boolean {
  const min = MAP_MIN_SIZE[m.type];
  return m.w >= min.w && m.h >= min.h;
}

/** Whether portals are placed only in towns (small-town / capital). */
export function portalPlacementValid(m: MapDef): boolean {
  if (!m.hasPortal) return true;
  return m.type === 'small-town' || m.type === 'capital';
}
