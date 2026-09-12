import Phaser from "phaser";
import { CLASS_DEFINITIONS, type ClassId } from "../content/classes";
import { WORLD_DEFINITIONS, type BuildingDefinition, type MapDefinition, type PortalDefinition } from "../content/world";
import { Player, type PlayerKeys } from "../entities/Player";
import { GAME_EVENTS, type HudState } from "../events";

interface WorldStartData { mapId?: string; spawnId?: string }
interface Enemy extends Phaser.Physics.Arcade.Image { health: number; tier: number; nextHitAt: number }
interface PortalZone extends Phaser.GameObjects.Zone { definition: PortalDefinition }

const TILE = 32;
const THEME_COLOURS: Record<MapDefinition["theme"], { ground: number; grid: number; accent: number }> = {
  coast: { ground: 0x3b8f6a, grid: 0x327b5c, accent: 0x5abf89 },
  field: { ground: 0x527f46, grid: 0x466d3c, accent: 0x83aa55 },
  harbour: { ground: 0x867553, grid: 0x736546, accent: 0x39a4b8 },
  capital: { ground: 0x777b80, grid: 0x696d72, accent: 0xd2b45c },
  interior: { ground: 0x5b4536, grid: 0x4b382d, accent: 0xc9985a },
  boss: { ground: 0x394b50, grid: 0x303f43, accent: 0x38b0ba }
};

export class WorldScene extends Phaser.Scene {
  private map!: MapDefinition;
  private player!: Player;
  private keys!: PlayerKeys;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private portalZones: PortalZone[] = [];
  private currentPortal?: PortalZone;
  private mapId = "spawn_town";
  private spawnId = "start";
  private lastHudAt = 0;
  private respawnScheduled = false;

  constructor() { super("World"); }

  init(data: WorldStartData): void {
    this.mapId = data.mapId ?? this.registry.get("mapId") ?? "spawn_town";
    this.spawnId = data.spawnId ?? this.registry.get("spawnId") ?? "start";
    const map = WORLD_DEFINITIONS[this.mapId];
    if (!map) throw new Error(`Unknown map: ${this.mapId}`);
    this.map = map;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, this.map.widthTiles * TILE, this.map.heightTiles * TILE);
    this.obstacles = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group({ maxSize: 40 });
    this.drawMap();

