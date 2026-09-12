import Phaser from "phaser";
import { validateWorldGraph } from "../content/world";

export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  create(): void {
    validateWorldGraph();

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff).fillRect(0, 0, 8, 8).generateTexture("solid", 8, 8);
    graphics.clear().fillStyle(0x7fd35b).fillCircle(16, 16, 14);
    graphics.lineStyle(3, 0x173b2b).strokeCircle(16, 16, 14).generateTexture("enemy", 32, 32);
    graphics.clear().fillStyle(0xffffff).fillCircle(6, 6, 5).generateTexture("projectile", 12, 12);
    graphics.destroy();

    this.registry.set("classId", "swordsman");
    this.registry.set("mapId", "spawn_town");
    this.registry.set("spawnId", "start");
    this.scene.start("Preload");
  }
}
