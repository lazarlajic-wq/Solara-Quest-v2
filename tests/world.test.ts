import { describe, it, expect } from 'vitest';
import {
  REGIONS, getRegion, mapMeetsMinSize, portalPlacementValid, MAP_MIN_SIZE,
} from '../src/core/regions';
import {
  isRegionUnlocked, recordRaidClear, newPlayerSave, portalDestinations,
} from '../src/core/worldState';
import { equipmentCount } from '../src/core/equipment';
import { petCount } from '../src/core/pets';

describe('world structure & region gating', () => {
  it('has 10 regions in the data model, 5 playable', () => {
    expect(REGIONS.length).toBe(10);
    expect(REGIONS.filter((r) => r.playable).length).toBe(5);
    expect(REGIONS.filter((r) => !r.playable).map((r) => r.id)).toEqual([6, 7, 8, 9, 10]);
  });

  it('each playable region has 8-11 main maps incl. a world boss and a raid', () => {
    for (const r of REGIONS.filter((x) => x.playable)) {
      expect(r.maps.length).toBeGreaterThanOrEqual(8);
      expect(r.maps.length).toBeLessThanOrEqual(11);
      expect(r.maps.find((m) => m.id === r.worldBossMapId)).toBeTruthy();
      expect(r.maps.find((m) => m.id === r.raidMapId)).toBeTruthy();
    }
  });

  it('every map meets the minimum tile size for its type', () => {
    for (const r of REGIONS) {
      for (const m of r.maps) {
        expect(mapMeetsMinSize(m)).toBe(true);
      }
    }
  });

  it('field maps really are large (hundreds of tiles per side)', () => {
    const field = MAP_MIN_SIZE.field;
    expect(field.w).toBeGreaterThanOrEqual(384);
    expect(field.h).toBeGreaterThanOrEqual(320);
  });

  it('portals only exist in towns (small-town / capital)', () => {
    for (const r of REGIONS) {
      for (const m of r.maps) {
        expect(portalPlacementValid(m)).toBe(true);
        if (m.hasPortal) {
          expect(['small-town', 'capital']).toContain(m.type);
        }
      }
    }
  });

  it('all map connections point to real maps and are two-way', () => {
    const all = new Map(REGIONS.flatMap((r) => r.maps).map((m) => [m.id, m]));
    for (const m of all.values()) {
      for (const c of m.connections) {
        const other = all.get(c);
        expect(other, `${m.id} -> ${c}`).toBeTruthy();
        expect(other!.connections).toContain(m.id);
      }
    }
  });

  it('region 1 is unlocked; region 2 unlocks only after clearing region 1 raid', () => {
    const save = newPlayerSave();
    expect(isRegionUnlocked(1, save.clearedRaids)).toBe(true);
    expect(isRegionUnlocked(2, save.clearedRaids)).toBe(false);
    const unlocked = recordRaidClear(save, 1);
    expect(unlocked).toBe(2);
    expect(isRegionUnlocked(2, save.clearedRaids)).toBe(true);
  });

  it('region 6 stays locked even after clearing region 5 raid', () => {
    const save = newPlayerSave();
    for (let r = 1; r <= 5; r++) recordRaidClear(save, r);
    expect(isRegionUnlocked(5, save.clearedRaids)).toBe(true);
    expect(isRegionUnlocked(6, save.clearedRaids)).toBe(false);
  });

  it('portal destinations only include unlocked town maps', () => {
    const save = newPlayerSave();
    const early = portalDestinations(save.clearedRaids);
    expect(early.every((d) => d.mapId.startsWith('r1_'))).toBe(true);
    recordRaidClear(save, 1);
    const later = portalDestinations(save.clearedRaids);
    expect(later.some((d) => d.mapId.startsWith('r2_'))).toBe(true);
  });

  it('has at least 25 class equipment sets worth of items and 15 pets', () => {
    // 25 sets * many slots + starter + potion
    expect(equipmentCount()).toBeGreaterThan(25);
    expect(petCount()).toBe(15);
  });

  it('region getter works', () => {
    expect(getRegion(3)!.name).toContain('Wüste');
  });
});
