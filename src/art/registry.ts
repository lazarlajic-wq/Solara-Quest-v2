/**
 * Maps game entities to character-art options and generates all the sheets a
 * scene needs. Player class, NPC role and enemy tier each get a distinct,
 * consistent look derived from the shared palette.
 */

import Phaser from 'phaser';
import { ClassId } from '../core/classes';
import { COLORS } from './palette';
import { makeCharacterSheet, CharacterArtOpts, WeaponType } from './sprites';

export const CLASS_ART: Record<ClassId, CharacterArtOpts> = {
  novice: { body: '#7d746a', accent: '#2f6f6f', hair: COLORS.hair, skin: COLORS.skin, weapon: 'sword', shield: false },
  assassin: { body: '#2b2b33', accent: '#5a2f6f', hair: '#1f1b18', skin: COLORS.skin, weapon: 'dagger', shield: false },
  tank: { body: '#6c7683', accent: '#2f4f6f', hair: '#2a2622', skin: COLORS.skin, weapon: 'mace', shield: true },
  mage: { body: '#3a4f8a', accent: '#6f5adf', hair: '#3a2f2a', skin: COLORS.skin, weapon: 'staff', shield: false },
  archer: { body: '#3a6f4a', accent: '#2f6f6f', hair: '#4a3a2a', skin: COLORS.skin, weapon: 'bow', shield: false },
  swordsman: { body: '#4a5a7a', accent: '#2f8f8f', hair: '#3a2f2a', skin: COLORS.skin, weapon: 'sword', shield: false },
};

export type EnemyTier = 'normal' | 'ranged' | 'magic' | 'brute' | 'elite' | 'boss';

export const ENEMY_ART: Record<EnemyTier, CharacterArtOpts> = {
  normal: { body: '#6a4a4a', accent: '#3a2020', hair: '#2a1818', skin: '#c98f6b', weapon: 'sword', shield: false },
  ranged: { body: '#4a5a3a', accent: '#2a3a20', hair: '#2a2818', skin: '#c98f6b', weapon: 'bow', shield: false },
  magic: { body: '#4a3a6a', accent: '#6f3adf', hair: '#20182a', skin: '#c98f6b', weapon: 'staff', shield: false },
  brute: { body: '#6a5a3a', accent: '#3a2a10', hair: '#181410', skin: '#b88060', weapon: 'mace', shield: true, scale: 1.25 },
  elite: { body: '#7a2a4a', accent: '#e0c060', hair: '#20101a', skin: '#c98f6b', weapon: 'sword', shield: true, scale: 1.3 },
  boss: { body: '#2a1030', accent: '#e0402f', hair: '#100810', skin: '#a86048', weapon: 'mace', shield: false, scale: 1.9 },
};

const NPC_WEAPONS: Record<string, WeaponType> = {
  Schmied: 'mace', Wache: 'sword', Hafenmeister: 'none', Alchemist: 'staff',
};

export function npcArt(role: string, i: number): CharacterArtOpts {
  const bodies = ['#8a6a3f', '#6a7a8a', '#7a5a6a', '#5a7a5a', '#8a7a5a'];
  const accents = ['#2f6f6f', '#6f5a2f', '#5a2f6f', '#2f5a6f', '#6f2f4f'];
  return {
    body: bodies[i % bodies.length],
    accent: accents[i % accents.length],
    hair: COLORS.hair,
    skin: COLORS.skin,
    weapon: NPC_WEAPONS[role] ?? 'none',
    shield: role === 'Wache',
  };
}

/** Generate every character sheet the game currently uses. */
export function generateAllCharacters(scene: Phaser.Scene): void {
  for (const [id, opts] of Object.entries(CLASS_ART)) {
    makeCharacterSheet(scene, `char_${id}`, opts);
  }
  for (const [tier, opts] of Object.entries(ENEMY_ART)) {
    makeCharacterSheet(scene, `enemy_${tier}`, opts);
  }
  // A pool of NPC looks.
  const roles = [
    'Versammlungsleiter', 'Schmied', 'Alchemist', 'Händler', 'Wirt',
    'Wache', 'Hafenmeister', 'Gilden-NPC', 'Questgeber', 'Pet-NPC',
  ];
  roles.forEach((role, i) => makeCharacterSheet(scene, `npc_${role}`, npcArt(role, i)));
  // Class masters (used in the training camp).
  (['assassin', 'tank', 'mage', 'archer', 'swordsman'] as ClassId[]).forEach((c) =>
    makeCharacterSheet(scene, `master_${c}`, { ...CLASS_ART[c], accent: '#e0c060' }),
  );
}
