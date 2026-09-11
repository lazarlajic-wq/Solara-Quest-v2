/**
 * Runtime pixel-art generator. Everything the game renders is a real RGBA
 * texture drawn here into Phaser canvas textures — no external image files.
 * The workhorse is `makeCharacterSheet`, which builds an 8-direction sheet
 * (idle / walk / attack / cast-hit) used for the player, NPCs and humanoid
 * enemies. Equipment recolors the body & accent layers via tints.
 *
 * These sprites are functional and stylistically consistent (top-down,
 * teal-cloaked heroes echoing the reference art). They are intentionally
 * simple vector-drawn pixel art, not hand-authored AAA sheets.
 */

import Phaser from 'phaser';
import { Dir8, DIR8_ALL, DIR8_VECTOR } from '../core/direction';
import { COLORS, GROUND_COLORS } from './palette';
import { Ground } from '../core/mapgen';

export const FRAME_W = 48;
export const FRAME_H = 48;
export const SHEET_COLS = 9;
export const SHEET_ROWS = 8;

// Column layout inside a character sheet row.
export const COL = {
  idle: 0,
  walk: [1, 2, 3, 4],
  attack: [5, 6, 7],
  casthit: 8,
};

export type WeaponType = 'sword' | 'dagger' | 'staff' | 'bow' | 'mace' | 'none';

export interface CharacterArtOpts {
  body: string; // main tunic/armor color
  accent: string; // cloak / trim
  hair: string;
  skin: string;
  weapon: WeaponType;
  shield: boolean;
  scale?: number; // body scale multiplier (bosses/big npcs)
}

function ctxRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw one character frame centered in a FRAME_W x FRAME_H cell. */
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  dir: Dir8,
  opts: CharacterArtOpts,
  anim: 'idle' | 'walk' | 'attack' | 'cast',
  phase: number, // 0..1 within the animation
) {
  const cx = ox + FRAME_W / 2;
  const feetY = oy + FRAME_H - 8;
  const vec = DIR8_VECTOR[dir];
  const s = opts.scale ?? 1;
  const facingAway = vec.y < -0.1;

  // shadow
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 2, 11 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // walk bob
  const bob = anim === 'walk' ? Math.sin(phase * Math.PI * 2) * 1.6 : 0;
  const legSwing = anim === 'walk' ? Math.sin(phase * Math.PI * 2) * 3 : 0;
  const bodyY = feetY - 20 * s + bob;

  // legs
  ctx.fillStyle = COLORS.leather;
  ctx.fillRect(cx - 5 * s + legSwing, feetY - 8, 4 * s, 8 * s);
  ctx.fillRect(cx + 1 * s - legSwing, feetY - 8, 4 * s, 8 * s);

  // cloak behind (accent) — bigger when facing away
  ctx.fillStyle = opts.accent;
  const cloakW = facingAway ? 20 * s : 14 * s;
  ctxRound(ctx, cx - cloakW / 2, bodyY - 2, cloakW, 22 * s, 4);
  ctx.fill();

  // body (armor / tunic)
  ctx.fillStyle = opts.body;
  ctxRound(ctx, cx - 8 * s, bodyY, 16 * s, 18 * s, 4);
  ctx.fill();
  // body outline
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // head
  const headX = cx + vec.x * 2 * s;
  const headY = bodyY - 6 * s;
  ctx.fillStyle = opts.hair;
  ctx.beginPath();
  ctx.arc(headX, headY, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  if (!facingAway) {
    // face
    ctx.fillStyle = opts.skin;
    ctx.beginPath();
    ctx.arc(headX, headY + 1 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    // eyes, offset toward facing x
    ctx.fillStyle = COLORS.outline;
    const ex = headX + vec.x * 1.5 * s;
    ctx.fillRect(ex - 3 * s, headY, 1.4 * s, 1.6 * s);
    ctx.fillRect(ex + 1.5 * s, headY, 1.4 * s, 1.6 * s);
  }

  // weapon
  if (opts.weapon !== 'none') {
    let baseAngle = Math.atan2(vec.y, vec.x);
    if (anim === 'attack') {
      // swing arc across the attack
      baseAngle += (-0.9 + 1.8 * phase);
    } else if (anim === 'cast') {
      baseAngle += Math.sin(phase * Math.PI) * 0.3;
    }
    const handX = cx + Math.cos(baseAngle) * 6 * s;
    const handY = bodyY + 6 * s + Math.sin(baseAngle) * 4 * s;
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(baseAngle);
    drawWeapon(ctx, opts.weapon, s, opts.accent);
    ctx.restore();
  }

  // shield (offhand)
  if (opts.shield) {
    ctx.fillStyle = COLORS.steel;
    const sxa = Math.atan2(vec.y, vec.x) + Math.PI / 2;
    const sx = cx + Math.cos(sxa) * 8 * s;
    const sy = bodyY + 6 * s + Math.sin(sxa) * 4 * s;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.steelDark;
    ctx.stroke();
  }
}

function drawWeapon(ctx: CanvasRenderingContext2D, w: WeaponType, s: number, accent: string) {
  switch (w) {
    case 'sword':
      ctx.fillStyle = COLORS.steel;
      ctx.fillRect(0, -1.5 * s, 20 * s, 3 * s);
      ctx.fillStyle = COLORS.leather;
      ctx.fillRect(-4 * s, -2 * s, 4 * s, 4 * s);
      break;
    case 'dagger':
      ctx.fillStyle = COLORS.steel;
      ctx.fillRect(0, -1.2 * s, 11 * s, 2.4 * s);
      ctx.fillStyle = COLORS.leather;
      ctx.fillRect(-3 * s, -1.5 * s, 3 * s, 3 * s);
      break;
    case 'mace':
      ctx.fillStyle = COLORS.leather;
      ctx.fillRect(0, -1.5 * s, 14 * s, 3 * s);
      ctx.fillStyle = COLORS.steelDark;
      ctx.beginPath();
      ctx.arc(15 * s, 0, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'staff':
      ctx.fillStyle = COLORS.leather;
      ctx.fillRect(0, -1.2 * s, 20 * s, 2.4 * s);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(21 * s, 0, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bow':
      ctx.strokeStyle = COLORS.leather;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(6 * s, 0, 9 * s, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      ctx.strokeStyle = '#e8e0d0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6 * s + 9 * s * Math.cos(-Math.PI / 2.2), 9 * s * Math.sin(-Math.PI / 2.2));
      ctx.lineTo(6 * s + 9 * s * Math.cos(Math.PI / 2.2), 9 * s * Math.sin(Math.PI / 2.2));
      ctx.stroke();
      break;
  }
}

/** Build an 8-direction character sheet texture and register its frames. */
export function makeCharacterSheet(
  scene: Phaser.Scene,
  key: string,
  opts: CharacterArtOpts,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, FRAME_W * SHEET_COLS, FRAME_H * SHEET_ROWS);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  DIR8_ALL.forEach((dir, row) => {
    for (let col = 0; col < SHEET_COLS; col++) {
      const ox = col * FRAME_W;
      const oy = row * FRAME_H;
      let anim: 'idle' | 'walk' | 'attack' | 'cast' = 'idle';
      let phase = 0;
      if (col === COL.idle) anim = 'idle';
      else if (COL.walk.includes(col)) {
        anim = 'walk';
        phase = COL.walk.indexOf(col) / COL.walk.length;
      } else if (COL.attack.includes(col)) {
        anim = 'attack';
        phase = COL.attack.indexOf(col) / (COL.attack.length - 1);
      } else if (col === COL.casthit) {
        anim = 'cast';
        phase = 0.5;
      }
      drawCharacter(ctx, ox, oy, dir, opts, anim, phase);
    }
  });

  // register frames by index (row-major)
  let i = 0;
  for (let r = 0; r < SHEET_ROWS; r++) {
    for (let c = 0; c < SHEET_COLS; c++) {
      tex.add(i, 0, c * FRAME_W, r * FRAME_H, FRAME_W, FRAME_H);
      i++;
    }
  }
  tex.refresh();
}

export function frameIndex(dir: Dir8, col: number): number {
  return dir * SHEET_COLS + col;
}

// ---------------- Tiles ----------------

const TS = 32;

function drawGroundTile(ctx: CanvasRenderingContext2D, g: Ground, seed: number) {
  const c = GROUND_COLORS[g];
  ctx.fillStyle = c.base;
  ctx.fillRect(0, 0, TS, TS);
  // dithered speckle for texture
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = rand() > 0.5 ? c.hi : c.lo;
    const x = Math.floor(rand() * TS);
    const y = Math.floor(rand() * TS);
    ctx.fillRect(x, y, 2, 2);
  }
  if (g === Ground.Road) {
    ctx.fillStyle = c.lo;
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillRect(0, TS - 1, TS, 1);
  }
}

/** Create all ground tile textures (one per Ground, a few variants). */
export function makeTileTextures(scene: Phaser.Scene): void {
  const grounds = [
    Ground.Grass, Ground.Sand, Ground.Snow, Ground.Ash, Ground.Stone,
    Ground.Water, Ground.Road, Ground.Floor, Ground.Lava,
  ];
  for (const g of grounds) {
    const key = `tile_${g}`;
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, TS, TS);
    if (!tex) continue;
    drawGroundTile(tex.getContext(), g, g * 97 + 13);
    tex.refresh();
  }
}

// ---------------- Objects ----------------

export function makeObjectTextures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
    tex.refresh();
  };

  make('obj_tree', 40, 52, (c) => {
    c.fillStyle = COLORS.shadow; c.beginPath(); c.ellipse(20, 48, 12, 4, 0, 0, 7); c.fill();
    c.fillStyle = '#5a3a22'; c.fillRect(17, 30, 6, 18);
    c.fillStyle = '#2f7a3a'; c.beginPath(); c.arc(20, 22, 16, 0, 7); c.fill();
    c.fillStyle = '#3f9a4a'; c.beginPath(); c.arc(15, 18, 9, 0, 7); c.fill();
  });
  make('obj_rock', 34, 30, (c) => {
    c.fillStyle = COLORS.shadow; c.beginPath(); c.ellipse(17, 26, 12, 4, 0, 0, 7); c.fill();
    c.fillStyle = '#7d766f'; c.beginPath(); c.moveTo(4, 26); c.lineTo(10, 8); c.lineTo(24, 6); c.lineTo(30, 24); c.closePath(); c.fill();
    c.fillStyle = '#9a938c'; c.beginPath(); c.moveTo(10, 8); c.lineTo(24, 6); c.lineTo(20, 16); c.closePath(); c.fill();
  });
  make('obj_bush', 30, 24, (c) => {
    c.fillStyle = '#3a7a3a'; c.beginPath(); c.arc(10, 14, 8, 0, 7); c.arc(20, 14, 8, 0, 7); c.fill();
  });
  make('obj_ruin', 40, 44, (c) => {
    c.fillStyle = COLORS.shadow; c.beginPath(); c.ellipse(20, 42, 14, 4, 0, 0, 7); c.fill();
    c.fillStyle = '#8d857b'; c.fillRect(6, 14, 8, 28); c.fillRect(26, 8, 8, 34);
    c.fillStyle = '#a49c92'; c.fillRect(6, 14, 28, 6);
  });
  make('obj_wall', 32, 32, (c) => {
    c.fillStyle = '#9a938c'; c.fillRect(0, 0, 32, 32);
    c.strokeStyle = '#7d766f'; c.lineWidth = 1;
    for (let y = 0; y < 32; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(32, y); c.stroke(); }
  });
  make('obj_crystal', 26, 34, (c) => {
    c.fillStyle = '#7b5cd6'; c.beginPath(); c.moveTo(13, 2); c.lineTo(22, 20); c.lineTo(13, 32); c.lineTo(4, 20); c.closePath(); c.fill();
    c.fillStyle = '#b49bf0'; c.beginPath(); c.moveTo(13, 2); c.lineTo(22, 20); c.lineTo(13, 20); c.closePath(); c.fill();
  });
  make('obj_chest', 30, 24, (c) => {
    c.fillStyle = COLORS.shadow; c.beginPath(); c.ellipse(15, 22, 11, 3, 0, 0, 7); c.fill();
    c.fillStyle = '#6b4a2f'; c.fillRect(3, 8, 24, 14);
    c.fillStyle = '#8a6a3f'; c.fillRect(3, 4, 24, 6);
    c.fillStyle = '#e0c060'; c.fillRect(13, 6, 4, 12);
  });
  make('obj_building', 96, 88, (c) => {
    c.fillStyle = COLORS.shadow; c.beginPath(); c.ellipse(48, 84, 40, 6, 0, 0, 7); c.fill();
    c.fillStyle = '#c9b896'; c.fillRect(8, 34, 80, 50);
    c.strokeStyle = '#7d766f'; c.strokeRect(8, 34, 80, 50);
    c.fillStyle = '#3a5a8a'; c.beginPath(); c.moveTo(2, 36); c.lineTo(48, 6); c.lineTo(94, 36); c.closePath(); c.fill();
    c.fillStyle = '#5a3a22'; c.fillRect(40, 60, 16, 24); // door
    c.fillStyle = '#88b0d8'; c.fillRect(18, 46, 12, 12); c.fillRect(66, 46, 12, 12); // windows
  });
  make('obj_fountain', 40, 32, (c) => {
    c.fillStyle = '#9a938c'; c.beginPath(); c.ellipse(20, 22, 18, 8, 0, 0, 7); c.fill();
    c.fillStyle = '#3f86c4'; c.beginPath(); c.ellipse(20, 21, 13, 5, 0, 0, 7); c.fill();
    c.fillStyle = '#b7cfe6'; c.fillRect(18, 6, 4, 12);
  });
  make('obj_gate', 32, 40, (c) => {
    c.fillStyle = '#5b666f'; c.fillRect(2, 4, 6, 36); c.fillRect(24, 4, 6, 36);
    c.fillStyle = '#8d9aa5'; c.fillRect(2, 2, 28, 6);
    c.fillStyle = 'rgba(120,90,220,0.35)'; c.fillRect(8, 8, 16, 32);
  });
  make('obj_sign', 20, 24, (c) => {
    c.fillStyle = '#6b4a2f'; c.fillRect(9, 8, 2, 16);
    c.fillStyle = '#8a6a3f'; c.fillRect(2, 2, 16, 10);
  });
  make('obj_flag', 24, 40, (c) => {
    c.fillStyle = '#5b666f'; c.fillRect(4, 2, 2, 38);
    c.fillStyle = '#2f6fa8'; c.beginPath(); c.moveTo(6, 4); c.lineTo(22, 9); c.lineTo(6, 16); c.closePath(); c.fill();
  });
}

