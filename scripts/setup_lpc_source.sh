#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="$repo_root/vendor/universal-lpc"
expected_archive_sha="5bdfcda856d570887079b1a602d534b1152788655c3a394d42a56cde95cfaa09"
upstream_url="https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator.git"
upstream_commit="675e21e04aaff8486a3a24e09573b3d5af9d28b9"

if test -e "$target"; then
  echo "LPC source already exists at $target; refusing to overwrite it." >&2
  exit 1
fi

mkdir -p "$repo_root/vendor"

if test "$#" -gt 0; then
  archive="$1"
  test -f "$archive" || { echo "Archive not found: $archive" >&2; exit 1; }
  actual_sha="$(sha256sum "$archive" | cut -d' ' -f1)"
  test "$actual_sha" = "$expected_archive_sha" || {
    echo "LPC archive checksum mismatch." >&2
    echo "Expected: $expected_archive_sha" >&2
    echo "Actual:   $actual_sha" >&2
    exit 1
  }

  extract_root="$(mktemp -d /tmp/solara_lpc_extract.XXXXXX)"
  unzip -q "$archive" -d "$extract_root"
  mapfile -t roots < <(find "$extract_root" -mindepth 1 -maxdepth 1 -type d)
  test "${#roots[@]}" -eq 1 || {
    echo "Expected exactly one root directory in LPC archive." >&2
    exit 1
  }
  mv "${roots[0]}" "$target"
else
  command -v git >/dev/null
  git init -q "$target"
  git -C "$target" remote add origin "$upstream_url"
  git -C "$target" fetch -q --depth 1 origin "$upstream_commit"
  git -C "$target" checkout -q --detach FETCH_HEAD
fi

test -f "$target/CREDITS.csv" || { echo "Missing LPC CREDITS.csv" >&2; exit 1; }
test -d "$target/spritesheets" || { echo "Missing LPC spritesheets directory" >&2; exit 1; }

echo "LPC source installed at $target"
echo "Direction mapping: up/left/down/right -> n/w/s/e"
