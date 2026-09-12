export const GAME_EVENTS = {
  hudUpdate: "solara:hud-update",
  message: "solara:message",
  portalPrompt: "solara:portal-prompt",
  touchMove: "solara:touch-move",
  touchAction: "solara:touch-action"
} as const;

export type TouchDirection = "up" | "down" | "left" | "right";
export type TouchAction = "dash" | "attack" | "skill" | "interact";

export interface TouchMoveEvent {
  direction: TouchDirection;
  pressed: boolean;
}

export interface HudState {
  classLabel: string;
  health: number;
  maxHealth: number;
  mapLabel: string;
  enemies: number;
  dashReady: boolean;
  skillReady: boolean;
}
