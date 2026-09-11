/**
 * The main gameplay scene. Loads a map (procedurally generated from its def),
 * renders ground via chunked RenderTextures, spawns objects/NPCs/enemies as
 * y-sorted sprites, and runs a fixed-step simulation for movement, dash,
 * combat, enemy AI, projectiles, transitions, portals and progression.
 */

import Phaser from 'phaser';
import { GeneratedMap, generateMap } from '../../core/mapgen';
import { MapDef, getMap, getRegion, TILE_SIZE } from '../../core/regions';
import { ChunkManager } from '../ChunkManager';
import { Player, PlayerInput } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Npc } from '../entities/Npc';
import { Dir8, DIR8_VECTOR } from '../../core/direction';
import { addXp, canChooseClass, xpForNextLevel } from '../../core/progression';
import { session } from '../session';
import { gameBus } from '../events';
import { recordRaidClear, portalDestinations } from '../../core/worldState';
import { CLASS_DEFS, MAIN_CLASSES, ClassId } from '../../core/classes';
import { startingSetFor } from '../../core/equipment';
import { registerCharacterAnims } from '../animations';
import { makePortalFrames } from '../../art/sprites';

interface SceneData {
  mapId?: string;
  def?: MapDef;
  returnTo?: { mapId: string; x: number; y: number };
}

interface Projectile {
  sprite: Phaser.GameObjects.Arc;
  vx: number; vy: number; ttl: number; damage: number;
  owner: 'player' | 'enemy'; traveled: number; range: number;
}

const FIXED_MS = 1000 / 60;

export class WorldScene extends Phaser.Scene {
  private gen!: GeneratedMap;
  private def!: MapDef;
  private chunks!: ChunkManager;
  private player!: Player;
  private enemies: Enemy[] = [];
  private npcs: Npc[] = [];
  private masters: { npc: Npc; classId: ClassId }[] = [];
  private projectiles: Projectile[] = [];
  private objects: Phaser.GameObjects.Image[] = [];
  private portalSprite?: Phaser.GameObjects.Sprite;
  private returnTo?: { mapId: string; x: number; y: number };

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private acc = 0;
  private skillCd: number[] = [0, 0, 0];
  private interactCd = 0;
  private transitionLock = 0;
  private clearedThisRaid = false;

  constructor() {
    super('World');
  }

  create(data: SceneData): void {
    this.def = data.def ?? getMap(data.mapId ?? session.save.currentMapId)!.map;
    this.returnTo = data.returnTo;
    this.gen = generateMap(this.def);

    // reset transient collections (scene is reused via restart)
    this.enemies = [];
    this.npcs = [];
    this.masters = [];
    this.projectiles = [];
    this.objects = [];

    this.reserveTrainingArea();
    this.chunks = new ChunkManager(this, this.gen);
    this.buildObjects();
    this.spawnPlayer();
    this.spawnEnemies();
    this.spawnNpcs();
    this.setupInput();
    this.setupCamera();
    this.setupPortal();

    session.save.currentMapId = this.def.id;
    session.persist();
    this.announceMap();

    // React bridge handlers
    gameBus.onTyped('chooseClass', this.onChooseClass, this);
    gameBus.onTyped('travelTo', this.onTravelTo, this);
    this.events.once('shutdown', () => {
      gameBus.offTyped('chooseClass', this.onChooseClass);
      gameBus.offTyped('travelTo', this.onTravelTo);
      this.chunks.destroy();
    });
  }

  // ---------------- construction ----------------

  private buildObjects(): void {
    for (const o of this.gen.objects) {
      const px = o.tx * TILE_SIZE + TILE_SIZE / 2;
      const py = o.ty * TILE_SIZE + TILE_SIZE / 2;
      if (o.kind === 'portal') continue; // handled separately (animated)
      const key = `obj_${o.kind}`;
      if (!this.textures.exists(key)) continue;
      const img = this.add.image(px, py, key);
      img.setOrigin(0.5, 0.85);
      img.setDepth(py);
      if (o.animated) {
        this.tweens.add({ targets: img, scaleY: { from: 1, to: 1.04 }, yoyo: true, repeat: -1, duration: 900 });
      }
      if (o.lit) {
        const light = this.add.circle(px, py - 8, 40, 0xffe0a0, 0.12).setDepth(py - 1);
        this.tweens.add({ targets: light, alpha: { from: 0.08, to: 0.2 }, yoyo: true, repeat: -1, duration: 1200 });
      }
      this.objects.push(img);
    }
  }

