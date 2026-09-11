/**
 * World / player persistent state, plus the region-unlock rules. Beating a
 * region's raid boss records a clear; a region is unlocked when the region it
 * is `unlockedBy` has been cleared. Region 1 is always unlocked; regions 6-10
 * stay locked (and unplayable) throughout the demo.
 */

import { REGIONS, getRegion } from './regions';
import type { ClassId } from './classes';

export interface EquipmentState {
  weapon: string | null;
  armor: string | null;
  helm: string | null;
  shield: string | null;
  boots: string | null;
  gloves: string | null;
  cloak: string | null;
  accessory: string | null;
}

export function emptyEquipment(): EquipmentState {
  return {
    weapon: null, armor: null, helm: null, shield: null,
    boots: null, gloves: null, cloak: null, accessory: null,
  };
}

export interface PlayerSave {
  version: number;
  name: string;
  classId: ClassId; // 'novice' until class chosen at level 5
  level: number;
  xp: number;
  hp: number;
  gold: number;
  currentMapId: string;
  x: number;
  y: number;
  equipment: EquipmentState;
  inventory: string[];
  pets: string[];
  activePet: string | null;
  /** Region ids whose raid boss has been defeated. */
  clearedRaids: number[];
  /** Completed quest ids. */
  completedQuests: string[];
  keybinds: Record<string, string>;
}

export const SAVE_VERSION = 1;

export function newPlayerSave(name = 'Solaris'): PlayerSave {
  return {
    version: SAVE_VERSION,
    name,
    classId: 'novice',
    level: 1,
    xp: 0,
    hp: 90,
    gold: 0,
    currentMapId: 'r1_start',
    x: 0,
    y: 0,
    equipment: emptyEquipment(),
    inventory: ['starter_sword', 'health_potion', 'health_potion'],
    pets: [],
    activePet: null,
    clearedRaids: [],
    completedQuests: [],
    keybinds: {
      up: 'W', down: 'S', left: 'A', right: 'D',
      dash: 'SHIFT', attack: 'MOUSE_LEFT', secondary: 'MOUSE_RIGHT',
      skill1: 'Q', skill2: 'E', skill3: 'R', skill4: 'F',
      interact: 'SPACE',
    },
  };
}

/** Is a region unlocked given the set of cleared raids? */
export function isRegionUnlocked(regionId: number, clearedRaids: number[]): boolean {
  const region = getRegion(regionId);
  if (!region) return false;
  if (!region.playable) return false; // regions 6-10 never unlock in the demo
  if (region.unlockedBy === null) return true; // region 1
  return clearedRaids.includes(region.unlockedBy);
}

/** Record a raid clear (idempotent). Returns the newly unlocked region id, if any. */
export function recordRaidClear(save: PlayerSave, regionId: number): number | null {
  if (!save.clearedRaids.includes(regionId)) {
    save.clearedRaids.push(regionId);
  }
  const next = getRegion(regionId + 1);
  if (next && next.playable && isRegionUnlocked(next.id, save.clearedRaids)) {
    return next.id;
  }
  return null;
}

/** List of currently unlocked, playable regions. */
export function unlockedRegions(clearedRaids: number[]): number[] {
  return REGIONS.filter((r) => isRegionUnlocked(r.id, clearedRaids)).map((r) => r.id);
}

/** Portal destinations: only towns of unlocked regions the player has visited. */
export function portalDestinations(clearedRaids: number[]): { mapId: string; label: string }[] {
  const dests: { mapId: string; label: string }[] = [];
  for (const region of REGIONS) {
    if (!isRegionUnlocked(region.id, clearedRaids)) continue;
    for (const m of region.maps) {
      if (m.hasPortal) dests.push({ mapId: m.id, label: `${region.name} — ${m.name}` });
    }
  }
  return dests;
}
