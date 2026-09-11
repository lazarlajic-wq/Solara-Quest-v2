/**
 * Movement resolution. Guarantees that diagonal movement is never faster
 * than cardinal movement by normalizing the input vector to unit length.
 */

export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Velocity {
  x: number;
  y: number;
}

/**
 * Resolve a movement input into a velocity vector of magnitude <= speed.
 * Opposite keys cancel out. Diagonals are normalized so the resulting
 * speed equals `speed` (not speed * sqrt(2)).
 */
export function resolveVelocity(input: MoveInput, speed: number): Velocity {
  let x = 0;
  let y = 0;
  if (input.up) y -= 1;
  if (input.down) y += 1;
  if (input.left) x -= 1;
  if (input.right) x += 1;

  if (x === 0 && y === 0) return { x: 0, y: 0 };

  const len = Math.hypot(x, y);
  return { x: (x / len) * speed, y: (y / len) * speed };
}

/** Speed magnitude of a velocity vector. */
export function speedOf(v: Velocity): number {
  return Math.hypot(v.x, v.y);
}
