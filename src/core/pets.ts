/**
 * Pets: up to 3 per region (max 15 across the 5 demo regions). Each has an
 * unlock quest, a region-themed look, and a passive or active ability.
 */

import { REGIONS } from './regions';

export interface PetDef {
  id: string;
  name: string;
  region: number;
  unlockQuest: string;
  ability: string;
  /** 'passive' bonuses apply while summoned; 'active' pets can be triggered. */
  kind: 'passive' | 'active';
  tint: number;
}

const PET_THEMES: Record<number, { names: string[]; tint: number }> = {
  1: { names: ['Küstenfuchs', 'Möwe', 'Krebswächter'], tint: 0x6fa8dc },
  2: { names: ['Waldgeist', 'Pilzling', 'Rankenkätzchen'], tint: 0x4c9a52 },
  3: { names: ['Sandschlange', 'Skarabäus', 'Wüstenfalke'], tint: 0xd8b35a },
  4: { names: ['Frostwolf', 'Eisgeist', 'Schneehase'], tint: 0xbfe3f2 },
  5: { names: ['Glutdrache', 'Aschenkatze', 'Lavaigel'], tint: 0xd35400 },
};

export const PETS: Record<string, PetDef> = {};

for (const region of REGIONS.filter((r) => r.playable)) {
  const theme = PET_THEMES[region.id];
  theme.names.forEach((name, i) => {
    const id = `pet_r${region.id}_${i + 1}`;
    PETS[id] = {
      id, name, region: region.id,
      unlockQuest: `q_pet_r${region.id}_${i + 1}`,
      ability: i === 0 ? '+5% Tempo' : i === 1 ? '+8% XP' : 'Sammelt Loot automatisch',
      kind: i === 2 ? 'active' : 'passive',
      tint: theme.tint,
    };
  });
}

export function getPet(id: string): PetDef | undefined {
  return PETS[id];
}

export function petCount(): number {
  return Object.keys(PETS).length;
}
