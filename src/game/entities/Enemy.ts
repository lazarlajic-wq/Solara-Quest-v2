/**
 * Enemy entity with lightweight AI: idle -> chase (on aggro) -> telegraph ->
 * attack -> recover. Telegraphs are always shown before a hit so attacks stay
 * readable and fair, which the fast combat design requires. Ranged/magic
 * enemies fire projectiles; brutes and bosses hit harder with bigger tells.
 */

import Phaser from 'phaser';
import { Dir8, vectorToDir8 } from '../../core/direction';
import { animKey } from '../animations';
import type { EnemyTier } from '../../art/registry';

export interface EnemyStats {
  hp: number;
  speed: number;
  aggro: number;
  attackRange: number;
  telegraphMs: number;
  recoverMs: number;
  damage: number;
  xp: number;
  ranged: boolean;
}

const TIER_STATS: Record<EnemyTier, EnemyStats> = {
  normal: { hp: 26, speed: 70, aggro: 260, attackRange: 34, telegraphMs: 420, recoverMs: 700, damage: 7, xp: 22, ranged: false },
  ranged: { hp: 20, speed: 60, aggro: 340, attackRange: 240, telegraphMs: 560, recoverMs: 900, damage: 8, xp: 26, ranged: true },
  magic: { hp: 24, speed: 55, aggro: 320, attackRange: 220, telegraphMs: 700, recoverMs: 1100, damage: 11, xp: 30, ranged: true },
  brute: { hp: 70, speed: 48, aggro: 240, attackRange: 44, telegraphMs: 680, recoverMs: 1000, damage: 14, xp: 50, ranged: false },
  elite: { hp: 130, speed: 78, aggro: 320, attackRange: 48, telegraphMs: 520, recoverMs: 800, damage: 16, xp: 120, ranged: false },
  boss: { hp: 900, speed: 60, aggro: 600, attackRange: 70, telegraphMs: 800, recoverMs: 900, damage: 22, xp: 1500, ranged: false },
};

export type EnemyState = 'idle' | 'chase' | 'telegraph' | 'recover' | 'dead';

export interface EnemyAttack {
  ranged: boolean;
  x: number; y: number; dir: Dir8; damage: number; range: number;
}

export class Enemy {
  sprite: Phaser.GameObjects.Sprite;
  telegraphFx?: Phaser.GameObjects.Arc;
  tier: EnemyTier;
  stats: EnemyStats;
  hp: number;
  maxHp: number;
  state: EnemyState = 'idle';
  facing: Dir8 = Dir8.S;
  private timer = 0;
  private cooldown = 0;
  private hitFlash = 0;
  private phase = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, tier: EnemyTier, levelScale = 1) {
    this.tier = tier;
    this.stats = { ...TIER_STATS[tier] };
    this.stats.hp = Math.round(this.stats.hp * levelScale);
    this.stats.damage = Math.round(this.stats.damage * levelScale);
    this.hp = this.stats.hp;
    this.maxHp = this.hp;
    this.sprite = scene.add.sprite(x, y, `enemy_${tier}`, 0);
    this.sprite.setDepth(y);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get alive(): boolean { return this.state !== 'dead'; }
  get isBoss(): boolean { return this.tier === 'boss' || this.tier === 'elite'; }

  takeDamage(amount: number, knockback: number, fromX: number, fromY: number): boolean {
    if (this.state === 'dead') return false;
    this.hp -= amount;
    this.hitFlash = 90;
    this.sprite.setTint(0xff8888);
    // knockback
    const dx = this.sprite.x - fromX;
    const dy = this.sprite.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    if (!this.isBoss) {
      this.sprite.x += (dx / len) * (knockback * 0.15);
      this.sprite.y += (dy / len) * (knockback * 0.15);
    }
    // boss phase transitions
    if (this.tier === 'boss') {
      const frac = this.hp / this.maxHp;
      if (frac < 0.66 && this.phase === 1) this.phase = 2;
      if (frac < 0.33 && this.phase === 2) this.phase = 3;
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.state = 'dead';
    this.telegraphFx?.destroy();
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      angle: 90,
      duration: 260,
      onComplete: () => this.sprite.destroy(),
    });
  }

  update(dtMs: number, px: number, py: number): EnemyAttack | null {
    if (this.state === 'dead') return null;
    if (this.hitFlash > 0) {
      this.hitFlash -= dtMs;
      if (this.hitFlash <= 0) this.sprite.clearTint();
    }
    if (this.cooldown > 0) this.cooldown -= dtMs;

    const dx = px - this.sprite.x;
    const dy = py - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const face = vectorToDir8(dx, dy);
    if (face !== null) this.facing = face;

    const speedMul = this.phase >= 3 ? 1.4 : this.phase === 2 ? 1.15 : 1;
    let fire: EnemyAttack | null = null;

    switch (this.state) {
      case 'idle': {
        // small wander back toward home
        if (dist < this.stats.aggro) this.state = 'chase';
        this.playAnim('idle');
        break;
      }
      case 'chase': {
        if (dist > this.stats.aggro * 1.4) {
          this.state = 'idle';
          break;
        }
        if (dist <= this.stats.attackRange && this.cooldown <= 0) {
          this.state = 'telegraph';
          this.timer = this.stats.telegraphMs / speedMul;
          this.showTelegraph();
        } else {
          const len = dist || 1;
          const spd = this.stats.speed * speedMul * (dtMs / 1000);
          this.sprite.x += (dx / len) * spd;
          this.sprite.y += (dy / len) * spd;
          this.playAnim('walk');
        }
        break;
      }
      case 'telegraph': {
        this.timer -= dtMs;
        this.playAnim('idle');
        if (this.timer <= 0) {
          this.hideTelegraph();
          fire = {
            ranged: this.stats.ranged,
            x: this.sprite.x,
            y: this.sprite.y,
            dir: this.facing,
            damage: this.stats.damage,
            range: this.stats.attackRange + 6,
          };
          this.sprite.play(animKey(`enemy_${this.tier}`, 'attack', this.facing), true);
          this.state = 'recover';
          this.timer = this.stats.recoverMs;
          this.cooldown = this.stats.recoverMs + (this.tier === 'boss' ? 400 : 250);
        }
        break;
      }
      case 'recover': {
        this.timer -= dtMs;
        if (this.timer <= 0) this.state = 'chase';
        break;
      }
    }

    this.sprite.setDepth(this.sprite.y);
    if (this.telegraphFx) this.telegraphFx.setPosition(this.sprite.x, this.sprite.y);
    return fire;
  }

  private showTelegraph(): void {
    const color = this.tier === 'boss' ? 0xff3020 : 0xffcc33;
    const r = this.stats.attackRange;
    this.telegraphFx = this.sprite.scene.add
      .circle(this.sprite.x, this.sprite.y, r, color, 0.22)
      .setStrokeStyle(2, color, 0.8)
      .setDepth(this.sprite.y - 1);
    this.sprite.scene.tweens.add({
      targets: this.telegraphFx,
      alpha: { from: 0.15, to: 0.4 },
      duration: this.stats.telegraphMs,
    });
  }

  private hideTelegraph(): void {
    this.telegraphFx?.destroy();
    this.telegraphFx = undefined;
  }

  private playAnim(kind: 'idle' | 'walk'): void {
    const key = animKey(`enemy_${this.tier}`, kind, this.facing);
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }
}

export { TIER_STATS };
