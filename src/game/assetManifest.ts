/**
 * Optional external-asset override. If `public/assets/manifest.json` exists and
 * lists textures/spritesheets, they are loaded and registered under their keys
 * BEFORE the procedural generators run. Because every generator early-outs when
 * a key already exists, any real asset (a PixelLab sprite, or one of the
 * reference PNGs) transparently replaces the code-drawn placeholder — no engine
 * changes required.
 *
 * Manifest shape (all paths are relative to the site root, e.g. "assets/x.png"):
 * {
 *   "images":       [{ "key": "obj_building_smithy", "path": "assets/smithy.png" }],
 *   "spritesheets": [{ "key": "char_swordsman", "path": "assets/hero.png",
 *                      "frameWidth": 48, "frameHeight": 48 }]
 * }
 *
 * A character spritesheet override must match the 9-column x 8-row layout
 * documented in src/art/sprites.ts (or ship its own anim config); tiles,
 * objects and the portal can be overridden freely as single images.
 */

import Phaser from 'phaser';

export interface AssetManifest {
  images?: { key: string; path: string }[];
  spritesheets?: { key: string; path: string; frameWidth: number; frameHeight: number }[];
}

export const MANIFEST_URL = 'assets/manifest.json';

/** Queue the manifest JSON (safe if the file is absent). */
export function queueManifest(scene: Phaser.Scene): void {
  scene.load.json('assetManifest', MANIFEST_URL);
}

/**
 * Given a loaded manifest, queue every listed asset. Returns true if anything
 * was queued (so the caller knows to run a second load pass).
 */
export function queueManifestAssets(scene: Phaser.Scene, manifest: AssetManifest | undefined): boolean {
  if (!manifest) return false;
  let queued = false;
  for (const img of manifest.images ?? []) {
    scene.load.image(img.key, img.path);
    queued = true;
  }
  for (const ss of manifest.spritesheets ?? []) {
    scene.load.spritesheet(ss.key, ss.path, { frameWidth: ss.frameWidth, frameHeight: ss.frameHeight });
    queued = true;
  }
  return queued;
}
