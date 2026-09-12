import Phaser from "phaser";
import { CLASS_DEFINITIONS } from "../content/classes";
import assassinSheet from "../../../assets/design/region_01/assassin_motion_master_v1.png";
import tankSheet from "../../../assets/design/region_01/tank_motion_master_v1.png";
import mageSheet from "../../../assets/design/region_01/mage_motion_master_v1.png";
import archerSheet from "../../../assets/design/region_01/archer_motion_master_v1.png";
import swordsmanSheet from "../../../assets/design/region_01/swordsman_motion_master_v1.png";

const CHARACTER_SHEETS: Record<keyof typeof CLASS_DEFINITIONS, string> = {
  assassin: assassinSheet,
  tank: tankSheet,
  mage: mageSheet,
  archer: archerSheet,
  swordsman: swordsmanSheet
};

export class PreloadScene extends Phaser.Scene {
  private failedAssets = new Set<string>();
  private barBg?: Phaser.GameObjects.Rectangle;
  private bar?: Phaser.GameObjects.Rectangle;
  private label?: Phaser.GameObjects.Text;

  constructor() { super("Preload"); }

  preload(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.failedAssets.clear();
    this.barBg = this.add.rectangle(width / 2, height / 2, Math.min(420, width - 48), 28, 0x102a38);
    const barWidth = this.barBg.width - 12;
    this.bar = this.add.rectangle(this.barBg.x - barWidth / 2, height / 2, 0, 14, 0xf3c85b).setOrigin(0, 0.5);
    this.label = this.add.text(width / 2, height / 2 - 48, "SOLARA QUEST lädt", {
      fontSize: "22px", color: "#eaf6ff"
    }).setOrigin(0.5).setAlign("center").setWordWrapWidth(Math.max(280, width - 48));

    this.load.on("progress", (value: number) => { if (this.bar) this.bar.width = barWidth * value; });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      this.failedAssets.add(file.key);
      this.label?.setText(`Asset konnte nicht geladen werden: ${file.key}`).setColor("#ff7b72");
    });

    for (const [id, url] of Object.entries(CHARACTER_SHEETS) as [keyof typeof CLASS_DEFINITIONS, string][]) {
      this.load.spritesheet(CLASS_DEFINITIONS[id].texture, url, {
        frameWidth: 237,
        frameHeight: 237,
        endFrame: 27
      });
    }
  }

  create(): void {
    for (const definition of Object.values(CLASS_DEFINITIONS)) {
      if (!this.textures.exists(definition.texture) || this.textures.get(definition.texture).frameTotal < 28) {
        this.failedAssets.add(definition.texture);
      }
    }

    if (this.failedAssets.size > 0) {
      this.barBg?.setVisible(false);
      this.bar?.setVisible(false);
      this.label?.setText([
        "CHARAKTER-ASSETS FEHLEN",
        [...this.failedAssets].join(", "),
        "Bitte Deployment neu bauen und danach die Seite aktualisieren."
      ]).setColor("#ff7b72");
      return;
    }

    this.barBg?.destroy();
    this.bar?.destroy();
    this.label?.destroy();
    this.scene.start("CharacterSelect");
  }
}
