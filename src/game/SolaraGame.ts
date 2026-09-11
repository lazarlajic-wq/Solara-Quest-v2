/**
 * Phaser game factory. Creates the game bound to a container element with the
 * pixel-art render settings the project needs (nearest-neighbour scaling,
 * rounded pixels) and the fixed scene order.
 */

import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0e14',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    fps: { target: 60, min: 30 },
    scene: [PreloadScene, WorldScene],
    // Pause simulation when the tab is hidden (performance requirement).
    disableContextMenu: true,
    autoFocus: true,
  });
}
