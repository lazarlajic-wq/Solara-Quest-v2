/**
 * Shared palette. Colors are picked to echo the reference art: teal-cloaked
 * heroes, warm stone towns, biome-tinted terrain. Equipment recolors the
 * body/accent layers via tints defined in equipment.ts.
 */

import { Ground } from '../core/mapgen';
import type { Biome } from '../core/regions';

export const COLORS = {
  skin: '#e8b98c',
  skinShadow: '#c99569',
  hair: '#3a2f2a',
  teal: '#2f6f6f',
  tealLight: '#3f8f8f',
  steel: '#8d9aa5',
  steelDark: '#5b666f',
  leather: '#6b4a2f',
  shadow: 'rgba(0,0,0,0.28)',
  outline: '#1a1420',
};

export const GROUND_COLORS: Record<Ground, { base: string; hi: string; lo: string }> = {
  [Ground.Grass]: { base: '#4f8f4a', hi: '#5fa257', lo: '#3d7a3a' },
  [Ground.Sand]: { base: '#d8c07a', hi: '#e6d192', lo: '#c2a862' },
  [Ground.Snow]: { base: '#dfeaf2', hi: '#f2f8fc', lo: '#c3d3df' },
  [Ground.Ash]: { base: '#4a4550', hi: '#585361', lo: '#38343f' },
  [Ground.Stone]: { base: '#9a938c', hi: '#ada6a0', lo: '#7d766f' },
  [Ground.Water]: { base: '#2f6fa8', hi: '#3f86c4', lo: '#245a89' },
  [Ground.Road]: { base: '#b7a888', hi: '#c8b998', lo: '#9c8e70' },
  [Ground.Floor]: { base: '#8a7f74', hi: '#9c9084', lo: '#71675d' },
  [Ground.Lava]: { base: '#c0392b', hi: '#e8622f', lo: '#8f2418' },
};

export const BIOME_ACCENT: Record<Biome, string> = {
  coast: '#3f8f6f',
  forest: '#2f7a3a',
  desert: '#c9a34e',
  ice: '#9fd0e6',
  volcano: '#e8622f',
  city: '#b7a888',
  ruins: '#8d857b',
  cave: '#5b666f',
};

export function toInt(hex: string): number {
  return parseInt(hex.replace('#', '0x'));
}
