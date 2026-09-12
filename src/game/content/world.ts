export type WorldTheme = "coast" | "field" | "harbour" | "capital" | "interior" | "boss";

export interface Point { x: number; y: number }
export interface SpawnPoint extends Point { id: string }
export interface PortalDefinition extends Point {
  id: string;
  label: string;
  destinationMapId: string;
  destinationSpawnId: string;
  width?: number;
  height?: number;
}
export interface BuildingDefinition extends Point {
  id: string;
  label: string;
  width: number;
  height: number;
  portalId?: string;
}
export interface EnemySpawn extends Point { count: number; tier: number }
export interface MapDefinition {
  id: string;
  label: string;
  widthTiles: number;
  heightTiles: number;
  theme: WorldTheme;
  spawns: SpawnPoint[];
  portals: PortalDefinition[];
  buildings: BuildingDefinition[];
  enemies: EnemySpawn[];
}

const outside = (id: string, label: string, widthTiles: number, heightTiles: number, theme: WorldTheme): MapDefinition => ({
  id, label, widthTiles, heightTiles, theme,
  spawns: [{ id: "west", x: 3, y: Math.floor(heightTiles / 2) }, { id: "east", x: widthTiles - 4, y: Math.floor(heightTiles / 2) }, { id: "centre", x: Math.floor(widthTiles / 2), y: Math.floor(heightTiles / 2) }],
  portals: [], buildings: [], enemies: []
});

const interior = (id: string, label: string, returnMapId: string, returnPortalId: string): MapDefinition => ({
  id, label, widthTiles: 36, heightTiles: 26, theme: "interior",
  spawns: [{ id: "entry", x: 18, y: 22 }],
  portals: [{ id: "exit", label: "Verlassen", x: 18, y: 24, destinationMapId: returnMapId, destinationSpawnId: returnPortalId, width: 3, height: 2 }],
  buildings: [], enemies: []
});

const spawnTown = outside("spawn_town", "Solara-Küstenstadt", 180, 130, "coast");
spawnTown.spawns.push(
  { id: "start", x: 90, y: 70 },
  { id: "inn_door", x: 48, y: 52 }, { id: "shop_door", x: 72, y: 46 },
  { id: "smithy_door", x: 102, y: 47 }, { id: "guild_door", x: 128, y: 55 },
  { id: "alchemy_door", x: 61, y: 87 }, { id: "quest_door", x: 116, y: 86 }
);
spawnTown.portals.push(
  { id: "to_training", label: "Trainingslager", x: 176, y: 65, destinationMapId: "training_camp", destinationSpawnId: "west", width: 3, height: 9 },
  { id: "to_harbour", label: "Hafen", x: 90, y: 126, destinationMapId: "harbour", destinationSpawnId: "north", width: 11, height: 3 },
  { id: "inn_door", label: "Gasthaus", x: 48, y: 51, destinationMapId: "spawn_inn", destinationSpawnId: "entry" },
  { id: "shop_door", label: "Ausrüstungsladen", x: 72, y: 45, destinationMapId: "spawn_shop", destinationSpawnId: "entry" },
  { id: "smithy_door", label: "Schmiede", x: 102, y: 46, destinationMapId: "spawn_smithy", destinationSpawnId: "entry" },
  { id: "guild_door", label: "Gildenhalle", x: 128, y: 54, destinationMapId: "spawn_guild", destinationSpawnId: "entry" },
  { id: "alchemy_door", label: "Alchemie", x: 61, y: 86, destinationMapId: "spawn_alchemy", destinationSpawnId: "entry" },
  { id: "quest_door", label: "Questhalle", x: 116, y: 85, destinationMapId: "spawn_quest_hall", destinationSpawnId: "entry" }
);
spawnTown.buildings.push(
  { id: "inn", label: "Gasthaus", x: 40, y: 38, width: 17, height: 12, portalId: "inn_door" },
  { id: "shop", label: "Ausrüstung", x: 65, y: 32, width: 15, height: 12, portalId: "shop_door" },
  { id: "smithy", label: "Schmiede", x: 94, y: 32, width: 17, height: 13, portalId: "smithy_door" },
  { id: "guild", label: "Gildenhalle", x: 118, y: 38, width: 21, height: 15, portalId: "guild_door" },
  { id: "alchemy", label: "Alchemie", x: 54, y: 72, width: 15, height: 13, portalId: "alchemy_door" },
  { id: "quest", label: "Questhalle", x: 106, y: 70, width: 21, height: 14, portalId: "quest_door" }
);

const training = outside("training_camp", "Trainingslager", 160, 110, "field");
training.portals.push(
  { id: "to_town", label: "Küstenstadt", x: 2, y: 55, destinationMapId: "spawn_town", destinationSpawnId: "east", width: 3, height: 9 },
  { id: "to_field_1", label: "Feldgebiet I", x: 156, y: 55, destinationMapId: "field_1", destinationSpawnId: "west", width: 3, height: 9 }
);
training.enemies.push({ x: 82, y: 55, count: 8, tier: 1 });

