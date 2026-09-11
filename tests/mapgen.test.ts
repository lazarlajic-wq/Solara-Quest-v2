import { describe, it, expect } from 'vitest';
import { generateMap, countPoi, Ground } from '../src/core/mapgen';
import { REGIONS, getMap } from '../src/core/regions';

describe('procedural map generation', () => {
  it('generates a map at the declared tile dimensions', () => {
    const def = getMap('r1_field1')!.map;
    const gen = generateMap(def);
    expect(gen.w).toBe(def.w);
    expect(gen.h).toBe(def.h);
    expect(gen.collision.length).toBe(def.w * def.h);
    expect(gen.ground.length).toBe(def.w * def.h);
  });

  it('is deterministic for a given seed', () => {
    const def = getMap('r1_field2')!.map;
    const a = generateMap(def);
    const b = generateMap(def);
    expect(Array.from(a.collision)).toEqual(Array.from(b.collision));
    expect(a.pois.length).toBe(b.pois.length);
  });

  it('surrounds the map with solid borders (cannot leave the map)', () => {
    const gen = generateMap(getMap('r1_field1')!.map);
    const { w, h, collision } = gen;
    for (let x = 0; x < w; x++) {
      expect(collision[x]).toBe(1); // top row
      expect(collision[(h - 1) * w + x]).toBe(1); // bottom row
    }
    for (let y = 0; y < h; y++) {
      expect(collision[y * w]).toBe(1); // left col
      expect(collision[y * w + (w - 1)]).toBe(1); // right col
    }
  });

  it('large maps provide 8-12+ points of interest with the required variety', () => {
    const gen = generateMap(getMap('r1_field3')!.map); // wilderness
    expect(gen.pois.length).toBeGreaterThanOrEqual(8);
    expect(countPoi(gen, 'hidden')).toBeGreaterThanOrEqual(1);
    expect(countPoi(gen, 'shortcut')).toBeGreaterThanOrEqual(1);
    expect(countPoi(gen, 'danger') + gen.enemySpawns.length).toBeGreaterThan(0);
  });

  it('has a walkable player spawn and reachable transitions', () => {
    const gen = generateMap(getMap('r1_coastpath')!.map);
    const { w } = gen;
    expect(gen.collision[gen.playerSpawn.ty * w + gen.playerSpawn.tx]).toBe(0);
    expect(gen.transitions.length).toBeGreaterThan(0);
    for (const t of gen.transitions) {
      expect(gen.collision[t.ty * w + t.tx]).toBe(0);
    }
  });

  it('towns carry a portal, NPCs and buildings; fields do not carry a portal', () => {
    const town = generateMap(getMap('r1_start')!.map);
    expect(town.portal).not.toBeNull();
    expect(town.npcSpawns.length).toBeGreaterThan(3);
    expect(town.objects.some((o) => o.kind === 'building')).toBe(true);

    const field = generateMap(getMap('r1_field1')!.map);
    expect(field.portal).toBeNull();
  });

  it('world-boss and raid maps spawn a boss', () => {
    const wb = generateMap(getMap('r1_worldboss')!.map);
    expect(wb.enemySpawns.some((e) => e.tier === 'boss')).toBe(true);
    const raid = generateMap(getMap('r1_raid')!.map);
    expect(raid.enemySpawns.some((e) => e.tier === 'boss')).toBe(true);
  });

  it('generates the entire set of playable maps without error', () => {
    let generated = 0;
    for (const region of REGIONS.filter((r) => r.playable)) {
      for (const m of region.maps) {
        const g = generateMap(m);
        expect(g.w * g.h).toBeGreaterThan(0);
        generated++;
      }
    }
    expect(generated).toBeGreaterThanOrEqual(40); // ~40-50 main maps
  });

  it('uses modular ground tiles, not a single fill (roads carved in)', () => {
    const gen = generateMap(getMap('r1_coastpath')!.map);
    let roadTiles = 0;
    for (let i = 0; i < gen.ground.length; i++) if (gen.ground[i] === Ground.Road) roadTiles++;
    expect(roadTiles).toBeGreaterThan(50);
  });
});
