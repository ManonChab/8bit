# Character animations — PixelLab `animate-with-text-v3` pass

Related: [Visual epic #4](https://github.com/ManonChab/8bit/issues/4), [Developer theme #7](https://github.com/ManonChab/8bit/issues/7)

Replaces the procedural JS bob/translate loop in `public/avatar.js`
(`IDLE_BOB`/`ACTIVE_BOB`) with real per-frame sprite animation, generated from
the existing `../character/{idle,working,error}.png` v2 sprites.

## Why v3, not the older `/animate-with-text`

An initial attempt used the `pixellab` PyPI SDK's `Client.animate_with_text`,
which calls the older `/animate-with-text` endpoint (text `description` +
separate `reference_image` + `image_guidance_scale`/`text_guidance_scale`
tuning). That produced completely off-style output (flat vector/emoji look,
ignored the reference sprite) and cost 1 generation for a discarded result.

`/animate-with-text-v3` is a different, better-fitting endpoint: it takes a
single `first_frame` (our existing v2 sprite) + an `action` string, and
generates frames from that one image directly — no separate guidance-scale
tuning needed, since the first frame *is* the style/identity lock. It's an
async background job (`POST` returns a `background_job_id`, poll
`GET /v2/background-jobs/{id}` until `completed`).

The `pixellab` SDK (PyPI, latest 1.0.5 at generation time) doesn't wrap v3 at
all, so `scripts/pixellab/generate_animation.py` calls it directly via
`requests` against `https://api.pixellab.ai/v2`, using the SDK only for
`.env` loading conventions. The script dumps the raw job JSON to disk on
every poll before touching it, so a bug in the parsing code can't strand a
generation we've already paid for again.

## Params used

- `first_frame`: the existing `../character/{state}.png` (64×64, transparent) — not regenerated.
- `no_background: true`, `enhance_prompt: false` (avoids an extra 0.05-generation charge; our action strings were concrete enough without it).
- `seed: 0` (random) for all three — not pinned for reproducibility.
- Per state:
  - **idle** — `frame_count: 4`. Action: "breathing calmly while resting hands near the keyboard, subtle idle motion, no typing."
  - **working** — `frame_count: 8`. Action: "typing rapidly on the keyboard with both hands, focused on the monitor."
  - **error** — `frame_count: 8`. Action: "panicking, flinching back from the monitor as it sparks, arms jerking up."

Frame counts follow the API's own guidance (4 for simple/idle loops, 8 for
standard animations). Output includes the first frame itself plus the
generated frames (e.g. `frame_count: 8` → `frame-0.png`..`frame-8.png`, 9
files).

## Cost

3 successful generations (idle, working, error) at 1 generation each on this
account's subscription-generations plan, plus 2 discarded generations from
the debugging above (1 lost to a client-side SDK parsing bug on the old
endpoint that crashed after the API had already charged the call, 1 spent on
the off-style `/animate-with-text` v1 test). Total spent getting this pass:
5 generations.

## Known accepted state

Not yet wired into `public/avatar.js` — frames exist on disk only. Next step
if this pass is accepted: replace `IDLE_BOB`/`ACTIVE_BOB` translate logic
with real frame-cycling through these sprite sequences per state.
