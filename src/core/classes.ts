/**
 * The Novice Fighter starting state and the five main classes. Each class
 * carries its own stats, a distinct dash configuration (the class dash style),
 * a base combo chain, and three starter skills. This is pure data + config so
 * it can be unit-tested and consumed by both the Phaser layer and the UI.
 */

import type { DashConfig } from './dash';
import type { ComboChain, AttackDef } from './combat';

export type ClassId =
  | 'novice'
  | 'assassin'
  | 'tank'
  | 'mage'
  | 'archer'
  | 'swordsman';

export const MAIN_CLASSES: ClassId[] = [
  'assassin',
  'tank',
  'mage',
  'archer',
  'swordsman',
];

export type ResourceKind = 'energy' | 'mana' | 'stamina';

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  cooldownMs: number;
  cost: number;
  ranged: boolean;
}

export interface ClassStats {
  maxHp: number;
  maxResource: number;
  resourceKind: ResourceKind;
  /** Regen per second. */
  resourceRegen: number;
  moveSpeed: number; // px/second
  runSpeed: number; // px/second
  defense: number;
  critChance: number; // 0..1
}

export interface ClassDef {
  id: ClassId;
  name: string; // display (German)
  playstyle: string; // short description (German)
  stats: ClassStats;
  dash: DashConfig;
  combo: ComboChain;
  skills: SkillDef[];
  /** Whether this class uses a ranged basic attack. */
  ranged: boolean;
  /** Equipment set id template, e.g. "assassin" -> assassin_r1..r5. */
  setKey: string;
}

function attack(
  key: string,
  p: Partial<AttackDef> & Pick<AttackDef, 'damage'>,
): AttackDef {
  return {
    key,
    startupMs: 90,
    activeMs: 70,
    recoveryMs: 220,
    cancelWindowStart: 0.35,
    knockback: 60,
    reach: 34,
    arc: 26,
    dashCancelable: true,
    ...p,
  };
}

const NOVICE_COMBO: ComboChain = {
  linkWindowMs: 520,
  attacks: [
    attack('slash1', { damage: 6 }),
    attack('slash2', { damage: 7, startupMs: 80 }),
    attack('slash3', { damage: 10, recoveryMs: 300, knockback: 130 }),
  ],
};

export const NOVICE: ClassDef = {
  id: 'novice',
  name: 'Anfänger',
  playstyle: 'Einfacher Kämpfer mit Schwert. Lernt Bewegung, Angriff und Dash.',
  ranged: false,
  setKey: 'novice',
  stats: {
    maxHp: 90,
    maxResource: 100,
    resourceKind: 'stamina',
    resourceRegen: 22,
    moveSpeed: 150,
    runSpeed: 205,
    defense: 3,
    critChance: 0.05,
  },
  dash: {
    distance: 130,
    startupMs: 40,
    activeMs: 150,
    recoveryMs: 90,
    cooldownMs: 620,
    energyCost: 25,
    iframeFraction: 0.5,
    style: 'basic',
  },
  combo: NOVICE_COMBO,
  skills: [
    {
      id: 'novice_guard',
      name: 'Schnellblock',
      description: 'Kurzer Block, der den nächsten Treffer abschwächt.',
      cooldownMs: 4000,
      cost: 20,
      ranged: false,
    },
    {
      id: 'novice_heal',
      name: 'Verbinden',
      description: 'Stellt etwas Leben wieder her.',
      cooldownMs: 12000,
      cost: 30,
      ranged: false,
    },
  ],
};

function combo(attacks: AttackDef[], linkWindowMs = 520): ComboChain {
  return { attacks, linkWindowMs };
}

