/**
 * NPC entity: an 8-direction humanoid that idles, can face the player, and
 * exposes a role + dialog. Class-master NPCs additionally trigger the class
 * selection flow.
 */

import Phaser from 'phaser';
import { Dir8, vectorToDir8 } from '../../core/direction';
import { animKey } from '../animations';

export class Npc {
  sprite: Phaser.GameObjects.Sprite;
  role: string;
  textureKey: string;
  facing: Dir8 = Dir8.S;
  label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, role: string, textureKey: string) {
    this.role = role;
    this.textureKey = textureKey;
    this.sprite = scene.add.sprite(x, y, textureKey, 0);
    this.sprite.setDepth(y);
    this.label = scene.add
      .text(x, y - 34, role, { fontSize: '10px', color: '#ffe9b0', fontFamily: 'monospace' })
      .setOrigin(0.5)
      .setDepth(y);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  faceToward(px: number, py: number): void {
    const d = vectorToDir8(px - this.sprite.x, py - this.sprite.y);
    if (d !== null) this.facing = d;
    const key = animKey(this.textureKey, 'idle', this.facing);
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }
}
