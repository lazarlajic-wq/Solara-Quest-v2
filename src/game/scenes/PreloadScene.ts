import Phaser from "phaser";
import { CLASS_DEFINITIONS } from "../content/classes";

const CHARACTER_SHEETS: Record<string, URL> = {
  assassin: new URL("../../../assets/design/region_01/assassin_motion_master_v1.png", import.meta.url),
  tank: new URL("../../../assets/design/region_01/tank_motion_master_v1.png", import.meta.url),
  mage: new URL("../../../assets/design/region_01/mage_motion_master_v1.png", import.meta.url),
  archer: new URL("../../../assets/design/region_01/archer_motion_master_v1.png", import.meta.url),
  swordsman: new URL("../../../assets/design/region_01/swordsman_motion_master_v1.png", import.meta.url)
};

export class PreloadScene extends Phaser.Scene {
  constructor() { super("Preload"); }

  preload(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const barBg = this.add.rectangle(width / 2, height / 2, 420, 28, 0x102a38);
    const bar = this.add.rectangle(width / 2 - 204, height / 2, 0, 14, 0xf3c85b).setOrigin(0, 0.5);
    const label = this.add.text(width / 2, height / 2 - 48, "SOLARA QUEST lädt", {
      fontSize: "22px", color: "#eaf6ff"
    }).setOrigin(0.5);

    this.load.on("progress", (value: number) => { bar.width = 408 * value; });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      label.setText(`Asset konnte nicht geladen werden: ${file.key}`);
      label.setColor("#ff7b72");
    });
    this.load.once("complete", () => { barBg.destroy(); bar.destroy(); label.destroy(); });

    for (const [id, url] of Object.entries(CHARACTER_SHEETS)) {
      this.load.spritesheet(CLASS_DEFINITIONS[id as keyof typeof CLASS_DEFINITIONS].texture, url.href, {
        frameWidth: 237,
        frameHeight: 237,
        endFrame: 27
      });
    }
  }

  create(): void { this.scene.start("CharacterSelect"); }
}