    const classId = (this.registry.get("classId") ?? "swordsman") as ClassId;
    const spawn = this.map.spawns.find((point) => point.id === this.spawnId) ?? this.map.spawns[0];
    this.player = new Player(this, spawn.x * TILE, spawn.y * TILE, CLASS_DEFINITIONS[classId]);
    this.keys = this.createKeys();

    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, (_player, enemyObject) => this.enemyTouchesPlayer(enemyObject as Enemy));
    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemyObject) => {
      const projectileImage = projectile as Phaser.Physics.Arcade.Image;
      this.damageEnemy(enemyObject as Enemy, Number(projectileImage.getData("damage") ?? 1));
      projectileImage.destroy();
    });

    this.cameras.main.setBounds(0, 0, this.map.widthTiles * TILE, this.map.heightTiles * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.12);
    this.scene.launch("HUD");
    this.game.events.emit(GAME_EVENTS.message, this.map.label);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.emit(GAME_EVENTS.portalPrompt, "");
      this.scene.stop("HUD");
    });
  }

  update(time: number): void {
    this.player.updateMovement(time, this.keys);
    this.updateEnemyAi(time);
    this.updatePortalPrompt();

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash)) this.player.tryDash(time);
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.tryPrimaryAttack(time);
    if (Phaser.Input.Keyboard.JustDown(this.keys.skill)) this.trySkill(time);
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact) && this.currentPortal) this.enterPortal(this.currentPortal.definition);

    if (this.player.action === "dead" && !this.respawnScheduled) {
      this.respawnScheduled = true;
      this.game.events.emit(GAME_EVENTS.message, "Besiegt · Rückkehr zum letzten Eintrittspunkt");
      this.time.delayedCall(1600, () => this.scene.restart({ mapId: this.mapId, spawnId: this.spawnId }));
    }

    if (time >= this.lastHudAt + 100) {
      this.lastHudAt = time;
      const state: HudState = {
        classLabel: this.player.definition.label,
        health: this.player.health,
        maxHealth: this.player.definition.maxHealth,
        mapLabel: this.map.label,
        enemies: this.enemies.countActive(true),
        dashReady: time >= this.player.dashReadyAt,
        skillReady: time >= this.player.skillReadyAt
      };
      this.game.events.emit(GAME_EVENTS.hudUpdate, state);
    }
  }

  private createKeys(): PlayerKeys {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable");
    const cursors = keyboard.createCursorKeys();
    return {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      upAlt: cursors.up,
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      downAlt: cursors.down,
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      leftAlt: cursors.left,
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      rightAlt: cursors.right,
      dash: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      attack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      skill: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      interact: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    };
  }

  private drawMap(): void {
    const width = this.map.widthTiles * TILE;
    const height = this.map.heightTiles * TILE;
    const colours = THEME_COLOURS[this.map.theme];
    this.add.rectangle(width / 2, height / 2, width, height, colours.ground).setDepth(-20);

    const grid = this.add.graphics().setDepth(-19);
    grid.lineStyle(1, colours.grid, 0.42);
    for (let x = 0; x <= width; x += TILE * 4) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += TILE * 4) grid.lineBetween(0, y, width, y);

    const random = new Phaser.Math.RandomDataGenerator([this.map.id]);
    const decoration = this.add.graphics().setDepth(-18);
    for (let i = 0; i < Math.min(650, Math.floor(this.map.widthTiles * this.map.heightTiles / 35)); i += 1) {
      decoration.fillStyle(colours.accent, random.realInRange(0.15, 0.42));
      decoration.fillCircle(random.integerInRange(2, width - 2), random.integerInRange(2, height - 2), random.integerInRange(2, 7));
    }

    this.createBoundary(width, height);
    this.map.buildings.forEach((building) => this.createBuilding(building, colours.accent));
    this.map.portals.forEach((portal) => this.createPortal(portal));
    this.map.enemies.forEach((spawn) => this.spawnEnemies(spawn.x, spawn.y, spawn.count, spawn.tier, random));

    if (this.map.theme === "interior") {
      this.add.text(width / 2, TILE * 3, this.map.label, { fontSize: "28px", color: "#f3c85b", fontStyle: "bold" }).setOrigin(0.5);
      for (let i = 0; i < 7; i += 1) this.createObstacle(5 + i * 4, 8 + (i % 2) * 5, 3, 2, 0x8d623d);
    }
  }

  private createBoundary(width: number, height: number): void {
    this.createStaticRect(width / 2, TILE / 2, width, TILE, 0x183c36);
    this.createStaticRect(width / 2, height - TILE / 2, width, TILE, 0x183c36);
    this.createStaticRect(TILE / 2, height / 2, TILE, height, 0x183c36);
    this.createStaticRect(width - TILE / 2, height / 2, TILE, height, 0x183c36);
  }

  private createBuilding(building: BuildingDefinition, colour: number): void {
    const x = (building.x + building.width / 2) * TILE;
    const y = (building.y + building.height / 2) * TILE;
    const width = building.width * TILE;
    const height = building.height * TILE;
    const body = this.add.rectangle(x, y, width, height, 0x2c4050).setStrokeStyle(5, colour).setDepth(4);
    this.physics.add.existing(body, true);
    this.obstacles.add(body);
    this.add.triangle(x, y - height / 2 - 42, 0, 80, width / 2, 0, width, 80, 0x193140).setDepth(5);
    this.add.text(x, y, building.label, { fontSize: "16px", color: "#ffffff", backgroundColor: "#07131bcc", padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(6);
  }

  private createObstacle(tileX: number, tileY: number, widthTiles: number, heightTiles: number, colour: number): void {
    this.createStaticRect((tileX + widthTiles / 2) * TILE, (tileY + heightTiles / 2) * TILE, widthTiles * TILE, heightTiles * TILE, colour);
  }

  private createStaticRect(x: number, y: number, width: number, height: number, colour: number): void {
    const rectangle = this.add.rectangle(x, y, width, height, colour).setDepth(3);
    this.physics.add.existing(rectangle, true);
    this.obstacles.add(rectangle);
  }

  private createPortal(definition: PortalDefinition): void {
    const width = (definition.width ?? 2) * TILE;
    const height = (definition.height ?? 2) * TILE;
    const zone = this.add.zone(definition.x * TILE, definition.y * TILE, width, height) as PortalZone;
    zone.definition = definition;
    this.physics.add.existing(zone, true);
    this.portalZones.push(zone);
    this.add.rectangle(zone.x, zone.y, width, height, 0x44ddff, 0.14).setStrokeStyle(2, 0x7ee7ff, 0.8).setDepth(2);
  }

  private spawnEnemies(tileX: number, tileY: number, count: number, tier: number, random: Phaser.Math.RandomDataGenerator): void {
    for (let index = 0; index < count; index += 1) {
      const enemy = this.physics.add.image(
        (tileX + random.integerInRange(-10, 10)) * TILE,
        (tileY + random.integerInRange(-8, 8)) * TILE,
        "enemy"
      ) as Enemy;
      enemy.health = tier === 6 ? 420 : 35 + tier * 18;
      enemy.tier = tier;
      enemy.nextHitAt = 0;
      enemy.setScale(tier === 6 ? 2.8 : 1 + tier * 0.08).setTint(tier === 6 ? 0xe04f5f : 0xffffff).setDepth(12);
      enemy.setCollideWorldBounds(true);
      this.enemies.add(enemy);
    }
  }

  private updateEnemyAi(time: number): void {
    this.enemies.children.each((child) => {
      const enemy = child as Enemy;
      if (!enemy.active) return true;
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (distance < 430 && distance > 48 && this.player.action !== "dead") {
        this.physics.moveToObject(enemy, this.player, 55 + enemy.tier * 8);
      } else if (distance <= 48) {
        enemy.setVelocity(0, 0);
        if (time >= enemy.nextHitAt) {
          enemy.nextHitAt = time + 850;
          if (this.player.takeDamage(6 + enemy.tier * 3, time)) this.cameras.main.shake(90, 0.004);
        }
      } else enemy.setVelocity(0, 0);
      return true;
    });
  }

  private enemyTouchesPlayer(enemy: Enemy): void {
    if (this.player.action === "dash") this.damageEnemy(enemy, 8);
  }

  private tryPrimaryAttack(time: number): void {
    if (time < this.player.attackReadyAt || time < this.player.lockedUntil || this.player.action === "dead") return;
    this.player.attackReadyAt = time + 420;
    this.player.lockAction("attack", time, 250);
    this.time.delayedCall(105, () => {
      if (!this.player.active) return;
      if (this.player.definition.attackKind === "projectile") this.fireProjectile(this.player.definition.attackDamage, this.player.definition.skillColour, this.player.definition.projectileSpeed);
      else this.meleeStrike(this.player.definition.attackDamage, 84);
    });
  }

  private trySkill(time: number): void {
    if (time < this.player.skillReadyAt || time < this.player.lockedUntil || this.player.action === "dead") return;
    this.player.skillReadyAt = time + 4200;
    this.player.lockAction("skill", time, 480);
    const radius = this.player.definition.id === "archer" || this.player.definition.id === "mage" ? 240 : 145;
    const ring = this.add.circle(this.player.x, this.player.y, radius, this.player.definition.skillColour, 0.18)
      .setStrokeStyle(5, this.player.definition.skillColour, 0.95).setDepth(15).setScale(0.2);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 430, onComplete: () => ring.destroy() });
    this.time.delayedCall(180, () => {
      this.enemies.children.each((child) => {
        const enemy = child as Enemy;
        if (enemy.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) <= radius) {
          this.damageEnemy(enemy, this.player.definition.skillDamage);
        }
        return true;
      });
      this.game.events.emit(GAME_EVENTS.message, this.player.definition.skillLabel);
    });
  }

  private meleeStrike(damage: number, reach: number): void {
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y)
      .add(this.player.facingVector().scale(reach * 0.55));
    const target = this.enemies.getChildren()
      .map((child) => child as Enemy)
      .filter((enemy) => enemy.active && Phaser.Math.Distance.Between(origin.x, origin.y, enemy.x, enemy.y) <= reach)
      .sort((a, b) => Phaser.Math.Distance.Between(origin.x, origin.y, a.x, a.y) - Phaser.Math.Distance.Between(origin.x, origin.y, b.x, b.y))[0];
    if (target) this.damageEnemy(target, damage);
    const arc = this.add.circle(origin.x, origin.y, reach, this.player.definition.skillColour, 0.08).setStrokeStyle(4, this.player.definition.skillColour).setDepth(18);
    this.tweens.add({ targets: arc, alpha: 0, scale: 1.25, duration: 150, onComplete: () => arc.destroy() });
  }

  private fireProjectile(damage: number, colour: number, speed: number): void {
    const vector = this.player.facingVector();
    const projectile = this.projectiles.get(this.player.x + vector.x * 46, this.player.y + vector.y * 46, "projectile") as Phaser.Physics.Arcade.Image | null;
    if (!projectile) return;
    projectile.setActive(true).setVisible(true).setTint(colour).setDepth(18).setData("damage", damage);
    projectile.setVelocity(vector.x * speed, vector.y * speed);
    this.time.delayedCall(1200, () => { if (projectile.active) projectile.destroy(); });
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    if (!enemy.active) return;
    enemy.health -= damage;
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (enemy.active) enemy.clearTint(); });
    if (enemy.health <= 0) {
      this.tweens.add({ targets: enemy, alpha: 0, scale: enemy.scale * 1.35, duration: 180, onComplete: () => enemy.destroy() });
    }
  }

  private updatePortalPrompt(): void {
    this.currentPortal = this.portalZones.find((zone) => Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), zone.getBounds()));
    this.game.events.emit(GAME_EVENTS.portalPrompt, this.currentPortal?.definition.label ?? "");
  }

  private enterPortal(portal: PortalDefinition): void {
    this.registry.set("mapId", portal.destinationMapId);
    this.registry.set("spawnId", portal.destinationSpawnId);
    this.scene.restart({ mapId: portal.destinationMapId, spawnId: portal.destinationSpawnId });
  }
}
