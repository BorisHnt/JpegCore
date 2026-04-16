#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]

SHEETS = {
    "sheet1": "4f37251c-13d9-434d-893d-62980933ce5e.png",
    "sheet2": "ee596480-e413-48d5-936d-7adca230aba6.png",
}

ASSETS = [
    {"id": "skyblog-dolphin-blue", "label": "Dolphin Blue Splash", "kind": "sticker", "sheet": "sheet1", "bbox": [18, 28, 286, 258]},
    {"id": "skyblog-dolphins-heart", "label": "Dolphins Heart Trio", "kind": "sticker", "sheet": "sheet1", "bbox": [288, 20, 575, 256]},
    {"id": "skyblog-doves-heart", "label": "Doves Pink Heart", "kind": "sticker", "sheet": "sheet1", "bbox": [560, 24, 810, 264]},
    {"id": "skyblog-dolphin-bubble", "label": "Dolphin Bubble Ring", "kind": "sticker", "sheet": "sheet1", "bbox": [792, 24, 1016, 286]},
    {"id": "skyblog-angel-text", "label": "Angel Glitter Script", "kind": "sticker", "sheet": "sheet1", "bbox": [20, 212, 360, 350]},
    {"id": "skyblog-diamond-blue", "label": "Blue Diamond Heart", "kind": "sticker", "sheet": "sheet1", "bbox": [18, 220, 225, 385]},
    {"id": "skyblog-heart-pink-glitter", "label": "Pink Glitter Heart", "kind": "sticker", "sheet": "sheet1", "bbox": [210, 240, 398, 432]},
    {"id": "skyblog-dove-white", "label": "White Dove Solo", "kind": "sticker", "sheet": "sheet1", "bbox": [326, 228, 610, 492]},
    {"id": "skyblog-wolves-howl", "label": "Howling Wolves", "kind": "sticker", "sheet": "sheet1", "bbox": [615, 248, 1016, 495]},
    {"id": "skyblog-frame-heart-floral", "label": "Heart Floral Frame", "kind": "frame", "sheet": "sheet1", "bbox": [18, 498, 210, 742]},
    {"id": "skyblog-frame-ice-butterfly", "label": "Ice Butterfly Frame", "kind": "frame", "sheet": "sheet1", "bbox": [228, 498, 510, 748]},
    {"id": "skyblog-frame-silver-ornate", "label": "Silver Ornate Frame", "kind": "frame", "sheet": "sheet1", "bbox": [500, 500, 764, 748]},
    {"id": "skyblog-frame-pink-gems", "label": "Pink Gems Frame", "kind": "frame", "sheet": "sheet1", "bbox": [754, 500, 1014, 750]},
    {"id": "skyblog-moon-pink", "label": "Pink Moon Sparkle", "kind": "sticker", "sheet": "sheet1", "bbox": [18, 716, 180, 864]},
    {"id": "skyblog-rainbow-sparkle", "label": "Rainbow Sparkle Trail", "kind": "sticker", "sheet": "sheet1", "bbox": [118, 720, 368, 866]},
    {"id": "skyblog-galaxy-panel", "label": "Galaxy Purple Panel", "kind": "sticker", "sheet": "sheet1", "bbox": [370, 744, 696, 964]},
    {"id": "skyblog-beach-moon", "label": "Beach Moon Sunset", "kind": "sticker", "sheet": "sheet1", "bbox": [704, 744, 1006, 964]},
    {"id": "skyblog-sexy-flames", "label": "Sexy Flames", "kind": "sticker", "sheet": "sheet1", "bbox": [18, 868, 360, 1066]},
    {"id": "skyblog-glitter-panel", "label": "Pink Glitter Panel", "kind": "sticker", "sheet": "sheet1", "bbox": [370, 958, 694, 1180]},
    {"id": "skyblog-retro-road", "label": "Retro Neon Road", "kind": "sticker", "sheet": "sheet1", "bbox": [704, 958, 1004, 1180]},
    {"id": "skyblog-galaxy-square", "label": "Galaxy Square", "kind": "sticker", "sheet": "sheet1", "bbox": [18, 1064, 360, 1218]},
    {"id": "skyblog-dice-pink-left", "label": "Pink Dice Left", "kind": "sticker", "sheet": "sheet1", "bbox": [18, 1214, 122, 1336]},
    {"id": "skyblog-dice-pink-right", "label": "Pink Dice Right", "kind": "sticker", "sheet": "sheet1", "bbox": [112, 1214, 220, 1336]},
    {"id": "skyblog-necklace-heart", "label": "Heart Necklace", "kind": "sticker", "sheet": "sheet1", "bbox": [18, 1320, 220, 1488]},
    {"id": "skyblog-cross-rose", "label": "Rose Cross", "kind": "sticker", "sheet": "sheet1", "bbox": [212, 1178, 365, 1488]},
    {"id": "skyblog-baby-text", "label": "Baby Bling Text", "kind": "sticker", "sheet": "sheet1", "bbox": [354, 1178, 620, 1314]},
    {"id": "skyblog-winged-heart-pink", "label": "Winged Heart Pink", "kind": "sticker", "sheet": "sheet1", "bbox": [606, 1178, 858, 1364]},
    {"id": "skyblog-flame-heart-blue", "label": "Blue Flame Heart", "kind": "sticker", "sheet": "sheet1", "bbox": [820, 1178, 1016, 1424]},
    {"id": "skyblog-heart-pink-faceted", "label": "Faceted Pink Heart", "kind": "sticker", "sheet": "sheet1", "bbox": [352, 1288, 620, 1490]},
    {"id": "skyblog-winged-heart-ice", "label": "Winged Heart Ice", "kind": "sticker", "sheet": "sheet1", "bbox": [602, 1328, 870, 1490]},
    {"id": "skyblog-dolphin-splash-blue", "label": "Dolphin Splash Blue", "kind": "sticker", "sheet": "sheet2", "bbox": [18, 34, 274, 260]},
    {"id": "skyblog-dolphins-heart-bluepink", "label": "Dolphins Heart Blue Pink", "kind": "sticker", "sheet": "sheet2", "bbox": [286, 34, 608, 266]},
    {"id": "skyblog-doves-kiss", "label": "Doves Kiss Heart", "kind": "sticker", "sheet": "sheet2", "bbox": [610, 24, 998, 286]},
    {"id": "skyblog-wolf-white", "label": "White Wolf", "kind": "sticker", "sheet": "sheet2", "bbox": [18, 252, 182, 486]},
    {"id": "skyblog-wolf-moon", "label": "Wolf Moon", "kind": "sticker", "sheet": "sheet2", "bbox": [174, 252, 386, 490]},
    {"id": "skyblog-wolf-black", "label": "Black Wolf Glitter", "kind": "sticker", "sheet": "sheet2", "bbox": [380, 254, 598, 490]},
    {"id": "skyblog-heart-flame", "label": "Flame Heart", "kind": "sticker", "sheet": "sheet2", "bbox": [584, 270, 794, 476]},
    {"id": "skyblog-heart-pink-outline", "label": "Pink Outline Heart", "kind": "sticker", "sheet": "sheet2", "bbox": [784, 276, 998, 468]},
    {"id": "skyblog-heart-glitter-pink", "label": "Pink Glitter Heart Soft", "kind": "sticker", "sheet": "sheet2", "bbox": [18, 478, 236, 692]},
    {"id": "skyblog-frame-heart-crystal", "label": "Crystal Heart Frame", "kind": "frame", "sheet": "sheet2", "bbox": [236, 480, 470, 676]},
    {"id": "skyblog-frame-gold-ornate", "label": "Gold Ornate Frame", "kind": "frame", "sheet": "sheet2", "bbox": [468, 478, 748, 694]},
    {"id": "skyblog-frame-pink-ornate", "label": "Pink Ornate Frame", "kind": "frame", "sheet": "sheet2", "bbox": [758, 474, 1000, 684]},
    {"id": "skyblog-wings-lilac-left", "label": "Lilac Wing Left", "kind": "sticker", "sheet": "sheet2", "bbox": [18, 664, 136, 790]},
    {"id": "skyblog-wings-lilac-right", "label": "Lilac Wing Right", "kind": "sticker", "sheet": "sheet2", "bbox": [134, 664, 256, 790]},
    {"id": "skyblog-butterfly-pink", "label": "Pink Butterfly", "kind": "sticker", "sheet": "sheet2", "bbox": [254, 664, 470, 818]},
    {"id": "skyblog-moon-pillow", "label": "Moon Pillow Galaxy", "kind": "sticker", "sheet": "sheet2", "bbox": [468, 674, 748, 884]},
    {"id": "skyblog-neon-grid-heart", "label": "Neon Grid Heart", "kind": "sticker", "sheet": "sheet2", "bbox": [758, 552, 1006, 732]},
    {"id": "skyblog-glitter-square-large", "label": "Glitter Square Large", "kind": "sticker", "sheet": "sheet2", "bbox": [18, 784, 270, 914]},
    {"id": "skyblog-rainbow-love", "label": "Rainbow Love", "kind": "sticker", "sheet": "sheet2", "bbox": [18, 664, 250, 794]},
    {"id": "skyblog-rose-pink", "label": "Pink Rose", "kind": "sticker", "sheet": "sheet2", "bbox": [262, 664, 474, 818]},
    {"id": "skyblog-dice-gray", "label": "Gray Dice", "kind": "sticker", "sheet": "sheet2", "bbox": [438, 814, 606, 964]},
    {"id": "skyblog-dolphin-splash-small", "label": "Dolphin Splash Small", "kind": "sticker", "sheet": "sheet2", "bbox": [438, 888, 608, 1044]},
    {"id": "skyblog-frame-chain-pink", "label": "Pink Chain Frame", "kind": "frame", "sheet": "sheet2", "bbox": [492, 1020, 752, 1218]},
    {"id": "skyblog-sky-pink-moon", "label": "Pink Moon Sky", "kind": "sticker", "sheet": "sheet2", "bbox": [748, 720, 1000, 940]},
    {"id": "skyblog-glitter-square-small", "label": "Glitter Square Small", "kind": "sticker", "sheet": "sheet2", "bbox": [18, 904, 270, 1214]},
    {"id": "skyblog-sky-planets-purple", "label": "Purple Planets Sky", "kind": "sticker", "sheet": "sheet2", "bbox": [270, 944, 500, 1214]},
    {"id": "skyblog-clouds-rainbow", "label": "Rainbow Clouds", "kind": "sticker", "sheet": "sheet2", "bbox": [498, 944, 748, 1214]},
    {"id": "skyblog-moon-landscape-purple", "label": "Purple Moon Landscape", "kind": "sticker", "sheet": "sheet2", "bbox": [746, 944, 1008, 1214]},
]