/** Animated portal: 6 frames of a swirling vortex inside a stone arch. */
export function makePortalFrames(scene: Phaser.Scene): string {
  const key = 'portal_sheet';
  if (scene.textures.exists(key)) return key;
  const fw = 48, fh = 64, frames = 6;
  const tex = scene.textures.createCanvas(key, fw * frames, fh);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let f = 0; f < frames; f++) {
    const ox = f * fw;
    // stone arch
    ctx.fillStyle = '#4a4550';
    ctx.fillRect(ox + 4, 8, 8, 52); ctx.fillRect(ox + fw - 12, 8, 8, 52);
    ctx.fillRect(ox + 4, 8, fw - 8, 8);
    ctx.fillStyle = '#e0c060'; ctx.beginPath(); ctx.arc(ox + fw / 2, 12, 4, 0, 7); ctx.fill();
    // swirl
    const t = (f / frames) * Math.PI * 2;
    for (let a = 0; a < 3; a++) {
      ctx.strokeStyle = a % 2 ? '#8a6bff' : '#b49bf0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) {
        const ang = t + a * 2 + k * 0.6;
        const rad = 2 + k * 0.9;
        const x = ox + fw / 2 + Math.cos(ang) * rad;
        const y = 36 + Math.sin(ang) * rad * 0.8;
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath(); ctx.arc(ox + fw / 2, 36, 3 + Math.sin(t) * 1.5, 0, 7); ctx.fill();
  }
  let i = 0;
  for (let f = 0; f < frames; f++) tex.add(i++, 0, f * fw, 0, fw, fh);
  tex.refresh();
  return key;
}

/** Small soft particle used for hits, dashes, magic. */
export function makeParticleTexture(scene: Phaser.Scene): void {
  const key = 'particle';
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, 8, 8);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 8);
  tex.refresh();
}
