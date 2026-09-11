import { describe, it, expect } from 'vitest';
import { MemoryStore, saveGame, loadGame, hasSave, deleteSave, migrate } from '../src/core/save';
import { newPlayerSave } from '../src/core/worldState';

describe('save / load', () => {
  it('round-trips a save', () => {
    const store = new MemoryStore();
    const save = newPlayerSave('Test');
    save.level = 7;
    save.classId = 'mage';
    save.clearedRaids = [1];
    saveGame(store, save);
    expect(hasSave(store)).toBe(true);
    const loaded = loadGame(store)!;
    expect(loaded.level).toBe(7);
    expect(loaded.classId).toBe('mage');
    expect(loaded.clearedRaids).toEqual([1]);
  });

  it('returns null when there is no save', () => {
    expect(loadGame(new MemoryStore())).toBeNull();
  });

  it('repairs a partial/old save via migration', () => {
    const migrated = migrate({ name: 'Old', level: 3 } as any);
    expect(migrated.name).toBe('Old');
    expect(migrated.level).toBe(3);
    expect(migrated.equipment).toBeDefined();
    expect(migrated.keybinds.dash).toBe('SHIFT');
  });

  it('survives corrupt data', () => {
    const store = new MemoryStore();
    store.setItem('solara-quest:save', '{not valid json');
    expect(loadGame(store)).toBeNull();
  });

  it('delete removes the save', () => {
    const store = new MemoryStore();
    saveGame(store, newPlayerSave());
    deleteSave(store);
    expect(hasSave(store)).toBe(false);
  });
});
