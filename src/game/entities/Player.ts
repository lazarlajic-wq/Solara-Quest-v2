/**
 * Player entity. Wraps the framework-agnostic movement / dash / combat cores
 * and drives an 8-direction sprite. The scene feeds it input and a collision
 * probe; the player reports gameplay events (hit activated, dash started) back
 * for the scene to resolve against enemies.
 */

import Phaser from 'phaser';
import { Dir8, inputToDir8, vectorToDir8 } from '../../core/direction';
import { resolveVelocity } from '../../core/movement';
import {
  DashState, createDashState, startDash, updateDash, isDashing,
  tickCooldown, stopDash,
} from '../../core/dash';
import {
  CombatState, createCombatState, updateCombat, startAttack, bufferAction,
  currentAttack, canDashCancel, isAttacking, inCancelWindow,
} from '../../core/combat';
import { ClassDef, getClass, ClassId } from '../../core/classes';
import { animKey } from '../animations';

export interface PlayerInput {
  up: boolean; down: boolean; left: boolean; right: boolean;
  dash: boolean; attack: boolean; aim?: { x: number; y: number } | null;
}

export type CollisionProbe = (x: number, y: number) => boolean;

export interface AttackEvent {
  dir: Dir8;
  reach: number;
  arc: number;
  damage: number;
  knockback: number;
  x: number;
  y: number;
}

export class Player {
  sprite: Phaser.GameObjects.Sprite;
  cls: ClassDef;
  classId: ClassId;
  facing: Dir8 = Dir8.S;

  hp: number;
  maxHp: number;
  resource: number;
  maxResource: number;
  power = 0;
  defense = 0;
  critChance = 0;

  dash: DashState = createDashState();
  combat: CombatState = createCombatState();
  comboCount = 0;

  invulnMs = 0;
  hitStopMs = 0;
  private running = false;

  constructor(scene: Phaser.Scene, x: number, y: number, classId: ClassId) {
    this.classId = classId;
    this.cls = getClass(classId);
    this.sprite = scene.add.sprite(x, y, `char_${classId}`, 0);
    this.sprite.setDepth(y);
    this.maxHp = this.cls.stats.maxHp;
    this.hp = this.maxHp;
    this.maxResource = this.cls.stats.maxResource;
    this.resource = this.maxResource;
    this.defense = this.cls.stats.defense;
    this.critChance = this.cls.stats.critChance;
  }

