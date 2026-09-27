"""Generate a character animation via PixelLab's animate-with-text-v3 endpoint.

v3 is an async background job: POST kicks it off and returns a job id, then we
poll GET /v2/background-jobs/{id} until status is completed/failed. It's
first_frame + action only (no separate description/reference_image split like
the older v1 /animate-with-text endpoint) -- the v2 character sprite IS the
first frame, so the "keep the v2 base sprite" identity lock is inherent to
this endpoint, not something we have to engineer via image_guidance_scale.

Costs real generation credits against the account's free trial allowance --
run deliberately, one state at a time, not in a loop over all states.
enhance_prompt is left off (default False) since it costs an extra 0.05
generations per call and our action strings are already concrete.

Usage:
    .venv/Scripts/python.exe scripts/pixellab/generate_animation.py <state> [--frames N] [--dry-run]

<state> is one of: idle, working, error
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
CHAR_DIR = ROOT / "art" / "developer-theme" / "pixellab" / "v2" / "character"
OUT_DIR = ROOT / "art" / "developer-theme" / "pixellab" / "v2" / "animations"
API_BASE = "https://api.pixellab.ai/v2"

STATES = {
    "idle": {
        "reference": "idle.png",
        "action": "breathing calmly while resting hands near the keyboard, subtle idle motion, no typing",
        "frame_count": 4,
    },
    "working": {
        "reference": "working.png",
        "action": "typing rapidly on the keyboard with both hands, focused on the monitor",
        "frame_count": 8,
    },
    "error": {
        "reference": "error.png",
        "action": "panicking, flinching back from the monitor as it sparks, arms jerking up",
        "frame_count": 8,
    },
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("state", choices=sorted(STATES))
    parser.add_argument("--frames", type=int, default=None, help="override frame_count (must be even, 4-16)")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true", help="print the request, don't call the API")
    args = parser.parse_args()

    cfg = STATES[args.state]
    frame_count = args.frames or cfg["frame_count"]
    reference_path = CHAR_DIR / cfg["reference"]

    print(f"state={args.state} reference={reference_path.name} frame_count={frame_count}")
    print(f"action={cfg['action']!r}")

    if args.dry_run:
        print("(dry run, no API call made)")
        return

    load_dotenv(ROOT / ".env")
    api_key = os.environ.get("PIXELLAB_API_KEY")
    if not api_key:
        print("PIXELLAB_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    headers = {"Authorization": f"Bearer {api_key}"}
    first_frame_b64 = base64.b64encode(reference_path.read_bytes()).decode()

    request_data = {
        "first_frame": {"base64": first_frame_b64},
        "action": cfg["action"],
        "frame_count": frame_count,
        "seed": args.seed,
        "no_background": True,
        "enhance_prompt": False,
    }

    resp = requests.post(f"{API_BASE}/animate-with-text-v3", headers=headers, json=request_data)
    resp.raise_for_status()
    job = resp.json()
    job_id = job["background_job_id"]
    print(f"job started: {job_id} (status={job.get('status')})")

    state_out_dir = OUT_DIR / args.state
    state_out_dir.mkdir(parents=True, exist_ok=True)

    while True:
        time.sleep(3)
        poll = requests.get(f"{API_BASE}/background-jobs/{job_id}", headers=headers)
        poll.raise_for_status()
        result = poll.json()
        status = result.get("status")
        print(f"  status={status}")

        # Dump every poll response -- safety net so a bug below this line can
        # never again lose a generation we already paid for.
        (state_out_dir / "raw-job.json").write_text(json.dumps(result))

        if status == "completed":
            break
        if status == "failed":
            print(f"job failed: {result.get('last_response')}", file=sys.stderr)
            sys.exit(1)

    print(f"usage: {result.get('usage')}")

    images = result["last_response"]["images"]
    for i, img in enumerate(images):
        b64 = img["base64"]
        if b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]
        frame_bytes = base64.b64decode(b64)
        frame_path = state_out_dir / f"frame-{i}.png"
        frame_path.write_bytes(frame_bytes)
        print(f"saved {frame_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
