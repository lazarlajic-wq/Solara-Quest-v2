/**
 * Quest definitions. Includes the tutorial line (levels 1-5), the mandatory
 * "Der Weg des Kämpfers" quest that opens at level 5 and sends the player to
 * the training camp for class selection, and a raid quest per region.
 */

import { REGIONS } from './regions';

export type QuestKind = 'tutorial' | 'main' | 'class' | 'raid' | 'side';

export interface QuestDef {
  id: string;
  name: string;
  kind: QuestKind;
  region: number;
  giver: string;
  description: string;
  /** Level required to accept. */
  minLevel: number;
  objectives: string[];
  rewardXp: number;
  rewardGold: number;
}

export const QUESTS: Record<string, QuestDef> = {
  q_intro_move: {
    id: 'q_intro_move', name: 'Erste Schritte', kind: 'tutorial', region: 1,
    giver: 'Versammlungsleiter', minLevel: 1,
    description: 'Bewege dich mit WASD und erkunde die Startstadt.',
    objectives: ['Bewege dich in acht Richtungen', 'Sprich mit dem Versammlungsleiter'],
    rewardXp: 30, rewardGold: 5,
  },
  q_intro_combat: {
    id: 'q_intro_combat', name: 'Kampfgrundlagen', kind: 'tutorial', region: 1,
    giver: 'Wache', minLevel: 1,
    description: 'Lerne Angriff, Combo und Dash am Übungspfahl und im Küstenpfad.',
    objectives: ['Führe eine 3er-Combo aus', 'Dashe mit Shift', 'Besiege 5 Gegner'],
    rewardXp: 120, rewardGold: 15,
  },
  q_path_of_the_fighter: {
    id: 'q_path_of_the_fighter', name: 'Der Weg des Kämpfers', kind: 'main', region: 1,
    giver: 'Versammlungsleiter', minLevel: 5,
    description: 'Gehe zum Trainingslager und wähle bei den fünf Klassenmeistern deine Klasse.',
    objectives: ['Erreiche Level 5', 'Betrete das Trainingslager', 'Wähle eine Klasse'],
    rewardXp: 200, rewardGold: 30,
  },
};

// One raid quest per playable region.
for (const region of REGIONS.filter((r) => r.playable)) {
  QUESTS[`q_raid_r${region.id}`] = {
    id: `q_raid_r${region.id}`,
    name: `Raid: ${region.name}`,
    kind: 'raid',
    region: region.id,
    giver: 'Raid-Verwalter',
    description: `Besiege den Raid-Boss von ${region.name}, um die nächste Region freizuschalten.`,
    minLevel: region.levelMax,
    objectives: [`Betrete den Raid`, `Besiege den Raid-Boss`],
    rewardXp: 1000 * region.id,
    rewardGold: 200 * region.id,
  };
}

export function getQuest(id: string): QuestDef | undefined {
  return QUESTS[id];
}
