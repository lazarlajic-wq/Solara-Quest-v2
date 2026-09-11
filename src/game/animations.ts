/**
 * Registers per-direction animations (idle / walk / attack / cast) for a
 * character sheet built by makeCharacterSheet. Frame indices come from the
 * fixed sheet layout in src/art/sprites.ts.
 */

import Phaser from 'phaser';
import { DIR8_ALL } from '../core/direction';
import { COL, SHEET_COLS } from '../art/sprites';

const fi = (dir: number, col: number) => dir * SHEET_COLS + col;

export function registerCharacterAnims(scene: Phaser.Scene, key: string): void {
  for (const dir of DIR8_ALL) {
    const mk = (suffix: string, cols: number[], frameRate: number, repeat: number) => {
      const animKey = `${key}_${suffix}_${dir}`;
      if (scene.anims.exists(animKey)) return;
      scene.anims.create({
        key: animKey,
        frames: cols.map((c) => ({ key, frame: fi(dir, c) })),
        frameRate,
        repeat,
      });
    };
    mk('idle', [COL.idle], 2, -1);
    mk('walk', COL.walk, 10, -1);
    mk('attack', COL.attack, 18, 0);
    mk('cast', [COL.casthit], 6, 0);
  }
}

export function animKey(sheet: string, kind: 'idle' | 'walk' | 'attack' | 'cast', dir: number): string {
  return `${sheet}_${kind}_${dir}`;
}