  /** Clear a walkable pad + remove obstacle objects around the master row. */
  private reserveTrainingArea(): void {
    if (this.def.type !== 'training-camp') return;
    const cx = Math.round(this.gen.w * 0.55);
    const cy = Math.round(this.gen.h * 0.5);
    for (let ty = cy - 3; ty <= cy + 3; ty++) {
      for (let tx = cx - 10; tx <= cx + 10; tx++) {
        if (tx < 1 || ty < 1 || tx >= this.gen.w - 1 || ty >= this.gen.h - 1) continue;
        this.gen.collision[ty * this.gen.w + tx] = 0;
      }
    }
    this.gen.objects = this.gen.objects.filter(
      (o) => !(o.solid && Math.abs(o.tx - cx) <= 10 && Math.abs(o.ty - cy) <= 3),
    );
  }

  private spawnPlayer(): void {
    let sx = this.gen.playerSpawn.tx * TILE_SIZE + TILE_SIZE / 2;
    let sy = this.gen.playerSpawn.ty * TILE_SIZE + TILE_SIZE / 2;
    if (session.spawnOverride) {
      sx = session.spawnOverride.x;
      sy = session.spawnOverride.y;
      session.spawnOverride = null;
    } else if (
      // resume at the saved position when re-entering the same map (Continue)
      session.save.currentMapId === this.def.id &&
      session.save.x > 0 && session.save.y > 0 &&
      !this.solidAt(session.save.x, session.save.y)
    ) {
      sx = session.save.x;
      sy = session.save.y;
    }
    this.player = new Player(this, sx, sy, session.save.classId);
    this.player.hp = session.save.hp > 0 ? Math.min(session.save.hp, this.player.maxHp) : this.player.maxHp;
    this.applyEquipmentBonuses();
  }

  private applyEquipmentBonuses(): void {
    let power = 0, def = 0, hp = 0, crit = 0;
    // (equipment stat lookup kept simple: derived from equipped ids)
    this.player.power = power;
    this.player.defense = this.player.cls.stats.defense + def;
    this.player.maxHp = this.player.cls.stats.maxHp + hp;
    this.player.critChance = this.player.cls.stats.critChance + crit;
  }

  private spawnEnemies(): void {
    const region = getRegion(getMap(this.def.id)?.region.id ?? 1);
    const scale = 1 + (region ? region.levelMin - 1 : 0) * 0.12;
    for (const s of this.gen.enemySpawns) {
      const px = s.tx * TILE_SIZE + TILE_SIZE / 2;
      const py = s.ty * TILE_SIZE + TILE_SIZE / 2;
      const e = new Enemy(this, px, py, s.tier, s.tier === 'boss' ? scale * 1.2 : scale);
      this.enemies.push(e);
      if (s.tier === 'boss') {
        e.sprite.setScale(1);
        this.announceBoss(this.def.type === 'raid' ? 'Raid-Boss' : 'World-Boss');
      }
    }
  }

  private spawnNpcs(): void {
    // Regular town NPCs.
    this.gen.npcSpawns.forEach((n) => {
      const px = n.tx * TILE_SIZE + TILE_SIZE / 2;
      const py = n.ty * TILE_SIZE + TILE_SIZE / 2;
      const key = this.textures.exists(`npc_${n.role}`) ? `npc_${n.role}` : 'npc_Wache';
      this.npcs.push(new Npc(this, px, py, n.role, key));
    });

    // Training camp: five class masters + instructor.
    if (this.def.type === 'training-camp') {
      const cx = Math.round(this.gen.w * 0.55);
      const cy = Math.round(this.gen.h * 0.5);
      MAIN_CLASSES.forEach((classId, i) => {
        const tx = cx + (i - 2) * 3;
        const px = tx * TILE_SIZE + TILE_SIZE / 2;
        const py = cy * TILE_SIZE + TILE_SIZE / 2;
        // ensure walkable
        this.gen.collision[cy * this.gen.w + tx] = 0;
        const npc = new Npc(this, px, py, `${CLASS_DEFS[classId].name}-Meister`, `master_${classId}`);
        this.masters.push({ npc, classId });
      });
      this.npcs.push(
        new Npc(this, (cx - 6) * TILE_SIZE, cy * TILE_SIZE, 'Ausbilder', 'npc_Versammlungsleiter'),
      );
    }
  }

