/**
 * Equipment definitions. Each of the 5 classes gets one full set per region
 * (5 classes x 5 regions = 25 class sets) plus the shared novice starter gear.
 * Sets are generated deterministically from templates so stats scale by region
 * and the visible tint/style follows the region biome.
 */

import { MAIN_CLASSES, ClassId, getClass } from './classes';
import { REGIONS } from './regions';

export type EquipSlot =
  | 'weapon' | 'armor' | 'helm' | 'shield' | 'boots'
  | 'gloves' | 'cloak' | 'accessory';

export interface EquipDef {
  id: string;
  name: string;
  slot: EquipSlot;
  classId: ClassId | 'any';
  region: number;
  /** Bonus stats applied when equipped. */
  bonus: { hp?: number; defense?: number; power?: number; crit?: number };
  /** Palette tint used by the sprite layer to recolor the equipment. */
  tint: number;
}

const REGION_TINT: Record<number, number> = {
  1: 0x3f7d5a, // coast green
  2: 0x2f6b3a, // forest
  3: 0xc9a34e, // desert gold
  4: 0x9fd0e6, // ice
  5: 0xc0392b, // volcano
};

const CLASS_SLOTS: Record<ClassId, EquipSlot[]> = {
  novice: ['weapon', 'armor', 'boots', 'gloves'],
  assassin: ['weapon', 'armor', 'helm', 'boots', 'gloves', 'cloak', 'accessory'],
  tank: ['weapon', 'armor', 'helm', 'shield', 'boots', 'gloves', 'accessory'],
  mage: ['weapon', 'armor', 'helm', 'boots', 'gloves', 'cloak', 'accessory'],
  archer: ['weapon', 'armor', 'helm', 'boots', 'gloves', 'cloak', 'accessory'],
  swordsman: ['weapon', 'armor', 'helm', 'shield', 'boots', 'gloves', 'accessory'],
};

const SLOT_NAME_DE: Record<EquipSlot, string> = {
  weapon: 'Waffe', armor: 'Rüstung', helm: 'Helm', shield: 'Schild',
  boots: 'Stiefel', gloves: 'Handschuhe', cloak: 'Umhang', accessory: 'Accessoire',
};

function slotBonus(slot: EquipSlot, region: number): EquipDef['bonus'] {
  const s = region; // 1..5
  switch (slot) {
    case 'weapon': return { power: 4 + s * 3, crit: 0.01 * s };
    case 'armor': return { defense: 2 + s * 2, hp: 6 + s * 6 };
    case 'helm': return { defense: 1 + s, hp: 3 + s * 3 };
    case 'shield': return { defense: 2 + s * 2 };
    case 'boots': return { defense: s, hp: 2 + s };
    case 'gloves': return { power: s, crit: 0.005 * s };
    case 'cloak': return { defense: s, hp: 2 + s };
    case 'accessory': return { power: s, hp: 2 + s, crit: 0.005 * s };
  }
}

export const EQUIPMENT: Record<string, EquipDef> = {};

// Novice starter gear.
(['weapon', 'armor', 'boots', 'gloves'] as EquipSlot[]).forEach((slot) => {
  const id = slot === 'weapon' ? 'starter_sword' : `novice_${slot}`;
  EQUIPMENT[id] = {
    id, name: `Anfänger-${SLOT_NAME_DE[slot]}`, slot, classId: 'novice',
    region: 1, bonus: slotBonus(slot, 1), tint: 0x8d8d8d,
  };
});
EQUIPMENT['health_potion'] = {
  id: 'health_potion', name: 'Heiltrank', slot: 'accessory', classId: 'any',
  region: 1, bonus: {}, tint: 0xd14b4b,
};

// 25 class sets.
for (const classId of MAIN_CLASSES) {
  for (const region of REGIONS.filter((r) => r.playable)) {
    for (const slot of CLASS_SLOTS[classId]) {
      const id = `${classId}_r${region.id}_${slot}`;
      const cls = getClass(classId);
      EQUIPMENT[id] = {
        id,
        name: `${cls.name} ${SLOT_NAME_DE[slot]} (Region ${region.id})`,
        slot,
        classId,
        region: region.id,
        bonus: slotBonus(slot, region.id),
        tint: REGION_TINT[region.id],
      };
    }
  }
}

/** The full starting set a class receives right after selection at level 5. */
export function startingSetFor(classId: ClassId): string[] {
  return CLASS_SLOTS[classId].map((slot) => `${classId}_r1_${slot}`);
}

export function getEquip(id: string): EquipDef | undefined {
  return EQUIPMENT[id];
}

export function equipmentCount(): number {
  return Object.keys(EQUIPMENT).length;
}
