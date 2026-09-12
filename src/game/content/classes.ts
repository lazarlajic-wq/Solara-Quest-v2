export type ClassId = "assassin" | "tank" | "mage" | "archer" | "swordsman";
export type AttackKind = "melee" | "projectile";

export interface ClassDefinition {
  id: ClassId;
  label: string;
  texture: string;
  colour: number;
  speed: number;
  maxHealth: number;
  attackKind: AttackKind;
  attackDamage: number;
  projectileSpeed: number;
  dashSpeed: number;
  dashDurationMs: number;
  skillLabel: string;
  skillDamage: number;
  skillColour: number;
}

export const CLASS_DEFINITIONS: Record<ClassId, ClassDefinition> = {
  assassin: {
    id: "assassin", label: "Assassin", texture: "hero-assassin", colour: 0x236c75,
    speed: 245, maxHealth: 90, attackKind: "melee", attackDamage: 24,
    projectileSpeed: 0, dashSpeed: 660, dashDurationMs: 180,
    skillLabel: "Crescent Execution", skillDamage: 48, skillColour: 0x7826d9
  },
  tank: {
    id: "tank", label: "Tank", texture: "hero-tank", colour: 0x2e9bc1,
    speed: 175, maxHealth: 170, attackKind: "melee", attackDamage: 20,
    projectileSpeed: 0, dashSpeed: 470, dashDurationMs: 260,
    skillLabel: "Groundbreaker", skillDamage: 42, skillColour: 0x3baeea
  },
  mage: {
    id: "mage", label: "Mage", texture: "hero-mage", colour: 0x1749b5,
    speed: 205, maxHealth: 95, attackKind: "projectile", attackDamage: 22,
    projectileSpeed: 520, dashSpeed: 720, dashDurationMs: 125,
    skillLabel: "Arcane Storm", skillDamage: 44, skillColour: 0x35d8ff
  },
  archer: {
    id: "archer", label: "Archer", texture: "hero-archer", colour: 0x4f8f26,
    speed: 225, maxHealth: 105, attackKind: "projectile", attackDamage: 25,
    projectileSpeed: 650, dashSpeed: 590, dashDurationMs: 210,
    skillLabel: "Arrow Rain", skillDamage: 46, skillColour: 0xa8e83c
  },
  swordsman: {
    id: "swordsman", label: "Swordsman", texture: "hero-swordsman", colour: 0x268aa0,
    speed: 215, maxHealth: 125, attackKind: "melee", attackDamage: 28,
    projectileSpeed: 0, dashSpeed: 560, dashDurationMs: 200,
    skillLabel: "Solar Blade Wave", skillDamage: 50, skillColour: 0xf4d35e
  }
};

export const CLASS_ORDER: ClassId[] = ["assassin", "tank", "mage", "archer", "swordsman"];
