import Phaser from "phaser";
import { GAME_EVENTS, type HudState, type TouchAction, type TouchDirection } from "../events";

export class HudScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private touchControls: Phaser.GameObjects.GameObject[] = [];
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

    this.controlsText = this.add.text(18, this.scale.height - 42, "WASD/Pfeile: bewegen  ·  Shift: Dash  ·  Leertaste: Angriff  ·  Q: Skill  ·  E: eintreten", {
      fontSize: "13px", color: "#b8d5df", backgroundColor: "#081923cc", padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1000);

    this.layout(this.scale.width, this.scale.height);

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
    this.layout(size.width, size.height);
  }

  private layout(width: number, height: number): void {
    const mobile = width < 900 || matchMedia("(pointer: coarse)").matches;
    const topInset = mobile ? 104 : 16;
    this.statusText.setPosition(14, topInset).setFontSize(mobile ? 13 : 15).setWordWrapWidth(Math.max(260, width - 28));
    this.messageText.setPosition(width / 2, topInset + 44).setWordWrapWidth(Math.max(260, width - 40));
    this.promptText.setPosition(width / 2, mobile ? height - 190 : height - 54).setFontSize(mobile ? 14 : 17);
    this.controlsText.setPosition(18, height - 42).setVisible(!mobile);
    this.destroyTouchControls();
    if (mobile) this.createTouchControls(width, height);
  }

  private createTouchControls(width: number, height: number): void {
    const dpadX = 86;
    const dpadY = height - 94;
    this.createMoveButton(dpadX, dpadY - 42, "▲", "up");
    this.createMoveButton(dpadX, dpadY + 42, "▼", "down");
    this.createMoveButton(dpadX - 42, dpadY, "◀", "left");
    this.createMoveButton(dpadX + 42, dpadY, "▶", "right");

    this.createActionButton(width - 54, height - 72, "ANG", "attack", 0xf3c85b);
    this.createActionButton(width - 126, height - 72, "DASH", "dash", 0x69d2e7);
    this.createActionButton(width - 54, height - 142, "SKILL", "skill", 0xbd72ff);
    this.createActionButton(width - 126, height - 142, "E", "interact", 0x72e3a6);
  }

  private createMoveButton(x: number, y: number, label: string, direction: TouchDirection): void {
    const button = this.add.circle(x, y, 27, 0x081923, 0.76).setStrokeStyle(2, 0x9ec4d4, 0.8)
      .setScrollFactor(0).setDepth(1100).setInteractive();
    const text = this.add.text(x, y, label, { fontSize: "19px", color: "#ffffff" }).setOrigin(0.5).setDepth(1101);
    button.on("pointerdown", () => {
      button.setFillStyle(0x27647e, 0.94);
      this.game.events.emit(GAME_EVENTS.touchMove, { direction, pressed: true });
    });
    const release = () => {
      button.setFillStyle(0x081923, 0.76);
      this.game.events.emit(GAME_EVENTS.touchMove, { direction, pressed: false });
    };
    button.on("pointerup", release).on("pointerout", release);
    this.touchControls.push(button, text);
  }

  private createActionButton(x: number, y: number, label: string, action: TouchAction, colour: number): void {
    const button = this.add.circle(x, y, 29, 0x081923, 0.82).setStrokeStyle(2, colour, 0.95)
      .setScrollFactor(0).setDepth(1100).setInteractive();
    const text = this.add.text(x, y, label, { fontSize: label.length > 3 ? "10px" : "14px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5).setDepth(1101);
    button.on("pointerdown", () => {
      button.setFillStyle(colour, 0.55);
      this.game.events.emit(GAME_EVENTS.touchAction, action);
    });
    button.on("pointerup", () => button.setFillStyle(0x081923, 0.82));
    this.touchControls.push(button, text);
  }

  private destroyTouchControls(): void {
    this.touchControls.forEach((control) => control.destroy());
    this.touchControls = [];
    for (const direction of ["up", "down", "left", "right"] as TouchDirection[]) {
      this.game.events.emit(GAME_EVENTS.touchMove, { direction, pressed: false });
    }
  }

  private shutdown(): void {
    this.destroyTouchControls();
    this.game.events.off(GAME_EVENTS.hudUpdate, this.onHudUpdate, this);
    this.game.events.off(GAME_EVENTS.portalPrompt, this.onPortalPrompt, this);
    this.game.events.off(GAME_EVENTS.message, this.onMessage, this);
    this.scale.off("resize", this.onResize, this);
  }
}
