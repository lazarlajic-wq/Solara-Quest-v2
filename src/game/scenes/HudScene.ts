import Phaser from "phaser";
import { GAME_EVENTS, type HudState } from "../events";

export class HudScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;

  constructor() { super("HUD"); }

  create(): void {
    this.statusText = this.add.text(18, 16, "", {
      fontSize: "15px", color: "#ffffff", backgroundColor: "#081923dd", padding: { x: 12, y: 9 }
    }).setScrollFactor(0).setDepth(1000);
    this.promptText = this.add.text(this.scale.width / 2, this.scale.height - 54, "", {
      fontSize: "17px", color: "#f3c85b", backgroundColor: "#081923e8", padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.messageText = this.add.text(this.scale.width / 2, 48, "", {
      fontSize: "16px", color: "#d9f4ff", backgroundColor: "#103346e8", padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(false);

    this.add.text(18, this.scale.height - 42, "WASD/Pfeile: bewegen  ·  Shift: Dash  ·  Leertaste: Angriff  ·  Q: Skill  ·  E: eintreten", {
      fontSize: "13px", color: "#b8d5df", backgroundColor: "#081923cc", padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    this.game.events.on(GAME_EVENTS.hudUpdate, this.onHudUpdate, this);
    this.game.events.on(GAME_EVENTS.portalPrompt, this.onPortalPrompt, this);
    this.game.events.on(GAME_EVENTS.message, this.onMessage, this);
    this.scale.on("resize", this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private onHudUpdate(state: HudState): void {
    this.statusText.setText([
      `${state.classLabel}  HP ${state.health}/${state.maxHealth}`,
      state.mapLabel,
      `Gegner ${state.enemies}  Dash ${state.dashReady ? "bereit" : "lädt"}  Skill ${state.skillReady ? "bereit" : "lädt"}`
    ]);
  }

  private onPortalPrompt(label: string): void {
    this.promptText.setText(label ? `E · ${label}` : "");
  }

  private onMessage(message: string): void {
    this.messageTimer?.remove(false);
    this.messageText.setText(message).setVisible(true);
    this.messageTimer = this.time.delayedCall(1800, () => this.messageText.setVisible(false));
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.promptText.setPosition(size.width / 2, size.height - 54);
  }

  private shutdown(): void {
    this.game.events.off(GAME_EVENTS.hudUpdate, this.onHudUpdate, this);
    this.game.events.off(GAME_EVENTS.portalPrompt, this.onPortalPrompt, this);
    this.game.events.off(GAME_EVENTS.message, this.onMessage, this);
    this.scale.off("resize", this.onResize, this);
  }
}
