"""Generate a bust/portrait card for the developer character via PixelLab's
create-image-pixflux endpoint.

Uses the existing v2/character/base.png as a `color_image` (forced palette)
reference so hair/hoodie/skin colors stay locked to the established
character, while letting the text description drive the new bust/portrait
composition (a much tighter crop than the full-body seated sprite, so an
`init_image` would fight the framing change instead of helping).

Bypasses the `pixellab` SDK's response parsing for the same reason as
generate_animation.py: this account is billed in "generations", not "usd",
which crashes the SDK's pydantic response model after the API has already
charged the call. Raw `requests` + a safety-net dump of the raw JSON to
disk before touching it.

Usage:
    .venv/Scripts/python.exe scripts/pixellab/generate_portrait.py [--dry-run] [--seed N]
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
CHAR_DIR = ROOT / "art" / "developer-theme" / "pixellab" / "v2" / "character"
OUT_DIR = ROOT / "art" / "developer-theme" / "pixellab" / "v2" / "portrait"
API_BASE = "https://api.pixellab.ai/v2"

COLOR_REFERENCE = CHAR_DIR / "base.png"

DESCRIPTION = (
    "pixel art game character portrait, close-up head and shoulders bust of a "
    "young man, short tousled light brown hair, pale skin, friendly calm "
    "expression, wearing a pale blue hooded sweater with the hood down and "
    "visible at the shoulders, three-quarter view facing right, painterly "
    "shaded video game character-select portrait"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=90210)
    parser.add_argument("--size", type=int, default=96)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"description={DESCRIPTION!r}")
    print(f"color_image={COLOR_REFERENCE.name} size={args.size}x{args.size} seed={args.seed}")

    if args.dry_run:
        print("(dry run, no API call made)")
        return

    load_dotenv(ROOT / ".env")
    api_key = os.environ.get("PIXELLAB_API_KEY")
    if not api_key:
        print("PIXELLAB_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    headers = {"Authorization": f"Bearer {api_key}"}
    color_b64 = base64.b64encode(COLOR_REFERENCE.read_bytes()).decode()

    request_data = {
        "description": DESCRIPTION,
        "image_size": {"width": args.size, "height": args.size},
        "text_guidance_scale": 8,
        "outline": "single color black outline",
        "shading": "medium shading",
        "detail": "highly detailed",
        "direction": "north-east",
        "isometric": False,
        "no_background": True,
        "color_image": {"type": "base64", "base64": color_b64, "format": "png"},
        "seed": args.seed,
    }

    resp = requests.post(f"{API_BASE}/create-image-pixflux", headers=headers, json=request_data)
    resp.raise_for_status()
    payload = resp.json()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "raw-response.json").write_text(json.dumps(payload))
    print(f"usage: {payload.get('usage')}")

    img_b64 = payload["image"]["base64"]
    if img_b64.startswith("data:"):
        img_b64 = img_b64.split(",", 1)[1]
    portrait_path = OUT_DIR / "portrait.png"
    portrait_path.write_bytes(base64.b64decode(img_b64))
    print(f"saved {portrait_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
