#!/usr/bin/env bash
set -euo pipefail

base="https://d8j0ntlcm91z4.cloudfront.net/user_379MV5ZOqdWJGetfaQ3uifah1Ol"

download() {
  local id="$1"
  local stamp="$2"
  local target="$3"
  mkdir -p "$(dirname "$target")"
  if [[ -s "$target" ]] && file "$target" | rg -q "PNG image data"; then
    return
  fi
  while (( $(jobs -pr | wc -l) >= 8 )); do
    wait -n
  done
  (
    curl -L --fail --silent --show-error \
      "$base/hf_20260911_${stamp}_${id}.png" \
      -o "$target.part"
    mv "$target.part" "$target"
  ) &
}

download "83506437-dbe6-450c-840a-1568c83cf724" "041525" "assets/source/higgsfield/global/ui_inventory_icons.png"
download "97a771e1-b823-497c-9ef5-27d99d0b2836" "041525" "assets/source/higgsfield/global/combat_effects.png"
download "fabf8638-932c-4340-9832-4579042eff71" "041525" "assets/source/higgsfield/global/interaction_world_objects.png"
download "40f77378-b31e-4151-bd0a-7194f58e17c9" "041525" "assets/source/higgsfield/global/raid_world_boss_arena_kit.png"
download "07066351-087d-4aac-b8dd-c590b47cf0ac" "041525" "assets/source/higgsfield/global/npc_master_atlas.png"
download "35edc73c-e748-430e-a97c-e7fecb0f28f3" "041525" "assets/source/higgsfield/global/animated_environment.png"

download "bfa18f20-9942-4898-b1b5-da232ae60a68" "041459" "assets/source/higgsfield/characters/archer_animation_master.png"
download "80e0ff0d-aa9e-4884-80a9-9afe883263dc" "041458" "assets/source/higgsfield/characters/mage_animation_master.png"
download "0e621e83-3693-4bf9-81fe-b738aa1c5151" "041458" "assets/source/higgsfield/characters/novice_fighter_animation_master.png"
download "811bbf3e-ee04-4063-b8be-cc93f0364d85" "041458" "assets/source/higgsfield/characters/assassin_animation_master.png"
download "8476601f-18c6-4bd2-8d80-6d62c128d97f" "041458" "assets/source/higgsfield/characters/swordsman_animation_master.png"
download "62538f08-ddf0-441e-97e8-fbf6521b391c" "041458" "assets/source/higgsfield/characters/tank_animation_master.png"

download "2b500da9-ee43-4733-8932-13a20e8ac220" "041427" "assets/source/higgsfield/characters/customisation_master.png"
download "3563a3a4-1030-4f14-8322-e1d03a3e7892" "041427" "assets/source/higgsfield/characters/equipment_weapon_master.png"
download "4a2190a2-51f9-44d7-89f5-a2ebe36cab6f" "041305" "assets/source/higgsfield/global/style_anchor_atlas.png"

download "913e9068-3cd9-4611-9bd8-bdc3dff35693" "041305" "assets/source/higgsfield/regions/01_solara_coast/terrain_tileset.png"
download "9d21bc82-b582-4add-8983-37cfd48e8db5" "041305" "assets/source/higgsfield/regions/01_solara_coast/building_exteriors.png"
download "b59fd3e9-ae6b-4561-9a40-602fbf76ff50" "041305" "assets/source/higgsfield/regions/01_solara_coast/interior_tileset_props.png"
download "eda5a603-daba-43d7-a45a-012c5131c5e8" "041305" "assets/source/higgsfield/regions/01_solara_coast/creature_atlas.png"
download "0830b1ad-a9af-4cfe-b940-04a426bb438f" "041305" "assets/source/higgsfield/regions/01_solara_coast/harbour_training_pet_taming.png"

download "fd7a034a-74d0-4bad-a68b-f4681a378f99" "041336" "assets/source/higgsfield/regions/02_elderwood/terrain_environment.png"
download "dc7c7cfd-cdef-482e-a8dd-941ddf4fe200" "041336" "assets/source/higgsfield/regions/02_elderwood/buildings_interiors.png"
download "1426c795-645a-4efe-bdff-4a6b02a1b516" "041336" "assets/source/higgsfield/regions/02_elderwood/creature_atlas.png"
download "568f7725-2f90-4c70-860c-a8600cb07d3a" "041336" "assets/source/higgsfield/regions/02_elderwood/transport_training_pet_expedition.png"

download "cc087ac2-c11b-48bb-b47f-4e39dd5f8af5" "041336" "assets/source/higgsfield/regions/03_sundervale/terrain_environment.png"
download "b5783677-0359-443e-bcee-6233476ca811" "041336" "assets/source/higgsfield/regions/03_sundervale/buildings_interiors.png"
download "28be4780-3378-4c0f-9911-5fcddea333a0" "041402" "assets/source/higgsfield/regions/03_sundervale/creature_atlas.png"
download "11529b2c-028f-467e-bf78-fd8e640a5d4f" "041402" "assets/source/higgsfield/regions/03_sundervale/transport_training_pet_expedition.png"

download "a89ecde6-723e-47c1-929b-2da677824287" "041402" "assets/source/higgsfield/regions/04_emberfall/terrain_environment.png"
download "90ff888f-8d5b-4a92-bbfb-fc2f19e2041b" "041402" "assets/source/higgsfield/regions/04_emberfall/buildings_interiors.png"
download "4fb477ec-316d-45b9-a3de-56f8838d86b4" "041402" "assets/source/higgsfield/regions/04_emberfall/creature_atlas.png"
download "e8c1f133-c639-4d86-9d90-ae142d7613fd" "041402" "assets/source/higgsfield/regions/04_emberfall/transport_training_pet_expedition.png"

download "aef6ace3-5565-477e-91db-d37853f57e1c" "041428" "assets/source/higgsfield/regions/05_astral_frost/terrain_environment.png"
download "0369e896-0165-43b6-a051-4edb2f71a597" "041428" "assets/source/higgsfield/regions/05_astral_frost/buildings_interiors.png"
download "f194a529-d27e-4a68-ab41-77203d871f34" "041427" "assets/source/higgsfield/regions/05_astral_frost/creature_atlas.png"
download "604b22f5-29e2-44bb-b867-e6e51448a5e5" "041427" "assets/source/higgsfield/regions/05_astral_frost/transport_training_pet_expedition.png"

wait
echo "Downloaded 36 final Higgsfield production assets."
