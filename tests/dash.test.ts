import { describe, it, expect } from 'vitest';
import {
  createDashState, startDash, updateDash, isDashing, stopDash,
  canStartDash, dashLocksMovement,
} from '../src/core/dash';
import { Dir8 } from '../src/core/direction';
import { CLASS_DEFS, MAIN_CLASSES } from '../src/core/classes';

const cfg = CLASS_DEFS.novice.dash;

describe('dash (Shift)', () => {
  it('starts a dash in the requested direction and locks movement', () => {
    const s = createDashState();
    expect(startDash(s, cfg, 100, Dir8.NE)).toBe(true);
    expect(isDashing(s)).toBe(true);
    expect(s.dir).toBe(Dir8.NE);
    expect(dashLocksMovement(s)).toBe(true);
  });

  it('produces a visible multi-phase animation (startup -> active -> recovery)', () => {
    const s = createDashState();
    startDash(s, cfg, 100, Dir8.E);
    const phases = new Set<string>();
    let moved = 0;
    for (let t = 0; t < 2000 && isDashing(s); t += 16) {
      const step = updateDash(s, cfg, 16);
      phases.add(step.phase);
      moved += Math.abs(step.vx) * (16 / 1000);
    }
    expect(phases.has('startup')).toBe(true);
    expect(phases.has('active')).toBe(true);
    expect(phases.has('recovery')).toBe(true);
    // Covered roughly the configured distance during the active phase.
    expect(moved).toBeGreaterThan(cfg.distance * 0.7);
  });

  it('grants i-frames during the early active phase', () => {
    const s = createDashState();
    startDash(s, cfg, 100, Dir8.S);
    let sawInvuln = false;
    for (let t = 0; t < 2000 && isDashing(s); t += 16) {
      if (updateDash(s, cfg, 16).invulnerable) sawInvuln = true;
    }
    expect(sawInvuln).toBe(true);
  });

  it('respects cooldown and energy cost', () => {
    const s = createDashState();
    expect(canStartDash(s, cfg, cfg.energyCost - 1)).toBe(false); // not enough energy
    startDash(s, cfg, 100, Dir8.S);
    // finish the dash
    for (let t = 0; t < 2000 && isDashing(s); t += 16) updateDash(s, cfg, 16);
    // cooldown still active immediately after
    expect(s.cooldownRemaining).toBeGreaterThan(0);
    expect(canStartDash(s, cfg, 100)).toBe(false);
    // after cooldown elapses
    for (let t = 0; t < cfg.cooldownMs + 100; t += 16) updateDash(s, cfg, 16);
    expect(canStartDash(s, cfg, 100)).toBe(true);
  });

  it('can be stopped early at a wall (enters recovery, stops moving)', () => {
    const s = createDashState();
    startDash(s, cfg, 100, Dir8.E);
    updateDash(s, cfg, cfg.startupMs + 10); // into active
    stopDash(s);
    const step = updateDash(s, cfg, 16);
    expect(step.phase).toBe('recovery');
    expect(step.vx).toBe(0);
  });

  it('every class has its own distinct dash style', () => {
    const styles = MAIN_CLASSES.map((c) => CLASS_DEFS[c].dash.style);
    expect(new Set(styles).size).toBe(MAIN_CLASSES.length);
  });
});