  setClass(classId: ClassId): void {
    this.classId = classId;
    this.cls = getClass(classId);
    this.sprite.setTexture(`char_${classId}`);
    this.maxHp = this.cls.stats.maxHp;
    this.hp = this.maxHp;
    this.maxResource = this.cls.stats.maxResource;
    this.resource = this.maxResource;
    this.defense = this.cls.stats.defense;
    this.critChance = this.cls.stats.critChance;
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  get invulnerable(): boolean {
    return this.invulnMs > 0 || (isDashing(this.dash) && this.lastDashInvuln);
  }
  private lastDashInvuln = false;

  takeDamage(amount: number): number {
    if (this.invulnerable) return 0;
    const dealt = Math.max(1, Math.round(amount - this.defense * 0.5));
    this.hp = Math.max(0, this.hp - dealt);
    this.invulnMs = 400;
    this.hitStopMs = 60;
    return dealt;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Returns an AttackEvent on the frame a hitbox activates, else null. */
  update(dtMs: number, input: PlayerInput, collide: CollisionProbe): AttackEvent | null {
    if (this.hitStopMs > 0) {
      this.hitStopMs -= dtMs;
      this.playAnim();
      return null;
    }
    if (this.invulnMs > 0) this.invulnMs -= dtMs;

    // resource regen
    this.resource = Math.min(
      this.maxResource,
      this.resource + this.cls.stats.resourceRegen * (dtMs / 1000),
    );

    // ---- Determine desired facing from input ----
    const moveDir = inputToDir8(input.up, input.down, input.left, input.right);
    if (input.aim) {
      const ad = vectorToDir8(input.aim.x, input.aim.y);
      if (ad !== null && (isAttacking(this.combat) || input.attack)) this.facing = ad;
    }
    if (moveDir !== null && !isAttacking(this.combat)) this.facing = moveDir;

    // ---- Dash ----
    if (input.dash) {
      const dir = moveDir ?? this.facing;
      if (canDashCancel(this.combat, this.cls.combo) || !isAttacking(this.combat)) {
        if (startDash(this.dash, this.cls.dash, this.resource, dir)) {
          this.resource -= this.cls.dash.energyCost;
          this.facing = dir;
          // dash cancels current attack recovery
          this.combat.phase = 'idle';
        }
      }
    }

    let vx = 0;
    let vy = 0;
    if (isDashing(this.dash)) {
      const step = updateDash(this.dash, this.cls.dash, dtMs);
      this.lastDashInvuln = step.invulnerable;
      vx = step.vx;
      vy = step.vy;
    } else {
      this.lastDashInvuln = false;
      tickCooldown(this.dash, dtMs);
      // ---- Attack input ----
      if (input.attack) {
        if (!isAttacking(this.combat)) startAttack(this.combat, this.cls.combo);
        else bufferAction(this.combat, { kind: 'attack' });
      }
      // movement only when not locked by attack startup/active
      const atk = currentAttack(this.combat, this.cls.combo);
      const locked = atk && (this.combat.phase === 'startup' || this.combat.phase === 'active');
      if (!locked && moveDir !== null) {
        this.running = input.up || input.down || input.left || input.right;
        const speed = this.running ? this.cls.stats.runSpeed : this.cls.stats.moveSpeed;
        const v = resolveVelocity(input, speed);
        vx = v.x;
        vy = v.y;
      }
    }

    // ---- Combat state machine ----
    const before = this.combat.comboIndex;
    const cstep = updateCombat(this.combat, this.cls.combo, dtMs);
    if (this.combat.comboIndex !== before && this.combat.phase === 'startup') {
      this.comboCount = this.combat.comboIndex + 1;
    }
    if (!isAttacking(this.combat)) this.comboCount = 0;

    // ---- Apply movement with collision (per-axis) ----
    this.moveWithCollision(vx * (dtMs / 1000), vy * (dtMs / 1000), collide);

    this.sprite.setDepth(this.sprite.y);
    this.playAnim();

    // ---- Emit hit event on activation ----
    if (cstep.hitActivated) {
      const atk = currentAttack(this.combat, this.cls.combo)!;
      const v = { x: Math.cos(this.dirAngle()), y: Math.sin(this.dirAngle()) };
      return {
        dir: this.facing,
        reach: atk.reach,
        arc: atk.arc,
        damage: atk.damage + this.power,
        knockback: atk.knockback,
        x: this.sprite.x + v.x * (atk.reach * 0.4),
        y: this.sprite.y + v.y * (atk.reach * 0.4),
      };
    }
    return null;
  }

  private dirAngle(): number {
    const v = { x: 0, y: 0 };
    const map: Record<Dir8, [number, number]> = {
      [Dir8.S]: [0, 1], [Dir8.SW]: [-1, 1], [Dir8.W]: [-1, 0], [Dir8.NW]: [-1, -1],
      [Dir8.N]: [0, -1], [Dir8.NE]: [1, -1], [Dir8.E]: [1, 0], [Dir8.SE]: [1, 1],
    };
    const [x, y] = map[this.facing];
    v.x = x; v.y = y;
    return Math.atan2(v.y, v.x);
  }

  private moveWithCollision(dx: number, dy: number, collide: CollisionProbe): void {
    const r = 9; // collider half-size
    const s = this.sprite;
    // X axis
    if (dx !== 0) {
      const nx = s.x + dx;
      const edge = nx + Math.sign(dx) * r;
      if (!collide(edge, s.y - r) && !collide(edge, s.y + r)) {
        s.x = nx;
      } else if (isDashing(this.dash)) {
        stopDash(this.dash);
      }
    }
    // Y axis
    if (dy !== 0) {
      const ny = s.y + dy;
      const edge = ny + Math.sign(dy) * r;
      if (!collide(s.x - r, edge) && !collide(s.x + r, edge)) {
        s.y = ny;
      } else if (isDashing(this.dash)) {
        stopDash(this.dash);
      }
    }
  }

  private playAnim(): void {
    const sheet = `char_${this.classId}`;
    let kind: 'idle' | 'walk' | 'attack' | 'cast' = 'idle';
    if (isAttacking(this.combat) && this.combat.phase !== 'idle' && !inCancelWindow(this.combat, this.cls.combo)) {
      kind = 'attack';
    } else if (isDashing(this.dash)) {
      kind = 'walk';
    } else if (this.running) {
      kind = 'walk';
    }
    const key = animKey(sheet, kind, this.facing);
    const cur = this.sprite.anims.currentAnim?.key;
    if (cur !== key) this.sprite.play(key, true);
  }
}
