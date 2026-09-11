/**
 * Generates every runtime texture (tiles, objects, characters, portal,
 * particles) and registers animations, then hands off to the World scene at
 * the player's saved map. A short generated splash is shown while building.
 */

import Phaser from 'phaser';
import { makeTileTextures, makeObjectTextures, makeParticleTexture } from '../../art/sprites';
import { generateAllCharacters } from '../../art/registry';
import { registerAllAnims } from './WorldScene';
import { session } from '../session';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0b0e14).setOrigin(0);
    this.add.text(width / 2, height / 2 - 20, 'SOLARA QUEST', {
      fontSize: '40px', color: '#ffe9b0', fontFamily: 'Trebuchet MS', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 24, 'Assets werden erzeugt …', {
      fontSize: '16px', color: '#8fb0c0', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Build all art on the next tick so the splash paints first.
    this.time.delayedCall(30, () => {
      makeTileTextures(this);
      makeObjectTextures(this);
      makeParticleTexture(this);
      generateAllCharacters(this);
      registerAllAnims(this);
      this.scene.start('World', { mapId: session.save.currentMapId });
    });
  }
}
