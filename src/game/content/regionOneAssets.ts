import terrainGrass from "../../../assets/runtime/region_01/terrain_grass.png";
import terrainGrassAlt from "../../../assets/runtime/region_01/terrain_grass_alt.png";
import terrainDirt from "../../../assets/runtime/region_01/terrain_dirt.png";
import terrainStone from "../../../assets/runtime/region_01/terrain_stone.png";
import terrainSand from "../../../assets/runtime/region_01/terrain_sand.png";
import terrainWaterA from "../../../assets/runtime/region_01/terrain_water_a.png";
import terrainWaterB from "../../../assets/runtime/region_01/terrain_water_b.png";
import buildingGuild from "../../../assets/runtime/region_01/building_guild.png";
import buildingInn from "../../../assets/runtime/region_01/building_inn.png";
import buildingSmithy from "../../../assets/runtime/region_01/building_smithy.png";
import buildingShop from "../../../assets/runtime/region_01/building_shop.png";
import buildingQuest from "../../../assets/runtime/region_01/building_quest.png";
import buildingAlchemy from "../../../assets/runtime/region_01/building_alchemy.png";
import decorBush from "../../../assets/runtime/region_01/decor_bush.png";
import decorFlowerBush from "../../../assets/runtime/region_01/decor_flower_bush.png";
import decorRock from "../../../assets/runtime/region_01/decor_rock.png";
import decorGrass from "../../../assets/runtime/region_01/decor_grass.png";
import fountainAnimation from "../../../assets/runtime/region_01/fountain_animation.png";

export const REGION_ONE_IMAGES = {
  "r1-grass": terrainGrass,
  "r1-grass-alt": terrainGrassAlt,
  "r1-dirt": terrainDirt,
  "r1-stone": terrainStone,
  "r1-sand": terrainSand,
  "r1-water-a": terrainWaterA,
  "r1-water-b": terrainWaterB,
  "r1-building-guild": buildingGuild,
  "r1-building-inn": buildingInn,
  "r1-building-smithy": buildingSmithy,
  "r1-building-shop": buildingShop,
  "r1-building-quest": buildingQuest,
  "r1-building-alchemy": buildingAlchemy,
  "r1-decor-bush": decorBush,
  "r1-decor-flower-bush": decorFlowerBush,
  "r1-decor-rock": decorRock,
  "r1-decor-grass": decorGrass
} as const;

export const REGION_ONE_SHEETS = {
  "r1-fountain": { url: fountainAnimation, frameWidth: 96, frameHeight: 96, endFrame: 5 }
} as const;

export const REGION_ONE_BUILDINGS: Record<string, string> = {
  inn: "r1-building-inn",
  shop: "r1-building-shop",
  smithy: "r1-building-smithy",
  guild: "r1-building-guild",
  alchemy: "r1-building-alchemy",
  quest: "r1-building-quest"
};
