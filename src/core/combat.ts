/**
 * Fast, cancellable melee combat core. Each attack runs through explicit
 * phases (startup -> active -> recovery) and exposes a cancel window during
 * which the player may chain into the next combo hit, dash-cancel, or fire a
 * skill. Inputs are buffered briefly so tight combos feel responsive without
 * being purely frame-perfect.
 */

export type AttackPhase = 'idle' | 'startup' | 'active' | 'recovery';

export interface AttackDef {
  key: string;
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  /**
   * Fraction (0..1) of the recovery phase after which the action may be
   * cancelled into a follow-up. 0 means the whole recovery is cancellable,
   * 1 means never. The active phase is never cancellable except by dash when
   * `dashCancelable` is set.
   */
  cancelWindowStart: number;
  damage: number;
  knockback: number;
  /** Reach of the hitbox in pixels ahead of the attacker. */
  reach: number;
  /** Half-width of the hit arc in pixels. */
  arc: number;
  /** Whether a dash may cancel this attack once it reaches recovery. */
  dashCancelable: boolean;
}

export interface ComboChain {
  /** Ordered attacks; input during the cancel window advances the chain. */
  attacks: AttackDef[];
  /** Max time (ms) after an attack ends before the combo counter resets. */
  linkWindowMs: number;
}

export type BufferedAction =
  | { kind: 'attack' }
  | { kind: 'dash' }
  | { kind: 'skill'; slot: number }
  | null;

export interface CombatState {
  phase: AttackPhase;
  comboIndex: number; // index of the attack currently executing
  phaseElapsed: number;
  /** Time since the last attack fully ended, for combo reset. */
  sinceEnd: number;
  buffered: BufferedAction;
  bufferAgeMs: number;
}

export const INPUT_BUFFER_MS = 160;

export function createCombatState(): CombatState {
  return {
    phase: 'idle',
    comboIndex: -1,
    phaseElapsed: 0,
    sinceEnd: Infinity,
    buffered: null,
    bufferAgeMs: 0,
  };
}

export function isAttacking(state: CombatState): boolean {
  return state.phase !== 'idle';
}

/** The active attack definition, or null when idle. */
export function currentAttack(state: CombatState, chain: ComboChain): AttackDef | null {
  if (state.comboIndex < 0 || state.comboIndex >= chain.attacks.length) return null;
  return chain.attacks[state.comboIndex];
}

/**
 * True when the current action may be cancelled into a follow-up right now.
 * This is the "cancel window".
 */
export function inCancelWindow(state: CombatState, chain: ComboChain): boolean {
  const atk = currentAttack(state, chain);
  if (!atk) return false;
  if (state.phase !== 'recovery') return false;
  const threshold = atk.recoveryMs * atk.cancelWindowStart;
  return state.phaseElapsed >= threshold;
}

/** A dash may cancel the current attack when it is recovering & flagged. */
export function canDashCancel(state: CombatState, chain: ComboChain): boolean {
  const atk = currentAttack(state, chain);
  if (!atk) return false;
  return atk.dashCancelable && state.phase === 'recovery';
}

export function bufferAction(state: CombatState, action: BufferedAction): void {
  state.buffered = action;
  state.bufferAgeMs = 0;
}

/**
 * Begin the first attack of the combo (or the next one when chaining).
 * Returns true if an attack actually started.
 */
export function startAttack(state: CombatState, chain: ComboChain): boolean {
  if (state.phase === 'idle') {
    state.comboIndex = 0;
  } else if (inCancelWindow(state, chain)) {
    if (state.comboIndex + 1 >= chain.attacks.length) {
      // End of chain; wrap to the first hit again for an endless flow.
      state.comboIndex = 0;
    } else {
      state.comboIndex += 1;
    }
  } else {
    return false;
  }
  state.phase = 'startup';
  state.phaseElapsed = 0;
  state.sinceEnd = 0;
  return true;
}

export interface CombatStep {
  /** True on the single frame the attack becomes active (spawn hitbox). */
  hitActivated: boolean;
  phase: AttackPhase;
}

/** Advance combat by dtMs. Applies buffered actions when legal. */
export function updateCombat(
  state: CombatState,
  chain: ComboChain,
  dtMs: number,
): CombatStep {
  let hitActivated = false;

  if (state.buffered) {
    state.bufferAgeMs += dtMs;
    if (state.bufferAgeMs > INPUT_BUFFER_MS) state.buffered = null;
  }

  if (state.phase === 'idle') {
    state.sinceEnd += dtMs;
    if (state.sinceEnd > chain.linkWindowMs) state.comboIndex = -1;
    // Consume a buffered attack from idle.
    if (state.buffered?.kind === 'attack') {
      state.buffered = null;
      startAttack(state, chain);
    }
    return { hitActivated: false, phase: 'idle' };
  }

  const atk = currentAttack(state, chain);
  if (!atk) {
    state.phase = 'idle';
    return { hitActivated: false, phase: 'idle' };
  }

  state.phaseElapsed += dtMs;

  if (state.phase === 'startup') {
    if (state.phaseElapsed >= atk.startupMs) {
      state.phaseElapsed -= atk.startupMs;
      state.phase = 'active';
      hitActivated = true;
    }
  } else if (state.phase === 'active') {
    if (state.phaseElapsed >= atk.activeMs) {
      state.phaseElapsed -= atk.activeMs;
      state.phase = 'recovery';
    }
  } else if (state.phase === 'recovery') {
    // Consume a buffered attack the moment we enter the cancel window.
    if (state.buffered?.kind === 'attack' && inCancelWindow(state, chain)) {
      state.buffered = null;
      startAttack(state, chain);
      return { hitActivated: false, phase: state.phase };
    }
    if (state.phaseElapsed >= atk.recoveryMs) {
      state.phase = 'idle';
      state.phaseElapsed = 0;
      state.sinceEnd = 0;
    }
  }

  return { hitActivated, phase: state.phase };
}
