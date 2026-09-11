/**
 * Live game session: the single source of truth for the player's persistent
 * state during play. Wraps a PlayerSave, syncs to a KeyValueStore, and holds
 * the transient "entered this map at X" spawn override used on transitions.
 */

import { PlayerSave, newPlayerSave } from '../core/worldState';
import { KeyValueStore, browserStore, loadGame, saveGame } from '../core/save';
import { LevelState } from '../core/progression';

class Session {
  save: PlayerSave;
  store: KeyValueStore;
  /** When set, the next WorldScene spawns the player here instead of default. */
  spawnOverride: { x: number; y: number } | null = null;

  constructor() {
    this.store = browserStore();
    this.save = loadGame(this.store) ?? newPlayerSave();
  }

  get level(): LevelState {
    return { level: this.save.level, xp: this.save.xp };
  }
  set level(l: LevelState) {
    this.save.level = l.level;
    this.save.xp = l.xp;
  }

  persist(): void {
    saveGame(this.store, this.save);
  }

  reset(): void {
    this.save = newPlayerSave();
    this.spawnOverride = null;
    this.persist();
  }
}

export const session = new Session();