def remove_white_background(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB")).astype(np.float32)
    white_distance = 255.0 - rgb
    alpha = np.clip(white_distance.max(axis=2) * 5.2, 0, 255)
    alpha[alpha < 8] = 0

    alpha_ratio = np.where(alpha > 0, alpha / 255.0, 1.0)
    rgb_unmatted = np.where(
        alpha[..., None] > 0,
        np.clip((rgb - (255.0 * (1.0 - alpha_ratio[..., None]))) / np.maximum(alpha_ratio[..., None], 1e-3), 0, 255),
        0,
    )

    rgba = np.dstack([rgb_unmatted.astype(np.uint8), alpha.astype(np.uint8)])
    return Image.fromarray(rgba)


def trim_transparent(image: Image.Image, threshold: int = 10) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"))
    coords = np.argwhere(alpha > threshold)
    if coords.size == 0:
        return image

    y1, x1 = coords.min(axis=0)
    y2, x2 = coords.max(axis=0) + 1
    return image.crop((int(x1), int(y1), int(x2), int(y2)))


def save_asset(sheet_image: Image.Image, item: dict, stickers_dir: Path, frames_dir: Path) -> tuple[str, str, str]:
    crop = sheet_image.crop(tuple(item["bbox"]))
    transparent = trim_transparent(remove_white_background(crop))

    target_dir = frames_dir if item["kind"] == "frame" else stickers_dir
    filename = f"{item['id'].replace('-', '_')}.png"
    target_path = target_dir / filename
    transparent.save(target_path)

    folder = "frames" if item["kind"] == "frame" else "stickers"
    relative_file = f"skyblog-pack/{filename}"
    return item["id"], item["label"], relative_file if folder else filename


def write_generated_manifest(stickers: list[tuple[str, str, str]], frames: list[tuple[str, str, str]]) -> None:
    target = REPO_ROOT / "scripts" / "data" / "generated-skyblog-pack.js"

    def lines(name: str, rows: list[tuple[str, str, str]]) -> str:
        body = ",\n".join(f'  ["{asset_id}", "{label}", "{file}"]' for asset_id, label, file in rows)
        return f"export const {name} = [\n{body}\n];\n"

    target.write_text(
        "// Generated by scripts/tools/extract_skyblog_pack.py\n\n"
        + lines("generatedSkyblogStickers", stickers)
        + "\n"
        + lines("generatedSkyblogFrames", frames),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract the Y2K Skyblog megapack sheets into transparent PNG assets.")
    parser.add_argument(
        "--source-dir",
        default="/run/media/bhanicot/PHILIPS32GB/JpegCore-megapack/y2k_skyblog_pack_updated",
        help="Directory containing the two source sheets.",
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    stickers_dir = REPO_ROOT / "assets" / "stickers" / "skyblog-pack"
    frames_dir = REPO_ROOT / "assets" / "frames" / "skyblog-pack"
    stickers_dir.mkdir(parents=True, exist_ok=True)
    frames_dir.mkdir(parents=True, exist_ok=True)

    loaded_sheets = {
        key: Image.open(source_dir / filename).convert("RGBA")
        for key, filename in SHEETS.items()
    }

    sticker_rows: list[tuple[str, str, str]] = []
    frame_rows: list[tuple[str, str, str]] = []

    for item in ASSETS:
        row = save_asset(loaded_sheets[item["sheet"]], item, stickers_dir, frames_dir)
        if item["kind"] == "frame":
            frame_rows.append(row)
        else:
            sticker_rows.append(row)

    write_generated_manifest(sticker_rows, frame_rows)

    summary = {
        "stickers": len(sticker_rows),
        "frames": len(frame_rows),
        "output_stickers": str(stickers_dir),
        "output_frames": str(frames_dir),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
