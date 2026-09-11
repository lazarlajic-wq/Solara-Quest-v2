/**
 * Save / load. Storage is injected so it can be unit-tested with an in-memory
 * store and used with localStorage in the browser. Handles version migration
 * defensively (unknown/old saves fall back to a fresh save).
 */

import { PlayerSave, SAVE_VERSION, newPlayerSave, emptyEquipment } from './worldState';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'solara-quest:save';

export class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export function saveGame(store: KeyValueStore, save: PlayerSave): void {
  store.setItem(SAVE_KEY, JSON.stringify(save));
}

/** Load a save, migrating/repairing where possible. Returns null if none. */
export function loadGame(store: KeyValueStore): PlayerSave | null {
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerSave>;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function hasSave(store: KeyValueStore): boolean {
  return store.getItem(SAVE_KEY) !== null;
}

export function deleteSave(store: KeyValueStore): void {
  store.removeItem(SAVE_KEY);
}

/** Merge a (possibly partial / old) save onto fresh defaults. */
export function migrate(partial: Partial<PlayerSave>): PlayerSave {
  const base = newPlayerSave(partial.name ?? 'Solaris');
  const merged: PlayerSave = {
    ...base,
    ...partial,
    version: SAVE_VERSION,
    equipment: { ...emptyEquipment(), ...(partial.equipment ?? {}) },
    inventory: partial.inventory ?? base.inventory,
    pets: partial.pets ?? base.pets,
    clearedRaids: partial.clearedRaids ?? base.clearedRaids,
    completedQuests: partial.completedQuests ?? base.completedQuests,
    keybinds: { ...base.keybinds, ...(partial.keybinds ?? {}) },
  };
  return merged;
}

/** Browser adapter (guards against disabled storage / private mode). */
export function browserStore(): KeyValueStore {
  try {
    const ls = globalThis.localStorage;
    ls.getItem(SAVE_KEY); // probe
    return ls;
  } catch {
    return new MemoryStore();
  }
}
