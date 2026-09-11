import { describe, it, expect } from 'vitest';
import {
  createCombatState, startAttack, updateCombat, inCancelWindow,
  bufferAction, canDashCancel, currentAttack,
} from '../src/core/combat';
import { CLASS_DEFS } from '../src/core/classes';

const chain = CLASS_DEFS.swordsman.combo;

function advance(state: any, ms: number, step = 16) {
  let activations = 0;
  for (let t = 0; t < ms; t += step) {
    if (updateCombat(state, chain, step).hitActivated) activations++;
  }
  return activations;
}

describe('combat combos & cancel windows', () => {
  it('starts the first attack and activates a hitbox after startup', () => {
    const s = createCombatState();
    expect(startAttack(s, chain)).toBe(true);
    expect(s.comboIndex).toBe(0);
    const atk = currentAttack(s, chain)!;
    const acts = advance(s, atk.startupMs + 20);
    expect(acts).toBe(1);
  });

  it('advances the combo only inside the cancel window', () => {
    const s = createCombatState();
    startAttack(s, chain);
    const atk = currentAttack(s, chain)!;
    // during startup: cannot chain
    expect(inCancelWindow(s, chain)).toBe(false);
    expect(startAttack(s, chain)).toBe(false);
    // move through startup + active into recovery cancel window
    updateCombat(s, chain, atk.startupMs + 5);
    updateCombat(s, chain, atk.activeMs + 5);
    updateCombat(s, chain, atk.recoveryMs * atk.cancelWindowStart + 5);
    expect(inCancelWindow(s, chain)).toBe(true);
    expect(startAttack(s, chain)).toBe(true);
    expect(s.comboIndex).toBe(1);
  });

  it('buffers an attack input and consumes it at the cancel window', () => {
    const s = createCombatState();
    startAttack(s, chain);
    const atk = currentAttack(s, chain)!;
    // buffer during active phase (too early to chain)
    updateCombat(s, chain, atk.startupMs + 5);
    bufferAction(s, { kind: 'attack' });
    // step into the cancel window; the buffered attack should fire the chain
    updateCombat(s, chain, atk.activeMs + 5);
    updateCombat(s, chain, atk.recoveryMs * atk.cancelWindowStart + 5);
    expect(s.comboIndex).toBe(1);
  });

  it('allows dash-cancel during recovery of a dash-cancelable attack', () => {
    const s = createCombatState();
    startAttack(s, chain);
    const atk = currentAttack(s, chain)!;
    updateCombat(s, chain, atk.startupMs + 5);
    updateCombat(s, chain, atk.activeMs + 5);
    updateCombat(s, chain, 5); // just into recovery
    expect(canDashCancel(s, chain)).toBe(true);
  });

  it('resets the combo after the link window lapses', () => {
    const s = createCombatState();
    startAttack(s, chain);
    const atk = currentAttack(s, chain)!;
    advance(s, atk.startupMs + atk.activeMs + atk.recoveryMs + 20);
    // now idle; wait longer than link window
    advance(s, chain.linkWindowMs + 100);
    expect(s.comboIndex).toBe(-1);
  });
});
