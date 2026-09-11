/**
 * 8-direction system shared by players, humanoid NPCs and enemies.
 * Directions are ordered clockwise starting at South, which matches the
 * row order used by the procedural sprite sheets in src/art.
 */

export enum Dir8 {
  S = 0,
  SW = 1,
  W = 2,
  NW = 3,
  N = 4,
  NE = 5,
  E = 6,
  SE = 7,
}

export const DIR8_ALL: Dir8[] = [
  Dir8.S,
  Dir8.SW,
  Dir8.W,
  Dir8.NW,
  Dir8.N,
  Dir8.NE,
  Dir8.E,
  Dir8.SE,
];

export const DIR8_NAMES: Record<Dir8, string> = {
  [Dir8.S]: 'south',
  [Dir8.SW]: 'south-west',
  [Dir8.W]: 'west',
  [Dir8.NW]: 'north-west',
  [Dir8.N]: 'north',
  [Dir8.NE]: 'north-east',
  [Dir8.E]: 'east',
  [Dir8.SE]: 'south-east',
};

/** Unit vector for each direction (screen-space; +y is down). */
export const DIR8_VECTOR: Record<Dir8, { x: number; y: number }> = {
  [Dir8.S]: { x: 0, y: 1 },
  [Dir8.SW]: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  [Dir8.W]: { x: -1, y: 0 },
  [Dir8.NW]: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  [Dir8.N]: { x: 0, y: -1 },
  [Dir8.NE]: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  [Dir8.E]: { x: 1, y: 0 },
  [Dir8.SE]: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
};

const EPS = 1e-6;

/**
 * Convert a movement/aim vector into one of the 8 directions.
 * Returns `null` when the vector has no meaningful length so callers can
 * keep the previous facing (idle preserves last direction).
 */
export function vectorToDir8(x: number, y: number): Dir8 | null {
  if (Math.abs(x) < EPS && Math.abs(y) < EPS) return null;
  // atan2 with +y down; map [-pi, pi] to one of 8 sectors.
  const angle = Math.atan2(y, x); // -pi..pi, 0 = East, +pi/2 = South
  // Rotate so that sector boundaries line up, 45° per sector.
  const sector = Math.round(angle / (Math.PI / 4)) & 7; // 0..7, 0 = East
  // sector: 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE
  const sectorToDir: Dir8[] = [
    Dir8.E,
    Dir8.SE,
    Dir8.S,
    Dir8.SW,
    Dir8.W,
    Dir8.NW,
    Dir8.N,
    Dir8.NE,
  ];
  return sectorToDir[sector];
}

/** Direction from an input pair of axis booleans (WASD style). */
export function inputToDir8(
  up: boolean,
  down: boolean,
  left: boolean,
  right: boolean,
): Dir8 | null {
  let x = 0;
  let y = 0;
  if (up) y -= 1;
  if (down) y += 1;
  if (left) x -= 1;
  if (right) x += 1;
  return vectorToDir8(x, y);
}

/** Whether a direction is diagonal (used for speed normalization checks). */
export function isDiagonal(dir: Dir8): boolean {
  return dir === Dir8.NE || dir === Dir8.NW || dir === Dir8.SE || dir === Dir8.SW;
}
