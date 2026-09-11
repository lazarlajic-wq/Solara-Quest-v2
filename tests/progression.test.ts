import { describe, it, expect } from 'vitest';
import { addXp, canChooseClass, CLASS_UNLOCK_LEVEL, MAX_LEVEL, xpForNextLevel } from '../src/core/progression';
import { newPlayerSave } from '../src/core/worldState';
import { startingSetFor } from '../src/core/equipment';
import { CLASS_DEFS } from '../src/core/classes';

describe('progression & class unlock', () => {
  it('a new character starts as novice with no main class', () => {
    const save = newPlayerSave();
    expect(save.classId).toBe('novice');
    expect(save.level).toBe(1);
  });

  it('class selection is locked before level 5 and unlocked at level 5', () => {
    for (let lvl = 1; lvl < CLASS_UNLOCK_LEVEL; lvl++) {
      expect(canChooseClass(lvl)).toBe(false);
    }
    expect(canChooseClass(CLASS_UNLOCK_LEVEL)).toBe(true);
    expect(canChooseClass(CLASS_UNLOCK_LEVEL + 3)).toBe(true);
  });

  it('gaining enough XP crosses the class-unlock threshold', () => {
    const state = { level: 1, xp: 0 };
    let bigXp = 0;
    for (let l = 1; l < CLASS_UNLOCK_LEVEL; l++) bigXp += xpForNextLevel(l);
    const res = addXp(state, bigXp);
    expect(state.level).toBe(CLASS_UNLOCK_LEVEL);
    expect(res.reachedClassUnlock).toBe(true);
    expect(canChooseClass(state.level)).toBe(true);
  });

  it('never exceeds max level', () => {
    const state = { level: 1, xp: 0 };
    addXp(state, 1e12);
    expect(state.level).toBe(MAX_LEVEL);
  });

  it('a chosen class receives its full region-1 starting set', () => {
    for (const classId of ['assassin', 'tank', 'mage', 'archer', 'swordsman'] as const) {
      const set = startingSetFor(classId);
      expect(set.length).toBeGreaterThan(0);
      // every item id is region 1 and belongs to the class
      for (const id of set) {
        expect(id.startsWith(`${classId}_r1_`)).toBe(true);
      }
      // the class must define at least three starter skills
      expect(CLASS_DEFS[classId].skills.length).toBeGreaterThanOrEqual(3);
    }
  });
});
