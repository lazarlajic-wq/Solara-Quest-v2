#!/usr/bin/env python3
"""Build deterministic runtime sprites from the approved Region 1 source atlases.

The Higgsfield source sheets are concept atlases with a baked checkerboard rather
than alpha transparency. This script extracts only approved cells, removes the
connected checkerboard background, and writes stable, game-ready PNGs.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/higgsfield"
OUTPUT = ROOT / "assets/runtime/region_01"


def remove_connected_checkerboard(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    candidate = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            if max(red, green, blue) - min(red, green, blue) <= 18 and (red + green + blue) / 3 >= 218:
                candidate[y * width + x] = 1

    outside = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if outside[index] or not candidate[index]:
            continue
        outside[index] = 1
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    for y in range(height):
        for x in range(width):
            if outside[y * width + x]:
                red, green, blue, _ = pixels[x, y]
                pixels[x, y] = (red, green, blue, 0)
    return rgba


def remove_small_components(image: Image.Image, minimum_pixels: int) -> Image.Image:
    alpha = image.getchannel("A")
    alpha_pixels = alpha.load()
    rgba_pixels = image.load()
    width, height = image.size
    visited = bytearray(width * height)
    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if visited[start_index] or alpha_pixels[start_x, start_y] == 0:
                continue
            queue = [(start_x, start_y)]
            visited[start_index] = 1
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.pop()
                component.append((x, y))
                for next_x, next_y in (
                    (x - 1, y - 1), (x, y - 1), (x + 1, y - 1),
                    (x - 1, y),                 (x + 1, y),
                    (x - 1, y + 1), (x, y + 1), (x + 1, y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    index = next_y * width + next_x
                    if not visited[index] and alpha_pixels[next_x, next_y] != 0:
                        visited[index] = 1
                        queue.append((next_x, next_y))
            if len(component) < minimum_pixels:
                for x, y in component:
                    red, green, blue, _ = rgba_pixels[x, y]
                    rgba_pixels[x, y] = (red, green, blue, 0)
    return image


def save_tile(source: Image.Image, name: str, box: tuple[int, int, int, int]) -> None:
    tile = source.crop(box).resize((32, 32), Image.Resampling.NEAREST).convert("RGBA")
    tile.save(OUTPUT / f"terrain_{name}.png", optimize=True)


def save_cutout(source: Image.Image, name: str, box: tuple[int, int, int, int]) -> None:
    cutout = remove_connected_checkerboard(source.crop(box))
    if name.startswith("building_"):
        cutout = remove_small_components(cutout, 180)
    cutout.save(OUTPUT / f"{name}.png", optimize=True)


def save_animation(
    source: Image.Image,
    name: str,
    boxes: list[tuple[int, int, int, int]],
    frame_size: int,
) -> None:
    sheet = Image.new("RGBA", (frame_size * len(boxes), frame_size), (0, 0, 0, 0))
    for index, box in enumerate(boxes):
        frame = remove_connected_checkerboard(source.crop(box))
        bounds = frame.getbbox()
        if bounds:
            frame = frame.crop(bounds)
            scale = min((frame_size - 8) / frame.width, (frame_size - 8) / frame.height, 1.0)
            frame = frame.resize(
                (max(1, round(frame.width * scale)), max(1, round(frame.height * scale))),
                Image.Resampling.NEAREST,
            )
            x = index * frame_size + (frame_size - frame.width) // 2
            y = frame_size - frame.height - 4
            sheet.alpha_composite(frame, (x, y))
    sheet.save(OUTPUT / f"{name}.png", optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    terrain = Image.open(SOURCE / "regions/01_solara_coast/terrain_tileset.png").convert("RGB")
    buildings = Image.open(SOURCE / "regions/01_solara_coast/building_exteriors.png").convert("RGB")
    environment = Image.open(SOURCE / "global/animated_environment.png").convert("RGB")

    # Texture interiors avoid the baked checkerboard borders in the concept atlas.
    save_tile(terrain, "grass", (37, 38, 69, 70))
    save_tile(terrain, "grass_alt", (122, 38, 154, 70))
    save_tile(terrain, "dirt", (119, 129, 151, 161))
    save_tile(terrain, "stone", (35, 214, 67, 246))
    save_tile(terrain, "sand", (36, 298, 68, 330))
    save_tile(terrain, "water_a", (466, 386, 498, 418))
    save_tile(terrain, "water_b", (550, 386, 582, 418))

    building_boxes = {
        "building_guild": (66, 30, 348, 235),
        "building_inn": (374, 35, 632, 238),
        "building_smithy": (642, 30, 918, 240),
        "building_shop": (62, 248, 340, 445),
        "building_quest": (354, 248, 638, 431),
        "building_alchemy": (278, 438, 525, 615),
    }
    for name, box in building_boxes.items():
        save_cutout(buildings, name, box)

    prop_boxes = {
        "decor_bush": (17, 889, 94, 975),
        "decor_flower_bush": (92, 889, 184, 975),
        "decor_rock": (788, 889, 866, 972),
        "decor_grass": (862, 889, 948, 975),
    }
    for name, box in prop_boxes.items():
        save_cutout(terrain, name, box)

    save_animation(
        environment,
        "fountain_animation",
        [(510 + index * 84, 372, 586 + index * 84, 456) for index in range(6)],
        96,
    )


if __name__ == "__main__":
    main()
