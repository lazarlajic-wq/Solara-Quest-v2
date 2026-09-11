/**
 * Chunk-based ground renderer with viewport culling and neighbor pre-loading.
 * The map is never rendered in full: each 16x16-tile chunk is stamped into a
 * cached RenderTexture the first time it becomes visible, and chunks that move
 * far outside the viewport are destroyed to free GPU memory.
 */

import Phaser from 'phaser';
import { GeneratedMap } from '../core/mapgen';
import { TILE_SIZE, CHUNK_TILES } from '../core/regions';

const CHUNK_PX = TILE_SIZE * CHUNK_TILES; // 512

export class ChunkManager {
  private scene: Phaser.Scene;
  private map: GeneratedMap;
  private chunksX: number;
  private chunksY: number;
  private active = new Map<string, Phaser.GameObjects.RenderTexture>();
  private layer: Phaser.GameObjects.Layer;

  constructor(scene: Phaser.Scene, map: GeneratedMap) {
    this.scene = scene;
    this.map = map;
    this.chunksX = Math.ceil(map.w / CHUNK_TILES);
    this.chunksY = Math.ceil(map.h / CHUNK_TILES);
    this.layer = scene.add.layer();
    this.layer.setDepth(-1000);
  }

  get activeCount(): number {
    return this.active.size;
  }

  /** Recompute which chunks should be resident based on the camera. */
  update(): void {
    const cam = this.scene.cameras.main;
    const margin = CHUNK_PX; // preload one chunk beyond the viewport
    const minCx = Math.max(0, Math.floor((cam.scrollX - margin) / CHUNK_PX));
    const maxCx = Math.min(this.chunksX - 1, Math.floor((cam.scrollX + cam.width + margin) / CHUNK_PX));
    const minCy = Math.max(0, Math.floor((cam.scrollY - margin) / CHUNK_PX));
    const maxCy = Math.min(this.chunksY - 1, Math.floor((cam.scrollY + cam.height + margin) / CHUNK_PX));

    // Add newly visible chunks.
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx},${cy}`;
        if (!this.active.has(key)) this.buildChunk(cx, cy, key);
      }
    }
    // Remove chunks outside the range.
    for (const [key, rt] of this.active) {
      const [cx, cy] = key.split(',').map(Number);
      if (cx < minCx || cx > maxCx || cy < minCy || cy > maxCy) {
        rt.destroy();
        this.active.delete(key);
      }
    }
  }

  private buildChunk(cx: number, cy: number, key: string): void {
    const rt = this.scene.add.renderTexture(cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX);
    rt.setOrigin(0, 0);
    const startTx = cx * CHUNK_TILES;
    const startTy = cy * CHUNK_TILES;
    const stamps: { key: string; x: number; y: number }[] = [];
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = startTx + tx;
        const wy = startTy + ty;
        if (wx >= this.map.w || wy >= this.map.h) continue;
        const g = this.map.ground[wy * this.map.w + wx];
        stamps.push({ key: `tile_${g}`, x: tx * TILE_SIZE, y: ty * TILE_SIZE });
      }
    }
    rt.beginDraw();
    for (const s of stamps) rt.batchDrawFrame(s.key, undefined, s.x, s.y);
    rt.endDraw();
    this.layer.add(rt);
    this.active.set(key, rt);
  }

  destroy(): void {
    for (const rt of this.active.values()) rt.destroy();
    this.active.clear();
    this.layer.destroy();
  }
}
