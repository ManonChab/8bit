"""Generate the Chef theme's background + character stills (no animation
this pass -- see retro/2026-09-27-pixellab-visual-art.md, "stills only"
scope chosen to keep a generation buffer).

Spec, deliberately different from the developer theme (retro guideline #1
says default to the proven spec *unless* deliberately deviating -- this is
a deliberate deviation, per direct creative direction):
- Chef faces the viewer (direction="south"), not a side profile.
- Chef is framed waist-up, not full-body -- he stands behind a counter, so
  only torso/arms/head need to exist in the sprite.
- Counter (wood, vegetables/ingredients spread on it) AND the oven live in
  the shared background, not the character layer -- both are static set
  dressing, per direct instruction ("doesn't need to be an object or
  movable"). No separate object sprites either way (retro guideline #4).
- The error-state oven fire is NOT a 4th generation: it'll be a procedural
  overlay (like the window day/night cycle) drawn at the oven's real pixel
  position once we can measure it off the generated background -- same
  reason the window cycle was code, not art: a flame flicker doesn't need
  generated-art quality to read well, and this keeps the batch at exactly
  the 5 generations already agreed (background + base + idle/working/error).

Character identity lock uses the same technique as developer v2: one
neutral "base" pose generated first, then idle/working/error each
generated independently *from that base* via init_image (not chained
state-to-state, which caused pose drift on the first PixelLab pass).

Bypasses the pixellab SDK's response parsing (same reason as the other
scripts here: this account bills in "generations," which crashes the SDK's
usd-only response model after the API has already charged the call).

Usage:
    .venv/Scripts/python.exe scripts/pixellab/generate_chef_stills.py <asset> [--seed N] [--dry-run]

<asset> is one of: background, base, idle, working, error
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
OUT_BASE = ROOT / "art" / "chef-theme" / "pixellab"
API_BASE = "https://api.pixellab.ai/v2"

SHARED_STYLE = {
    "outline": "single color black outline",
    "shading": "medium shading",
    "detail": "medium detail",
}

CHARACTER_DESCRIPTION = (
    "a chef visible from the waist up, standing behind a kitchen counter, "
    "facing directly toward the viewer, white chef's toque hat, white "
    "double-breasted chef coat, dark apron, warm skin tone"
)

ASSETS = {
    "background": {
        "kind": "background",
        "out": OUT_BASE / "background" / "background.png",
        "description": (
            "pixel art of a cozy kitchen interior, close-up cropped view, a "
            "wooden counter in the foreground with vegetables and "
            "ingredients spread out on it, a kitchen oven in the background "
            "behind the counter, cabinets on the wall, warm lighting"
        ),
        "size": (128, 112),
    },
    "base": {
        "kind": "character",
        "out": OUT_BASE / "character" / "base.png",
        "description": f"pixel art of {CHARACTER_DESCRIPTION}, neutral relaxed pose, arms resting on the counter",
        "size": (64, 64),
    },
    "idle": {
        "kind": "character",
        "out": OUT_BASE / "character" / "idle.png",
        "description": f"pixel art of {CHARACTER_DESCRIPTION}, wiping the counter with a cloth, sleepy tired half-closed eyes",
        "size": (64, 64),
        "init_from": "base",
    },
    "working": {
        "kind": "character",
        "out": OUT_BASE / "character" / "working.png",
        "description": f"pixel art of {CHARACTER_DESCRIPTION}, chopping vegetables on the counter with a knife, one hand raised mid-chop, focused expression",
        "size": (64, 64),
        "init_from": "base",
    },
    "error": {
        "kind": "character",
        "out": OUT_BASE / "character" / "error.png",
        "description": f"pixel art of {CHARACTER_DESCRIPTION}, panicked expression, flinching to the side with hands raised",
        "size": (64, 64),
        "init_from": "base",
    },
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("asset", choices=sorted(ASSETS))
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cfg = ASSETS[args.asset]
    print(f"asset={args.asset} kind={cfg['kind']} size={cfg['size']}")
    print(f"description={cfg['description']!r}")

    request_data = {
        "description": cfg["description"],
        "image_size": {"width": cfg["size"][0], "height": cfg["size"][1]},
        "view": "side",
        "isometric": False,
        "seed": args.seed,
        **SHARED_STYLE,
    }

    if cfg["kind"] == "character":
        request_data["direction"] = "south"  # facing the viewer, per direction given
        request_data["no_background"] = True

    init_from = cfg.get("init_from")
    if init_from:
        init_path = ASSETS[init_from]["out"]
        if not init_path.exists():
            print(f"init reference {init_path} doesn't exist yet -- generate '{init_from}' first", file=sys.stderr)
            sys.exit(1)
        init_b64 = base64.b64encode(init_path.read_bytes()).decode()
        request_data["init_image"] = {"type": "base64", "base64": init_b64, "format": "png"}
        request_data["init_image_strength"] = 140
        print(f"init_image={init_from}.png init_image_strength=140")

    if args.dry_run:
        print("(dry run, no API call made)")
        return

    load_dotenv(ROOT / ".env")
    api_key = os.environ.get("PIXELLAB_API_KEY")
    if not api_key:
        print("PIXELLAB_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    headers = {"Authorization": f"Bearer {api_key}"}
    resp = requests.post(f"{API_BASE}/create-image-pixflux", headers=headers, json=request_data)
    resp.raise_for_status()
    payload = resp.json()

    cfg["out"].parent.mkdir(parents=True, exist_ok=True)
    raw_path = cfg["out"].parent / f"{args.asset}-raw-response.json"
    raw_path.write_text(json.dumps(payload))
    print(f"saved raw response to {raw_path.relative_to(ROOT)} (safety net)")
    print(f"usage: {payload.get('usage')}")

    img_b64 = payload["image"]["base64"]
    if img_b64.startswith("data:"):
        img_b64 = img_b64.split(",", 1)[1]
    cfg["out"].write_bytes(base64.b64decode(img_b64))
    print(f"saved {cfg['out'].relative_to(ROOT)}")


if __name__ == "__main__":
    main()
