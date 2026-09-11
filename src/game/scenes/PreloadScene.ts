/**
 * Loads optional external assets (see assetManifest.ts), then generates every
 * remaining runtime texture procedurally, registers animations, and hands off
 * to the World scene at the player's saved map. Real assets listed in the
 * manifest win over the procedural placeholders because the generators skip
 * any texture key that already exists.
 */

import Phaser from 'phaser';
import { makeTileTextures, makeObjectTextures, makeParticleTexture } from '../../art/sprites';
import { generateAllCharacters } from '../../art/registry';
import { registerAllAnims } from './WorldScene';
import { session } from '../session';
import { queueManifest, queueManifestAssets, AssetManifest } from '../assetManifest';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0b0e14).setOrigin(0);
    this.add.text(width / 2, height / 2 - 20, 'SOLARA QUEST', {
      fontSize: '40px', color: '#ffe9b0', fontFamily: 'Trebuchet MS', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 24, 'Assets werden geladen …', {
      fontSize: '16px', color: '#8fb0c0', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // A missing manifest is fine — swallow the load error.
    this.load.on('loaderror', () => {});
    queueManifest(this);
  }

  create(): void {
    const manifest = this.cache.json.get('assetManifest') as AssetManifest | undefined;
    if (queueManifestAssets(this, manifest)) {
      this.load.once('complete', () => this.buildAndStart());
      this.load.start();
    } else {
      this.buildAndStart();
    }
  }

  private buildAndStart(): void {
    // Generate procedural textures for every key not already provided.
    makeTileTextures(this);
    makeObjectTextures(this);
    makeParticleTexture(this);
    generateAllCharacters(this);
    registerAllAnims(this);
    this.scene.start('World', { mapId: session.save.currentMapId });
  }
}
