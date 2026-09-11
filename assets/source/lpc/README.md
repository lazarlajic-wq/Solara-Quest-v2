# Universal LPC source integration

The full generator is intentionally installed outside Git at `vendor/universal-lpc/`. The supplied archive is 144,434,985 bytes and cannot be stored as a normal GitHub blob. `lpc.lock.json` pins both the uploaded archive checksum and the official upstream commit.

Install from the exact uploaded archive:

```bash
./scripts/setup_lpc_source.sh "/path/to/Universal-LPC-Spritesheet-Character-Generator-master(1).zip"
```

Or install the pinned upstream revision:

```bash
./scripts/setup_lpc_source.sh
```

LPC rows map directly to Solara's four-direction contract:

| LPC | Solara |
| --- | --- |
| `up` | `n` |
| `left` | `w` |
| `down` | `s` |
| `right` | `e` |

Do not commit generated LPC artwork without its asset-specific credit rows. The upstream collection mixes CC0, CC-BY, CC-BY-SA, OGA-BY and GPL artwork. For distribution channels with DRM, prefer a deliberately selected CC0/OGA-BY subset and keep the exported credits visible in the game.

The high-resolution files in `assets/design/region_01/` remain visual masters. LPC is the deterministic source for the eventual 64 x 64 runtime frames, equipment layering and cardinal animation rows.
