export const GAME_EVENTS = {
  hudUpdate: "solara:hud-update",
  message: "solara:message",
  portalPrompt: "solara:portal-prompt"
} as const;

export interface HudState {
  classLabel: string;
  health: number;
  maxHealth: number;
  mapLabel: string;
  enemies: number;
  dashReady: boolean;
  skillReady: boolean;
}