const harbour = outside("harbour", "Hafen von Solara", 190, 125, "harbour");
harbour.spawns.push({ id: "north", x: 95, y: 4 });
harbour.portals.push(
  { id: "to_town", label: "Küstenstadt", x: 95, y: 2, destinationMapId: "spawn_town", destinationSpawnId: "centre", width: 11, height: 3 },
  { id: "to_field_1", label: "Küstenpfad", x: 186, y: 62, destinationMapId: "field_1", destinationSpawnId: "west", width: 3, height: 10 }
);

const fields = [1, 2, 3, 4].map((number) => outside(`field_${number}`, `Feldgebiet ${number}`, 220, 150, "field"));
fields.forEach((map, index) => {
  const previous = index === 0 ? "training_camp" : `field_${index}`;
  const next = index === 3 ? "boss_field" : `field_${index + 2}`;
  map.portals.push(
    { id: "to_previous", label: "Zurück", x: 2, y: 75, destinationMapId: previous, destinationSpawnId: "east", width: 3, height: 10 },
    { id: "to_next", label: "Weiter", x: 216, y: 75, destinationMapId: next, destinationSpawnId: "west", width: 3, height: 10 }
  );
  map.enemies.push({ x: 80, y: 68, count: 7 + index * 2, tier: index + 1 }, { x: 150, y: 95, count: 6 + index, tier: index + 1 });
});

const bossField = outside("boss_field", "Leviathan-Ruinen", 240, 170, "boss");
bossField.portals.push(
  { id: "to_field_4", label: "Feldgebiet IV", x: 2, y: 85, destinationMapId: "field_4", destinationSpawnId: "east", width: 3, height: 12 },
  { id: "to_capital", label: "Solara-Hauptstadt", x: 236, y: 85, destinationMapId: "capital", destinationSpawnId: "west", width: 3, height: 12 }
);
bossField.enemies.push({ x: 120, y: 85, count: 1, tier: 6 });

const capital = outside("capital", "Solara-Hauptstadt", 240, 170, "capital");
capital.portals.push(
  { id: "to_boss", label: "Leviathan-Ruinen", x: 2, y: 85, destinationMapId: "boss_field", destinationSpawnId: "east", width: 3, height: 12 },
  { id: "raid_gate", label: "Erster Raid (Vorbereitung)", x: 120, y: 18, destinationMapId: "raid_antechamber", destinationSpawnId: "entry", width: 8, height: 5 }
);
capital.spawns.push({ id: "raid_gate", x: 120, y: 23 });
capital.buildings.push(
  { id: "capital_palace", label: "Palast", x: 95, y: 58, width: 50, height: 25 },
  { id: "market_west", label: "Westmarkt", x: 35, y: 100, width: 32, height: 18 },
  { id: "market_east", label: "Ostmarkt", x: 174, y: 100, width: 32, height: 18 }
);

export const WORLD_DEFINITIONS: Record<string, MapDefinition> = Object.fromEntries([
  spawnTown, training, harbour, ...fields, bossField, capital,
  interior("spawn_inn", "Gasthaus", "spawn_town", "inn_door"),
  interior("spawn_shop", "Ausrüstungsladen", "spawn_town", "shop_door"),
  interior("spawn_smithy", "Schmiede", "spawn_town", "smithy_door"),
  interior("spawn_guild", "Gildenhalle", "spawn_town", "guild_door"),
  interior("spawn_alchemy", "Alchemie", "spawn_town", "alchemy_door"),
  interior("spawn_quest_hall", "Questhalle", "spawn_town", "quest_door"),
  interior("raid_antechamber", "Raid-Vorhalle", "capital", "raid_gate")
].map((map) => [map.id, map]));

export function validateWorldGraph(): void {
  const seen = new Set<string>();
  for (const map of Object.values(WORLD_DEFINITIONS)) {
    if (seen.has(map.id)) throw new Error(`Duplicate map id: ${map.id}`);
    seen.add(map.id);
    const spawnIds = new Set(map.spawns.map((spawn) => spawn.id));
    if (spawnIds.size !== map.spawns.length) throw new Error(`Duplicate spawn id in ${map.id}`);
  }
  for (const map of Object.values(WORLD_DEFINITIONS)) {
    for (const portal of map.portals) {
      const destination = WORLD_DEFINITIONS[portal.destinationMapId];
      if (!destination) throw new Error(`Portal ${map.id}/${portal.id} has missing destination map`);
      if (!destination.spawns.some((spawn) => spawn.id === portal.destinationSpawnId)) {
        throw new Error(`Portal ${map.id}/${portal.id} has missing destination spawn`);
      }
    }
  }
}
