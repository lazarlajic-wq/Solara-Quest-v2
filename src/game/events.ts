/**
 * A tiny typed event bus bridging the Phaser world and the React UI. React
 * subscribes for HUD updates and menu triggers; the game emits state changes
 * and listens for menu actions (class choice, portal travel, etc.).
 */

import Phaser from 'phaser';
import type { ClassId } from '../core/classes';

export interface HudState {
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  xpNext: number;
  hp: number;
  maxHp: number;
  resource: number;
  maxResource: number;
  resourceKind: string;
  gold: number;
  regionName: string;
  mapName: string;
  comboCount: number;
  dashReady: boolean;
  skills: { name: string; ready: boolean }[];
}

export interface ToastMsg {
  text: string;
  kind: 'info' | 'quest' | 'levelup' | 'unlock' | 'danger';
}

type Events = {
  hud: (s: HudState) => void;
  toast: (t: ToastMsg) => void;
  openClassSelect: (payload: { level: number }) => void;
  openPortal: (payload: { dests: { mapId: string; label: string }[] }) => void;
  openDialog: (payload: { name: string; lines: string[] }) => void;
  chooseClass: (classId: ClassId) => void;
  travelTo: (mapId: string) => void;
  closeMenus: () => void;
  quest: (payload: { name: string; objectives: string[] }) => void;
};

class Bus extends Phaser.Events.EventEmitter {
  emitTyped<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    this.emit(event, ...args);
  }
  onTyped<K extends keyof Events>(event: K, cb: Events[K], ctx?: unknown): void {
    this.on(event, cb as (...a: unknown[]) => void, ctx);
  }
  offTyped<K extends keyof Events>(event: K, cb: Events[K]): void {
    this.off(event, cb as (...a: unknown[]) => void);
  }
}

export const gameBus = new Bus();
