/**
 * Dash state machine. Framework-agnostic so it can be unit-tested and driven
 * by the Phaser scene. A dash has real phases (not just a teleport):
 * startup -> active -> recovery, each with its own duration. During `active`
 * the entity moves along a fixed direction at a high speed; the caller is
 * responsible for collision checks (walls / map bounds) and may terminate the
 * dash early via `stopDash`.
 */

import { Dir8, DIR8_VECTOR } from './direction';

export type DashPhase = 'idle' | 'startup' | 'active' | 'recovery';

export interface DashConfig {
  /** Total distance covered during the active phase, in pixels. */
  distance: number;
  /** Duration of each phase in milliseconds. */
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  /** Cooldown measured from the moment the dash starts. */
  cooldownMs: number;
  /** Stamina / energy consumed per dash. */
  energyCost: number;
  /** Portion of the active phase (0..1) that grants invulnerability frames. */
  iframeFraction: number;
  /** Cosmetic identifier for the class-specific dash style. */
  style: string;
}

export interface DashState {
  phase: DashPhase;
  dir: Dir8;
  phaseElapsed: number;
  cooldownRemaining: number;
  /** Distance already applied this dash (for progress tracking). */
  distanceApplied: number;
}

export function createDashState(): DashState {
  return {
    phase: 'idle',
    dir: Dir8.S,
    phaseElapsed: 0,
    cooldownRemaining: 0,
    distanceApplied: 0,
  };
}

export function isDashing(state: DashState): boolean {
  return state.phase !== 'idle';
}

/** During the active phase the entity should ignore normal movement input. */
export function dashLocksMovement(state: DashState): boolean {
  return state.phase === 'startup' || state.phase === 'active';
}

export function canStartDash(
  state: DashState,
  cfg: DashConfig,
  energy: number,
): boolean {
  return (
    state.phase === 'idle' &&
    state.cooldownRemaining <= 0 &&
    energy >= cfg.energyCost
  );
}

/**
 * Attempt to start a dash in `dir`. Returns true and mutates state on success.
 * The caller should deduct `cfg.energyCost` when this returns true.
 */
export function startDash(
  state: DashState,
  cfg: DashConfig,
  energy: number,
  dir: Dir8,
): boolean {
  if (!canStartDash(state, cfg, energy)) return false;
  state.phase = 'startup';
  state.dir = dir;
  state.phaseElapsed = 0;
  state.distanceApplied = 0;
  state.cooldownRemaining = cfg.cooldownMs;
  return true;
}

/** Immediately end the dash (e.g. blocked by a wall) and enter recovery. */
export function stopDash(state: DashState): void {
  if (state.phase === 'startup' || state.phase === 'active') {
    state.phase = 'recovery';
    state.phaseElapsed = 0;
  }
}

export interface DashStep {
  /** Velocity to apply this frame (px/second). */
  vx: number;
  vy: number;
  /** True while the entity should be immune to damage. */
  invulnerable: boolean;
  phase: DashPhase;
}

/**
 * Advance the dash by `dtMs` milliseconds and return the velocity to apply.
 * The active phase produces a bell-ish speed curve so the dash accelerates
 * and decelerates instead of snapping to a constant speed.
 */
export function updateDash(
  state: DashState,
  cfg: DashConfig,
  dtMs: number,
): DashStep {
  if (state.cooldownRemaining > 0) {
    state.cooldownRemaining = Math.max(0, state.cooldownRemaining - dtMs);
  }

  const noStep: DashStep = { vx: 0, vy: 0, invulnerable: false, phase: state.phase };
  if (state.phase === 'idle') return noStep;

  state.phaseElapsed += dtMs;

  if (state.phase === 'startup') {
    if (state.phaseElapsed >= cfg.startupMs) {
      state.phaseElapsed -= cfg.startupMs;
      state.phase = 'active';
    } else {
      return { vx: 0, vy: 0, invulnerable: false, phase: 'startup' };
    }
  }

  if (state.phase === 'active') {
    const t = Math.min(1, state.phaseElapsed / cfg.activeMs);
    // Speed curve: sin(pi*t) gives smooth accel/decel, integrates to
    // (2/pi)*activeSeconds -> scale so total distance == cfg.distance.
    const activeSeconds = cfg.activeMs / 1000;
    const peakSpeed = (cfg.distance * Math.PI) / (2 * activeSeconds);
    const speed = peakSpeed * Math.sin(Math.PI * t);
    const vec = DIR8_VECTOR[state.dir];
    const invulnerable = t <= cfg.iframeFraction;
    if (state.phaseElapsed >= cfg.activeMs) {
      state.phaseElapsed -= cfg.activeMs;
      state.phase = 'recovery';
    }
    return { vx: vec.x * speed, vy: vec.y * speed, invulnerable, phase: 'active' };
  }

  if (state.phase === 'recovery') {
    if (state.phaseElapsed >= cfg.recoveryMs) {
      state.phase = 'idle';
      state.phaseElapsed = 0;
    }
    return { vx: 0, vy: 0, invulnerable: false, phase: 'recovery' };
  }

  return noStep;
}

/** Tick only the cooldown (used when idle). */
export function tickCooldown(state: DashState, dtMs: number): void {
  if (state.cooldownRemaining > 0) {
    state.cooldownRemaining = Math.max(0, state.cooldownRemaining - dtMs);
  }
}