export const CLASS_DEFS: Record<ClassId, ClassDef> = {
  novice: NOVICE,

  assassin: {
    id: 'assassin',
    name: 'Assassine',
    playstyle:
      'Sehr schnell, kurze Reichweite, hohe Mobilität, kritische Treffer und Schatten-Dash.',
    ranged: false,
    setKey: 'assassin',
    stats: {
      maxHp: 95,
      maxResource: 110,
      resourceKind: 'energy',
      resourceRegen: 30,
      moveSpeed: 172,
      runSpeed: 235,
      defense: 3,
      critChance: 0.22,
    },
    dash: {
      distance: 165,
      startupMs: 20,
      activeMs: 120,
      recoveryMs: 70,
      cooldownMs: 480,
      energyCost: 22,
      iframeFraction: 0.7,
      style: 'shadow',
    },
    combo: combo([
      attack('dagger1', { damage: 5, startupMs: 60, activeMs: 55, recoveryMs: 150, reach: 26 }),
      attack('dagger2', { damage: 6, startupMs: 55, activeMs: 55, recoveryMs: 150, reach: 26 }),
      attack('dagger3', { damage: 9, startupMs: 60, activeMs: 60, recoveryMs: 220, reach: 30, knockback: 90 }),
    ], 460),
    skills: [
      { id: 'as_shadowstep', name: 'Schattenschritt', description: 'Blitz hinter das Ziel und kritischer Treffer.', cooldownMs: 6000, cost: 30, ranged: false },
      { id: 'as_fan', name: 'Klingenfächer', description: 'Wirft Klingen im Kegel nach vorne.', cooldownMs: 5000, cost: 25, ranged: true },
      { id: 'as_vanish', name: 'Verschwinden', description: 'Kurze Unsichtbarkeit und erhöhtes Tempo.', cooldownMs: 14000, cost: 40, ranged: false },
    ],
  },

  tank: {
    id: 'tank',
    name: 'Wächter',
    playstyle:
      'Schwere Rüstung, Schild, hohe Verteidigung, Gegnerkontrolle und Schulteransturm-Dash.',
    ranged: false,
    setKey: 'tank',
    stats: {
      maxHp: 170,
      maxResource: 100,
      resourceKind: 'stamina',
      resourceRegen: 18,
      moveSpeed: 128,
      runSpeed: 168,
      defense: 12,
      critChance: 0.05,
    },
    dash: {
      distance: 120,
      startupMs: 60,
      activeMs: 170,
      recoveryMs: 140,
      cooldownMs: 900,
      energyCost: 30,
      iframeFraction: 0.35,
      style: 'charge',
    },
    combo: combo([
      attack('mace1', { damage: 9, startupMs: 130, activeMs: 80, recoveryMs: 300, reach: 36, arc: 34 }),
      attack('mace2', { damage: 12, startupMs: 140, activeMs: 90, recoveryMs: 340, reach: 38, knockback: 180 }),
    ], 640),
    skills: [
      { id: 'tk_taunt', name: 'Provokation', description: 'Zieht Gegner an und erhöht Verteidigung.', cooldownMs: 8000, cost: 25, ranged: false },
      { id: 'tk_slam', name: 'Schildstoß', description: 'Stößt Gegner zurück und betäubt kurz.', cooldownMs: 7000, cost: 30, ranged: false },
      { id: 'tk_bulwark', name: 'Bollwerk', description: 'Blockt Angriffe für einige Sekunden.', cooldownMs: 16000, cost: 40, ranged: false },
    ],
  },

  mage: {
    id: 'mage',
    name: 'Magier',
    playstyle:
      'Fernkampf, Mana, Flächenzauber, Elementeffekte und magischer Blink-Dash.',
    ranged: true,
    setKey: 'mage',
    stats: {
      maxHp: 78,
      maxResource: 160,
      resourceKind: 'mana',
      resourceRegen: 26,
      moveSpeed: 140,
      runSpeed: 180,
      defense: 2,
      critChance: 0.08,
    },
    dash: {
      distance: 180,
      startupMs: 10,
      activeMs: 90,
      recoveryMs: 110,
      cooldownMs: 700,
      energyCost: 25,
      iframeFraction: 0.9,
      style: 'blink',
    },
    combo: combo([
      attack('bolt1', { damage: 8, startupMs: 120, activeMs: 40, recoveryMs: 260, reach: 320, arc: 10 }),
    ], 700),
    skills: [
      { id: 'mg_fireball', name: 'Feuerball', description: 'Explodiert und trifft eine Fläche.', cooldownMs: 3000, cost: 30, ranged: true },
      { id: 'mg_frost', name: 'Frostnova', description: 'Verlangsamt Gegner in der Nähe.', cooldownMs: 8000, cost: 40, ranged: true },
      { id: 'mg_storm', name: 'Arkansturm', description: 'Anhaltender Flächenschaden.', cooldownMs: 15000, cost: 70, ranged: true },
    ],
  },

  archer: {
    id: 'archer',
    name: 'Bogenschütze',
    playstyle:
      'Fernkampf, Bogen, mobile Angriffe, Fallen und schnelle Ausweichrolle.',
    ranged: true,
    setKey: 'archer',
    stats: {
      maxHp: 92,
      maxResource: 120,
      resourceKind: 'stamina',
      resourceRegen: 28,
      moveSpeed: 158,
      runSpeed: 210,
      defense: 4,
      critChance: 0.15,
    },
    dash: {
      distance: 150,
      startupMs: 25,
      activeMs: 130,
      recoveryMs: 90,
      cooldownMs: 560,
      energyCost: 24,
      iframeFraction: 0.6,
      style: 'roll',
    },
    combo: combo([
      attack('shot1', { damage: 7, startupMs: 90, activeMs: 30, recoveryMs: 200, reach: 300, arc: 8 }),
      attack('shot2', { damage: 9, startupMs: 80, activeMs: 30, recoveryMs: 240, reach: 300, arc: 8 }),
    ], 520),
    skills: [
      { id: 'ar_multishot', name: 'Mehrfachschuss', description: 'Feuert einen Pfeilfächer.', cooldownMs: 5000, cost: 30, ranged: true },
      { id: 'ar_trap', name: 'Falle', description: 'Legt eine verlangsamende Falle.', cooldownMs: 9000, cost: 25, ranged: false },
      { id: 'ar_piercer', name: 'Durchschlag', description: 'Starker durchdringender Schuss.', cooldownMs: 12000, cost: 45, ranged: true },
    ],
  },

  swordsman: {
    id: 'swordsman',
    name: 'Schwertkämpfer',
    playstyle:
      'Schneller Nahkampf, mittlere Rüstung, Schwertkombinationen und Klingenschritt-Dash.',
    ranged: false,
    setKey: 'swordsman',
    stats: {
      maxHp: 120,
      maxResource: 110,
      resourceKind: 'stamina',
      resourceRegen: 24,
      moveSpeed: 155,
      runSpeed: 208,
      defense: 7,
      critChance: 0.12,
    },
    dash: {
      distance: 145,
      startupMs: 25,
      activeMs: 120,
      recoveryMs: 80,
      cooldownMs: 540,
      energyCost: 22,
      iframeFraction: 0.55,
      style: 'bladestep',
    },
    combo: combo([
      attack('sword1', { damage: 8, startupMs: 70, activeMs: 60, recoveryMs: 180, reach: 36 }),
      attack('sword2', { damage: 9, startupMs: 70, activeMs: 60, recoveryMs: 190, reach: 36 }),
      attack('sword3', { damage: 11, startupMs: 75, activeMs: 70, recoveryMs: 230, reach: 40 }),
      attack('sword4', { damage: 15, startupMs: 90, activeMs: 80, recoveryMs: 320, reach: 44, knockback: 180 }),
    ], 560),
    skills: [
      { id: 'sw_lunge', name: 'Sturmstoß', description: 'Schneller Vorstoß mit Schaden.', cooldownMs: 5000, cost: 25, ranged: false },
      { id: 'sw_whirl', name: 'Wirbelklinge', description: 'Rundumschlag gegen alle Nachbarn.', cooldownMs: 7000, cost: 35, ranged: false },
      { id: 'sw_parry', name: 'Konter', description: 'Pariert und schlägt zurück.', cooldownMs: 10000, cost: 30, ranged: false },
    ],
  },
};

export function getClass(id: ClassId): ClassDef {
  return CLASS_DEFS[id];
}
