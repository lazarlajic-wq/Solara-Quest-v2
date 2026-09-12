import Phaser from "phaser";
import type { ClassDefinition } from "../content/classes";

export type Direction = "up" | "left" | "down" | "right";
export type PlayerAction = "idle" | "walk" | "run" | "dash" | "attack" | "skill" | "hurt" | "dead";

const ROW_BY_DIRECTION: Record<Direction, number> = { up: 0, left: 1, down: 2, right: 3 };
const COLUMN_BY_ACTION: Record<Exclude<PlayerAction, "hurt" | "dead">, number> = {
  idle: 0, walk: 1, run: 2, dash: 4, attack: 5, skill: 6
};

export interface PlayerKeys {
  up: Phaser.Input.Keyboard.Key;
  upAlt: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  downAlt: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  leftAlt: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  rightAlt: Phaser.Input.Keyboard.Key;
  dash: Phaser.Input.Keyboard.Key;
  attack: Phaser.Input.Keyboard.Key;
  skill: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
}

export type MovementState = Record<Direction, boolean>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly definition: ClassDefinition;
  direction: Direction = "down";
  action: PlayerAction = "idle";
  health: number;
  dashReadyAt = 0;
  attackReadyAt = 0;
  skillReadyAt = 0;
  invulnerableUntil = 0;
  lockedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: ClassDefinition) {
    super(scene, x, y, definition.texture, 14);
    this.definition = definition;
    this.health = definition.maxHealth;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.58).setDepth(20).setCollideWorldBounds(true);
    this.body?.setSize(48, 58).setOffset(94, 128);
  }

  updateMovement(time: number, keys: PlayerKeys, touch?: MovementState): void {
    if (this.action === "dead") return;
    if (time < this.lockedUntil) return;

    let x = 0;
    let y = 0;
    if (keys.left.isDown || keys.leftAlt.isDown || touch?.left) x -= 1;
    if (keys.right.isDown || keys.rightAlt.isDown || touch?.right) x += 1;
    if (keys.up.isDown || keys.upAlt.isDown || touch?.up) y -= 1;
    if (keys.down.isDown || keys.downAlt.isDown || touch?.down) y += 1;

    if (x !== 0 || y !== 0) {
      const vector = new Phaser.Math.Vector2(x, y).normalize().scale(this.definition.speed);
      this.setVelocity(vector.x, vector.y);
      if (Math.abs(vector.x) > Math.abs(vector.y)) this.direction = vector.x < 0 ? "left" : "right";
      else this.direction = vector.y < 0 ? "up" : "down";
      this.setAction(this.action === "dash" ? "dash" : "walk");
      this.setFlipX(false);
    } else {
      this.setVelocity(0, 0);
      this.setAction("idle");
    }
  }

  tryDash(time: number): boolean {
    if (time < this.dashReadyAt || time < this.lockedUntil || this.action === "dead") return false;
    const vector = this.facingVector().scale(this.definition.dashSpeed);
    this.action = "dash";
    this.setFrame(this.frameFor("dash"));
    this.setVelocity(vector.x, vector.y);
    this.lockedUntil = time + this.definition.dashDurationMs;
    this.invulnerableUntil = this.lockedUntil;
    this.dashReadyAt = time + 900;
    return true;
  }

  lockAction(action: "attack" | "skill", time: number, durationMs: number): void {
    this.action = action;
    this.setVelocity(0, 0);
    this.setFrame(this.frameFor(action));
    this.lockedUntil = time + durationMs;
  }

  takeDamage(amount: number, time: number): boolean {
    if (time < this.invulnerableUntil || this.action === "dead") return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = time + 650;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());
    if (this.health === 0) {
      this.action = "dead";
      this.setVelocity(0, 0);
      this.setAngle(90).setAlpha(0.7);
    }
    return true;
  }

  facingVector(): Phaser.Math.Vector2 {
    if (this.direction === "up") return new Phaser.Math.Vector2(0, -1);
    if (this.direction === "left") return new Phaser.Math.Vector2(-1, 0);
    if (this.direction === "right") return new Phaser.Math.Vector2(1, 0);
    return new Phaser.Math.Vector2(0, 1);
  }

  private setAction(action: "idle" | "walk" | "run" | "dash"): void {
    if (this.action === "attack" || this.action === "skill") return;
    this.action = action;
    this.setFrame(this.frameFor(action));
  }

  private frameFor(action: Exclude<PlayerAction, "hurt" | "dead">): number {
    return ROW_BY_DIRECTION[this.direction] * 7 + COLUMN_BY_ACTION[action];
  }
}
