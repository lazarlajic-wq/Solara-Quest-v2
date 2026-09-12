import Phaser from "phaser";
import { CLASS_DEFINITIONS, CLASS_ORDER, type ClassId } from "../content/classes";

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super("CharacterSelect"); }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#07131b");
    this.add.text(width / 2, 62, "WÄHLE DEINE KLASSE", {
      fontSize: "32px", color: "#f3c85b", fontStyle: "bold"
    }).setOrigin(0.5);
    this.add.text(width / 2, 104, "Vier Richtungen · grosse Welt · lokaler Kampf-Prototyp", {
      fontSize: "15px", color: "#9ec4d4"
    }).setOrigin(0.5);

    const gap = Math.min(210, (width - 80) / 5);
    const startX = width / 2 - gap * 2;
    CLASS_ORDER.forEach((id, index) => this.createCard(id, startX + index * gap, height / 2));

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < CLASS_ORDER.length) this.select(CLASS_ORDER[index]);
    });
  }

  private createCard(id: ClassId, x: number, y: number): void {
    const definition = CLASS_DEFINITIONS[id];
    const panel = this.add.rectangle(x, y, 184, 292, 0x102a38, 0.96)
      .setStrokeStyle(2, definition.colour)
      .setInteractive({ useHandCursor: true });
    this.add.sprite(x, y - 48, definition.texture, 14).setScale(0.72);
    this.add.text(x, y + 86, definition.label, { fontSize: "19px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(x, y + 116, `${CLASS_ORDER.indexOf(id) + 1} · ${definition.attackKind === "melee" ? "Nahkampf" : "Fernkampf"}`, {
      fontSize: "13px", color: "#9ec4d4"
    }).setOrigin(0.5);
    panel.on("pointerover", () => panel.setFillStyle(0x194258));
    panel.on("pointerout", () => panel.setFillStyle(0x102a38));
    panel.on("pointerdown", () => this.select(id));
  }

  private select(id: ClassId): void {
    this.registry.set("classId", id);
    this.registry.set("mapId", "spawn_town");
    this.registry.set("spawnId", "start");
    this.scene.start("World", { mapId: "spawn_town", spawnId: "start" });
  }
}
