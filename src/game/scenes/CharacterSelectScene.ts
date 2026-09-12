import Phaser from "phaser";
import { CLASS_DEFINITIONS, CLASS_ORDER, type ClassId } from "../content/classes";

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super("CharacterSelect"); }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#07131b");
    const mobile = width < 900;
    const top = mobile ? 116 : 62;
    this.add.text(width / 2, top, "WÄHLE DEINE KLASSE", {
      fontSize: mobile ? "24px" : "32px", color: "#f3c85b", fontStyle: "bold"
    }).setOrigin(0.5);
    this.add.text(width / 2, top + 42, "Vier Richtungen · grosse Welt · lokaler Kampf-Prototyp", {
      fontSize: mobile ? "12px" : "15px", color: "#9ec4d4", align: "center", wordWrap: { width: width - 36 }
    }).setOrigin(0.5);

    if (mobile) {
      const columns = width < 560 ? 2 : 3;
      const gapX = Math.min(180, (width - 28) / columns);
      const gapY = 196;
      const rows = Math.ceil(CLASS_ORDER.length / columns);
      const startY = Math.max(top + 150, height / 2 - ((rows - 1) * gapY) / 2);
      CLASS_ORDER.forEach((id, index) => {
        const row = Math.floor(index / columns);
        const itemsInRow = Math.min(columns, CLASS_ORDER.length - row * columns);
        const rowStart = width / 2 - ((itemsInRow - 1) * gapX) / 2;
        this.createCard(id, rowStart + (index % columns) * gapX, startY + row * gapY, true);
      });
    } else {
      const gap = Math.min(210, (width - 80) / 5);
      const startX = width / 2 - gap * 2;
      CLASS_ORDER.forEach((id, index) => this.createCard(id, startX + index * gap, height / 2, false));
    }

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < CLASS_ORDER.length) this.select(CLASS_ORDER[index]);
    });
  }

  private createCard(id: ClassId, x: number, y: number, compact: boolean): void {
    const definition = CLASS_DEFINITIONS[id];
    const panel = this.add.rectangle(x, y, compact ? 150 : 184, compact ? 178 : 292, 0x102a38, 0.96)
      .setStrokeStyle(2, definition.colour)
      .setInteractive({ useHandCursor: true });
    this.add.sprite(x, y - (compact ? 20 : 48), definition.texture, 14).setScale(compact ? 0.46 : 0.72);
    this.add.text(x, y + (compact ? 48 : 86), definition.label, { fontSize: compact ? "15px" : "19px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(x, y + (compact ? 70 : 116), `${CLASS_ORDER.indexOf(id) + 1} · ${definition.attackKind === "melee" ? "Nahkampf" : "Fernkampf"}`, {
      fontSize: compact ? "11px" : "13px", color: "#9ec4d4"
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
