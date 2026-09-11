import { describe, it, expect } from 'vitest';
import { resolveVelocity, speedOf } from '../src/core/movement';
import { Dir8, inputToDir8, vectorToDir8, isDiagonal, DIR8_ALL } from '../src/core/direction';

describe('8-direction movement', () => {
  it('resolves all eight directions from WASD input', () => {
    expect(inputToDir8(true, false, false, false)).toBe(Dir8.N);
    expect(inputToDir8(false, true, false, false)).toBe(Dir8.S);
    expect(inputToDir8(false, false, true, false)).toBe(Dir8.W);
    expect(inputToDir8(false, false, false, true)).toBe(Dir8.E);
    expect(inputToDir8(true, false, false, true)).toBe(Dir8.NE);
    expect(inputToDir8(true, false, true, false)).toBe(Dir8.NW);
    expect(inputToDir8(false, true, false, true)).toBe(Dir8.SE);
    expect(inputToDir8(false, true, true, false)).toBe(Dir8.SW);
  });

  it('returns null (keep last facing) when no input', () => {
    expect(inputToDir8(false, false, false, false)).toBeNull();
    expect(vectorToDir8(0, 0)).toBeNull();
    // opposite keys cancel -> idle keeps facing
    expect(inputToDir8(true, true, true, true)).toBeNull();
  });

  it('diagonal movement is NOT faster than cardinal movement', () => {
    const speed = 200;
    const cardinal = resolveVelocity({ up: true, down: false, left: false, right: false }, speed);
    const diagonal = resolveVelocity({ up: true, down: false, left: false, right: true }, speed);
    expect(speedOf(cardinal)).toBeCloseTo(speed, 5);
    expect(speedOf(diagonal)).toBeCloseTo(speed, 5);
    expect(speedOf(diagonal)).toBeLessThanOrEqual(speedOf(cardinal) + 1e-6);
  });

  it('classifies diagonal directions correctly', () => {
    expect(DIR8_ALL.filter(isDiagonal)).toEqual([Dir8.SW, Dir8.NW, Dir8.NE, Dir8.SE]);
  });
});
