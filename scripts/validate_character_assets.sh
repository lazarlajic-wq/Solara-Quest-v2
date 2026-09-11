#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
manifest="$repo_root/assets/characters/region_01_manifest.json"
lpc_lock="$repo_root/assets/source/lpc/lpc.lock.json"

command -v identify >/dev/null
command -v python3 >/dev/null

python3 -m json.tool "$repo_root/assets/manifest.json" >/dev/null
python3 -m json.tool "$manifest" >/dev/null
python3 -m json.tool "$lpc_lock" >/dev/null

python3 - "$manifest" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    data = json.load(handle)

assert data["directionOrder"] == ["n", "w", "s", "e"]
assert data["frameSize"] == [64, 64]
assert len(data["classes"]) == 5
assert len(data["requiredActions"]) == 14
PY

python3 - "$lpc_lock" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    data = json.load(handle)

assert data["solaraDirectionOrder"] == ["n", "w", "s", "e"]
assert data["runtimeDirectionOrder"] == ["up", "left", "down", "right"]
assert data["frameSize"] == [64, 64]
assert len(data["source"]["commit"]) == 40
assert len(data["uploadedArchive"]["sha256"]) == 64
PY

for relative_path in \
  assets/design/region_01/equipment_direction_master_v2.png \
  assets/design/region_01/assassin_motion_master_v1.png \
  assets/design/region_01/tank_motion_master_v1.png \
  assets/design/region_01/mage_motion_master_v1.png \
  assets/design/region_01/archer_motion_master_v1.png \
  assets/design/region_01/swordsman_motion_master_v1.png
do
  file="$repo_root/$relative_path"
  test -s "$file"
  channels="$(identify -format '%[channels]' "$file")"
  opaque="$(identify -format '%[opaque]' "$file")"
  case "$channels" in
    *a*) ;;
    *) echo "FAIL: $relative_path has no alpha channel" >&2; exit 1 ;;
  esac
  test "$opaque" = "false" || {
    echo "FAIL: $relative_path is fully opaque" >&2
    exit 1
  }
done

lpc_root="$repo_root/vendor/universal-lpc"
if test -d "$lpc_root"; then
  test -f "$lpc_root/CREDITS.csv"
  test -d "$lpc_root/spritesheets"
  grep -F 'DIRECTIONS = ["up", "left", "down", "right"]' \
    "$lpc_root/sources/state/constants.ts" >/dev/null
  echo "Pinned LPC source: PASS"
else
  echo "Pinned LPC source: NOT INSTALLED (run scripts/setup_lpc_source.sh)"
fi

echo "Character concept assets: PASS"
echo "Runtime 64x64 sheets: PENDING"