  private setupPortal(): void {
    if (!this.gen.portal) return;
    const key = makePortalFrames(this);
    if (!this.anims.exists('portal_spin')) {
      this.anims.create({
        key: 'portal_spin',
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    const px = this.gen.portal.tx * TILE_SIZE + TILE_SIZE / 2;
    const py = this.gen.portal.ty * TILE_SIZE + TILE_SIZE / 2;
    this.portalSprite = this.add.sprite(px, py, key, 0).setOrigin(0.5, 0.8).setDepth(py);
    this.portalSprite.play('portal_spin');
    this.add.circle(px, py - 20, 46, 0x8a6bff, 0.14).setDepth(py - 1);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey('W'), down: kb.addKey('S'), left: kb.addKey('A'), right: kb.addKey('D'),
      dash: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      skill1: kb.addKey('Q'), skill2: kb.addKey('E'), skill3: kb.addKey('R'),
    };
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.gen.w * TILE_SIZE, this.gen.h * TILE_SIZE);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setZoom(1.6);
    cam.setRoundPixels(true);
    const biome = this.def.biome;
    const bg: Record<string, number> = {
      coast: 0x2f5f4f, forest: 0x1f3f2a, desert: 0x5a4a2a, ice: 0x2a3a4a,
      volcano: 0x2a1010, city: 0x2f2f38, ruins: 0x2a2822, cave: 0x14121a,
    };
    cam.setBackgroundColor(bg[biome] ?? 0x101018);
  }

  // ---------------- update loop ----------------

  override update(_t: number, delta: number): void {
    this.acc += Math.min(delta, 100);
    while (this.acc >= FIXED_MS) {
      this.step(FIXED_MS);
      this.acc -= FIXED_MS;
    }
    this.chunks.update();
  }

  private step(dt: number): void {
    if (this.transitionLock > 0) this.transitionLock -= dt;
    if (this.interactCd > 0) this.interactCd -= dt;
    for (let i = 0; i < 3; i++) if (this.skillCd[i] > 0) this.skillCd[i] -= dt;

    const input = this.gatherInput();
    const hit = this.player.update(dt, input, this.solidAt);
    if (hit) this.resolvePlayerHit(hit);

    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const atk = e.update(dt, this.player.x, this.player.y);
      if (atk) this.resolveEnemyAttack(e, atk);
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.sprite.active);

    this.updateProjectiles(dt);
    this.handleInteract(input);
    this.checkTransitions();
    // track live position so "Continue" resumes here
    session.save.x = this.player.x;
    session.save.y = this.player.y;
    this.emitHud();

    if (this.player.hp <= 0) this.onPlayerDeath();
  }

