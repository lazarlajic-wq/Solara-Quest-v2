# Solara Quest V2 character pipeline

## Binding runtime contract

- Four cardinal directions only, always ordered `n`, `w`, `s`, `e`.
- Every runtime frame is 64 x 64 px with a bottom-centre pivot.
- Runtime PNGs use straight RGBA transparency, nearest-neighbour scaling and no baked checkerboard, labels, shadows or scenery.
- Direction masters and Higgsfield atlases are visual references. They are not imported directly into the game until they pass the grid and alpha checks.
- A class keeps the same silhouette, armour, weapon family, handedness and core palette through every movement and skill in a region.

## Region 1 class locks

| Class | Silhouette and armour | Weapon lock | Core palette | Combat identity |
| --- | --- | --- | --- | --- |
| Assassin | teal hood, light leather, short split coat | paired daggers | deep teal, brown, silver | short evasive bursts and purple shadow cuts |
| Tank | full coastal plate, tabard, large heater shield | mace and shield | silver, ocean blue, warm gold | planted defence, guard impacts and blue barriers |
| Mage | pointed hat, long robe, cloth sleeves | crystal staff | royal blue, gold, cyan | elemental casts with staff-led anticipation |
| Archer | hooded leather, short cape, visible quiver | recurved bow | moss green, brown, ivory | mobile ranged attacks and green wind trails |
| Swordsman | light coastal plate, scarf, short cape | longsword, no shield | silver, teal, brown | readable sword arcs and forward gap closing |

## Animation set

| Runtime action | Frames | Loop | LPC source or construction rule |
| --- | ---: | --- | --- |
| `idle` | 2 | yes | LPC idle |
| `walk` | 9 | yes | LPC walk |
| `run` | 8 | yes | LPC run |
| `dash` | 6 | no | class run/jump pose plus locked class trail; never a random new costume |
| `attack_1` | 6 | no | slash for Assassin/Swordsman, thrust for Tank, shoot for Archer, spellcast for Mage |
| `attack_2` | 6-8 | no | backslash or thrust variant using the same equipment |
| `attack_3` | 6-8 | no | class finisher with the same weapon silhouette |
| `skill_1` | 7-10 | no | utility/control skill with class-colour FX |
| `skill_2` | 7-10 | no | mobility/defence skill with class-colour FX |
| `skill_3` | 9-12 | no | signature skill; stronger FX, unchanged equipment |
| `block` | 4 | hold | shield guard for Tank; weapon/parry pose for melee; brace pose for ranged/caster |
| `hit` | 4 | no | directional hit reaction derived from hurt pose |
| `death` | 6 | no | custom collapse; equipment remains attached |
| `revive` | 6 | no | reversed recovery with class-colour pulse |

## Locked dash and skill language

| Class | Dash | Skill 1 | Skill 2 | Skill 3 |
| --- | --- | --- | --- | --- |
| Assassin | low shadow step, two violet afterimages | cross cut | smoke decoy | crescent execution |
| Tank | shield-first charge, blue dust wake | shield bash | guard dome | groundbreaker |
| Mage | short cyan blink, robe and staff retained | fire sigil | frost pillar | arcane storm |
| Archer | low evasive roll, green wind streak | piercing shot | snare volley | arrow rain |
| Swordsman | forward step cut, pale teal streak | rising slash | parry counter | solar blade wave |

## Production and QA gates

1. Approve one four-direction equipment master per region.
2. Build base LPC movement layers with credited source files.
3. Add weapons and armour from the same locked loadout to every action.
4. Construct dash and skill poses from approved movement/attack silhouettes.
5. Render PNGs and validate dimensions, RGBA alpha, frame count and direction order.
6. Inspect each sheet on dark, light and checker backgrounds at 1x and nearest-neighbour 4x.
7. Reject any sheet with gear swaps, mirrored weapon mistakes, stray pixels, clipped weapons, inconsistent pivots or unexplained colours.

The Region 1 equipment master and all five class motion masters under `assets/design/region_01/` passed the class, palette, direction and transparent-background review. The Mage master was corrected because its first blink draft lost the staff; the Archer master was corrected because its first roll draft lost the bow/quiver silhouette. These files are still high-resolution concept masters and intentionally fail the 64 x 64 runtime-grid requirement.
