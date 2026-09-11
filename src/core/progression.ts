/**
 * Character progression: XP curve, levels 1..100, and the rule that gates
 * class selection until level 5. Every character starts classless
 * (Novice Fighter) and only unlocks a main class at level 5.
 */

export const MAX_LEVEL = 100;
export const CLASS_UNLOCK_LEVEL = 5;

/** XP required to go FROM `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  // Gentle early curve so the tutorial levels (1-5) come quickly.
  return Math.floor(40 + level * level * 12 + level * 25);
}

/** Total XP required to reach a given level from level 1. */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpForNextLevel(l);
  return sum;
}

export interface LevelState {
  level: number;
  xp: number; // xp accumulated toward the next level
}

export interface LevelUpResult {
  levelsGained: number;
  reachedClassUnlock: boolean;
}

/** Add XP and resolve any level-ups. Mutates and returns a summary. */
export function addXp(state: LevelState, amount: number): LevelUpResult {
  const before = state.level;
  state.xp += Math.max(0, amount);
  while (state.level < MAX_LEVEL && state.xp >= xpForNextLevel(state.level)) {
    state.xp -= xpForNextLevel(state.level);
    state.level += 1;
  }
  if (state.level >= MAX_LEVEL) state.xp = 0;
  return {
    levelsGained: state.level - before,
    reachedClassUnlock:
      before < CLASS_UNLOCK_LEVEL && state.level >= CLASS_UNLOCK_LEVEL,
  };
}

/** Class selection is locked until the character reaches level 5. */
export function canChooseClass(level: number): boolean {
  return level >= CLASS_UNLOCK_LEVEL;
}