  private gatherInput(): PlayerInput {
    const p = this.input.activePointer;
    let aim: { x: number; y: number } | null = null;
    if (p && p.isDown && this.player) {
      aim = { x: p.worldX - this.player.x, y: p.worldY - this.player.y };
    }
    const attack = (p?.leftButtonDown() ?? false);
    // skills
    if (Phaser.Input.Keyboard.JustDown(this.keys.skill1)) this.useSkill(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.skill2)) this.useSkill(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.skill3)) this.useSkill(2);
    return {
      up: this.keys.up.isDown,
      down: this.keys.down.isDown,
      left: this.keys.left.isDown,
      right: this.keys.right.isDown,
      dash: Phaser.Input.Keyboard.JustDown(this.keys.dash),
      attack,
      aim,
    };
  }

  // collision probe (arrow fn to keep `this`)
  private solidAt = (x: number, y: number): boolean => {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= this.gen.w || ty >= this.gen.h) return true;
    return this.gen.collision[ty * this.gen.w + tx] === 1;
  };

  // ---------------- combat resolution ----------------

  private resolvePlayerHit(hit: ReturnType<Player['update']> & object): void {
    const h = hit as NonNullable<ReturnType<Player['update']>>;
    if (this.player.cls.ranged) {
      this.spawnProjectile('player', this.player.x, this.player.y, this.player.facing, h.damage, h.reach);
      return;
    }
    const va = DIR8_VECTOR[h.dir];
    let landed = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > h.reach + 18) continue;
      const dot = (dx * va.x + dy * va.y) / (dist || 1);
      if (dot < 0.35) continue; // must be roughly in front (arc)
      const crit = Math.random() < this.player.critChance;
      const dmg = crit ? Math.round(h.damage * 1.7) : h.damage;
      const dead = e.takeDamage(dmg, h.knockback, this.player.x, this.player.y);
      this.spawnHitFx(e.x, e.y, crit);
      this.player.hitStopMs = Math.max(this.player.hitStopMs, 45);
      landed = true;
      if (dead) this.onEnemyKilled(e);
    }
    if (landed) this.cameras.main.shake(60, 0.003);
  }

  private resolveEnemyAttack(e: Enemy, atk: { ranged: boolean; dir: Dir8; damage: number; range: number }): void {
    if (atk.ranged) {
      this.spawnProjectile('enemy', e.x, e.y, atk.dir, atk.damage, atk.range);
      return;
    }
    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    if (Math.hypot(dx, dy) <= atk.range) {
      const dealt = this.player.takeDamage(atk.damage);
      if (dealt > 0) {
        this.spawnHitFx(this.player.x, this.player.y, false);
        this.cameras.main.shake(90, 0.006);
      }
    }
  }

  private spawnProjectile(owner: 'player' | 'enemy', x: number, y: number, dir: Dir8, damage: number, range: number): void {
    const v = DIR8_VECTOR[dir];
    const color = owner === 'player' ? (this.player.classId === 'mage' ? 0x8a6bff : 0xffe9b0) : 0xff5533;
    const sprite = this.add.circle(x, y, 5, color, 1).setDepth(y + 4);
    sprite.setStrokeStyle(2, 0xffffff, 0.5);
    this.projectiles.push({
      sprite, vx: v.x * 340, vy: v.y * 340, ttl: 1600, damage, owner, traveled: 0, range,
    });
  }

  private updateProjectiles(dt: number): void {
    const s = dt / 1000;
    for (const p of this.projectiles) {
      p.sprite.x += p.vx * s;
      p.sprite.y += p.vy * s;
      p.sprite.setDepth(p.sprite.y + 4);
      p.ttl -= dt;
      p.traveled += Math.hypot(p.vx, p.vy) * s;
      let hitSomething = this.solidAt(p.sprite.x, p.sprite.y);
      if (p.owner === 'player') {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - p.sprite.x, e.y - p.sprite.y) < 20) {
            const crit = Math.random() < this.player.critChance;
            const dmg = crit ? Math.round(p.damage * 1.7) : p.damage;
            const dead = e.takeDamage(dmg, 60, p.sprite.x, p.sprite.y);
            this.spawnHitFx(e.x, e.y, crit);
            if (dead) this.onEnemyKilled(e);
            hitSomething = true;
            break;
          }
        }
      } else if (Math.hypot(this.player.x - p.sprite.x, this.player.y - p.sprite.y) < 16) {
        this.player.takeDamage(p.damage);
        hitSomething = true;
      }
      if (hitSomething || p.ttl <= 0 || p.traveled > p.range + 40) {
        p.sprite.destroy();
        (p as { dead?: boolean }).dead = true;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !(p as { dead?: boolean }).dead);
  }

  private spawnHitFx(x: number, y: number, crit: boolean): void {
    const c = this.add.circle(x, y - 10, crit ? 10 : 6, crit ? 0xffd050 : 0xffffff, 0.9).setDepth(y + 20);
    this.tweens.add({ targets: c, scale: 2, alpha: 0, duration: 200, onComplete: () => c.destroy() });
  }

  // ---------------- skills ----------------

  private useSkill(slot: number): void {
    const skill = this.player.cls.skills[slot];
    if (!skill) return;
    if (this.skillCd[slot] > 0 || this.player.resource < skill.cost) return;
    this.player.resource -= skill.cost;
    this.skillCd[slot] = skill.cooldownMs;

    const id = skill.id;
    if (id.includes('heal')) {
      this.player.heal(30);
      this.skillFx(0x66ff99);
    } else if (id.includes('guard') || id.includes('bulwark') || id.includes('parry') || id.includes('vanish')) {
      this.player.invulnMs = 1400;
      this.skillFx(0x88ccff);
    } else if (skill.ranged) {
      // fan of projectiles
      const base = this.player.facing;
      const dirs = [base, (base + 1) % 8, (base + 7) % 8];
      for (const d of dirs) this.spawnProjectile('player', this.player.x, this.player.y, d as Dir8, skill.cost, 260);
      this.skillFx(0xffb060);
    } else {
      // melee whirl / lunge
      let killed = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 80) {
          const dead = e.takeDamage(this.player.cls.combo.attacks[0].damage * 2 + this.player.power, 200, this.player.x, this.player.y);
          this.spawnHitFx(e.x, e.y, true);
          if (dead) { this.onEnemyKilled(e); killed = true; }
        }
      }
      this.skillFx(0xff8866);
      if (killed) this.cameras.main.shake(120, 0.006);
    }
    gameBus.emitTyped('toast', { text: `Skill: ${skill.name}`, kind: 'info' });
  }

  private skillFx(color: number): void {
    const ring = this.add.circle(this.player.x, this.player.y, 20, color, 0.4).setDepth(this.player.y + 30);
    this.tweens.add({ targets: ring, radius: 90, scale: 2, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
  }

  // ---------------- progression ----------------

  private onEnemyKilled(e: Enemy): void {
    const lvl = session.level;
    const res = addXp(lvl, e.stats.xp);
    session.level = lvl;
    session.save.hp = this.player.hp;
    this.player.heal(4);
    if (res.levelsGained > 0) {
      gameBus.emitTyped('toast', { text: `Level ${lvl.level}!`, kind: 'levelup' });
      this.player.maxHp += 6;
      this.player.hp = this.player.maxHp;
    }
    if (res.reachedClassUnlock && session.save.classId === 'novice') {
      gameBus.emitTyped('toast', { text: 'Neue Hauptquest: Der Weg des Kämpfers — gehe zum Trainingslager!', kind: 'quest' });
      gameBus.emitTyped('quest', { name: 'Der Weg des Kämpfers', objectives: ['Betrete das Trainingslager', 'Wähle eine Klasse'] });
    }
    if (e.tier === 'boss' && this.def.type === 'raid' && !this.clearedThisRaid) {
      this.onRaidCleared();
    }
    session.persist();
  }

  private onRaidCleared(): void {
    this.clearedThisRaid = true;
    const info = getMap(this.def.id);
    if (!info) return;
    const unlocked = recordRaidClear(session.save, info.region.id);
    session.persist();
    if (info.region.id === 5) {
      gameBus.emitTyped('toast', { text: 'Demo abgeschlossen! Region 5 Raid besiegt. Ausblick: Region 6 — Fliegende Inseln.', kind: 'unlock' });
    } else if (unlocked) {
      const r = getRegion(unlocked);
      gameBus.emitTyped('toast', { text: `Region ${unlocked} freigeschaltet: ${r?.name}!`, kind: 'unlock' });
    }
  }

  private onPlayerDeath(): void {
    gameBus.emitTyped('toast', { text: 'Gefallen! Rückkehr zur letzten Stadt.', kind: 'danger' });
    const info = getMap(this.def.id);
    const townId = info ? info.region.maps.find((m) => m.hasPortal)?.id : 'r1_start';
    session.save.hp = 0;
    session.persist();
    this.player.hp = this.player.maxHp;
    session.save.hp = this.player.maxHp;
    this.transitionLock = 1000;
    this.scene.restart({ mapId: townId ?? 'r1_start' });
  }

  // ---------------- interaction / transitions ----------------

  private handleInteract(input: PlayerInput): void {
    const pressed = Phaser.Input.Keyboard.JustDown(this.keys.interact);
    if (!pressed || this.interactCd > 0) { void input; return; }
    this.interactCd = 300;

    // portal
    if (this.portalSprite && Math.hypot(this.portalSprite.x - this.player.x, this.portalSprite.y - this.player.y) < 44) {
      gameBus.emitTyped('openPortal', { dests: portalDestinations(session.save.clearedRaids) });
      return;
    }
    // class master
    if (this.def.type === 'training-camp') {
      for (const m of this.masters) {
        if (Math.hypot(m.npc.x - this.player.x, m.npc.y - this.player.y) < 46) {
          m.npc.faceToward(this.player.x, this.player.y);
          if (session.save.classId !== 'novice') {
            gameBus.emitTyped('openDialog', { name: m.npc.role, lines: ['Du hast bereits eine Klasse gewählt.'] });
          } else if (!canChooseClass(session.save.level)) {
            gameBus.emitTyped('openDialog', { name: m.npc.role, lines: ['Komm wieder, wenn du Level 5 erreicht hast.'] });
          } else {
            gameBus.emitTyped('openClassSelect', { level: session.save.level });
          }
          return;
        }
      }
    }
    // building entrance -> interior
    for (const o of this.gen.objects) {
      if (o.kind !== 'building') continue;
      const bx = o.tx * TILE_SIZE + TILE_SIZE / 2;
      const by = o.ty * TILE_SIZE + TILE_SIZE / 2;
      if (Math.hypot(bx - this.player.x, by - this.player.y) < 52) {
        this.enterBuilding(o.tx, o.ty);
        return;
      }
    }
    // generic npc
    for (const n of this.npcs) {
      if (Math.hypot(n.x - this.player.x, n.y - this.player.y) < 44) {
        n.faceToward(this.player.x, this.player.y);
        gameBus.emitTyped('openDialog', { name: n.role, lines: this.npcLines(n.role) });
        return;
      }
    }
  }

  private npcLines(role: string): string[] {
    switch (role) {
      case 'Versammlungsleiter': return ['Willkommen in Solara, Kämpfer.', 'Sammle Erfahrung und erreiche Level 5 für deine Klassenwahl.'];
      case 'Schmied': return ['Ich schmiede die stärksten Klingen der Küste.'];
      case 'Alchemist': return ['Ein Heiltrank gefällig? Trinke ihn im Kampf.'];
      case 'Händler': return ['Ware gegen Gold — schau dich um.'];
      case 'Hafenmeister': return ['Das Schiff bringt dich zu fernen Regionen.'];
      case 'Pet-NPC': return ['Erfülle meine Quest und ich schenke dir einen Begleiter.'];
      default: return [`${role}: Sei gegrüßt, Reisender.`];
    }
  }

  private enterBuilding(tx: number, ty: number): void {
    const interior: MapDef = {
      id: `interior_${this.def.id}_${tx}_${ty}`,
      name: 'Innenraum', type: 'interior', biome: 'city',
      w: 20, h: 15, hasPortal: false, connections: [], seed: (tx * 131 + ty * 17) | 0,
    };
    const returnTo = { mapId: this.def.id, x: tx * TILE_SIZE + TILE_SIZE / 2, y: (ty + 2) * TILE_SIZE };
    session.save.hp = this.player.hp;
    session.persist();
    this.transitionLock = 500;
    this.scene.restart({ def: interior, returnTo });
  }

  private checkTransitions(): void {
    if (this.transitionLock > 0) return;
    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);

    // interior exit gate (returnTo set)
    if (this.returnTo && this.def.type === 'interior') {
      // exit is at bottom-center of interior
      if (pty >= this.gen.h - 2) {
        const rt = this.returnTo;
        session.spawnOverride = { x: rt.x, y: rt.y };
        session.save.hp = this.player.hp;
        session.persist();
        this.transitionLock = 500;
        this.scene.restart({ mapId: rt.mapId });
        return;
      }
    }

    for (const t of this.gen.transitions) {
      if (Math.abs(t.tx - ptx) <= 1 && Math.abs(t.ty - pty) <= 1) {
        session.save.hp = this.player.hp;
        session.persist();
        this.transitionLock = 600;
        gameBus.emitTyped('toast', { text: `Reise nach ${t.label}`, kind: 'info' });
        this.scene.restart({ mapId: t.toMapId });
        return;
      }
    }
  }

  private onTravelTo(mapId: string): void {
    gameBus.emitTyped('closeMenus');
    session.save.hp = this.player.hp;
    session.persist();
    this.transitionLock = 600;
    this.scene.restart({ mapId });
  }

  private onChooseClass(classId: ClassId): void {
    gameBus.emitTyped('closeMenus');
    if (session.save.classId !== 'novice' || !canChooseClass(session.save.level)) return;
    session.save.classId = classId;
    session.save.equipment.weapon = `${classId}_r1_weapon`;
    session.save.equipment.armor = `${classId}_r1_armor`;
    session.save.inventory.push(...startingSetFor(classId));
    session.save.completedQuests.push('q_path_of_the_fighter');
    session.persist();
    this.player.setClass(classId);
    this.applyEquipmentBonuses();
    const cls = CLASS_DEFS[classId];
    gameBus.emitTyped('toast', { text: `Klasse gewählt: ${cls.name}! Ausrüstung und Skills erhalten.`, kind: 'unlock' });
    this.skillFx(0xffe060);
  }

  // ---------------- hud / banners ----------------

  private announceMap(): void {
    const info = getMap(this.def.id);
    const label = info ? `${info.region.name} — ${this.def.name}` : this.def.name;
    const t = this.add.text(this.scale.width / 2, 60, label, {
      fontSize: '22px', color: '#ffe9b0', fontFamily: 'Trebuchet MS', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9999);
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 800, onComplete: () => t.destroy() });
  }

  private announceBoss(kind: string): void {
    gameBus.emitTyped('toast', { text: `${kind} erwacht! Achte auf die Telegraphs.`, kind: 'danger' });
  }

  private emitHud(): void {
    const cls = this.player.cls;
    const lvl = session.level;
    const info = getMap(this.def.id);
    gameBus.emitTyped('hud', {
      name: session.save.name,
      classId: this.player.classId,
      level: lvl.level,
      xp: Math.round(lvl.xp),
      xpNext: xpForNextLevel(lvl.level),
      hp: Math.round(this.player.hp),
      maxHp: Math.round(this.player.maxHp),
      resource: Math.round(this.player.resource),
      maxResource: this.player.maxResource,
      resourceKind: cls.stats.resourceKind,
      gold: session.save.gold,
      regionName: info?.region.name ?? '',
      mapName: this.def.name,
      comboCount: this.player.comboCount,
      dashReady: this.player.dash.cooldownRemaining <= 0,
      skills: cls.skills.map((s, i) => ({ name: s.name, ready: this.skillCd[i] <= 0 })),
    });
  }
}

/** Register all character animations once (called from Preload). */
export function registerAllAnims(scene: Phaser.Scene): void {
  const sheets: string[] = [];
  for (const id of ['novice', ...MAIN_CLASSES]) sheets.push(`char_${id}`);
  for (const t of ['normal', 'ranged', 'magic', 'brute', 'elite', 'boss']) sheets.push(`enemy_${t}`);
  for (const r of ['Versammlungsleiter', 'Schmied', 'Alchemist', 'Händler', 'Wirt', 'Wache', 'Hafenmeister', 'Gilden-NPC', 'Questgeber', 'Pet-NPC']) sheets.push(`npc_${r}`);
  for (const c of MAIN_CLASSES) sheets.push(`master_${c}`);
  for (const s of sheets) if (scene.textures.exists(s)) registerCharacterAnims(scene, s);
}
