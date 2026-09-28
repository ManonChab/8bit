# Chef character + kitchen background — PixelLab generation notes

Related: [Visual epic #4](https://github.com/ManonChab/8bit/issues/4), [Chef theme #11](https://github.com/ManonChab/8bit/issues/11)

Generated via `scripts/pixellab/generate_chef_stills.py`, calling
`/create-image-pixflux` directly (same reason as the developer theme's
scripts bypass the `pixellab` SDK: this account bills in "generations,"
which crashes the SDK's usd-only response model after the API has already
charged the call). Stills only this pass -- no animations, no portrait --
per the budget-conscious scope chosen in
[retro/2026-09-27-pixellab-visual-art.md](../../../retro/2026-09-27-pixellab-visual-art.md).

## Spec -- deliberately different from the developer theme

The developer theme's spec (side view, direction north-east, full-body
seated) was the retro's recommended default, but direct creative direction
for Chef deviated from it on purpose:

- **Direction: `south`** (facing the viewer), not a side profile.
- **Waist-up framing**, not full-body -- the chef stands behind a counter,
  so only the torso/arms/head need to exist in the sprite; the counter in
  the background covers the rest.
- **Counter (wood, vegetables/ingredients on it) and the oven are both
  baked into the shared background**, not generated as separate object
  sprites (retro guideline #4) and not part of the character layer.
- `outline: "single color black outline"`, `shading: "medium shading"`,
  `detail: "medium detail"` -- unchanged from developer's spec.
- Background 128x112, character 64x64 (transparent, `no_background: true`)
  -- unchanged from developer's spec.

## Identity lock

Same technique as developer v2: `character/base.png` generated once
(neutral pose), then idle/working/error each generated independently *from
that same base* via `init_image` (`init_image_strength: 140`), not chained
state-to-state.

## Error-state fire -- not a generation

The oven (baked into the background) is meant to flare up during the error
state. Rather than spending a 4th background generation on an
error-specific variant, this will be a procedural overlay (same technique
as the developer theme's window day/night cycle in `public/avatar.js`) once
the oven's pixel position is measured off the actual generated background.
Not implemented yet -- follow-up once the PixelLab budget situation is
sorted (1 generation left of 40 as of this pass, see Cost below).

## Retries

- `working` (attempt 1): "mixing a bowl held in one arm, stirring with a
  whisk" -- did not render either prop; hands came out empty, pose barely
  differed from idle. Discarded.
- `working` (attempt 2, accepted): "chopping vegetables on the counter
  with a knife, one hand raised mid-chop" -- knife/chopping motion still
  isn't crisp at this scale, but the expression is notably more focused/
  intense than idle's sleepy look, which is the main functional signal for
  telling states apart at a glance. Accepted rather than spending a 3rd
  attempt.

## Known accepted imperfections

- `working`'s chopping action reads more as "focused expression" than a
  clear chopping motion -- see retry note above.
- `idle`'s "sleepy half-closed eyes" is subtle at this resolution; readable
  mainly by contrast with `working`'s sharper expression, not on its own.

## Consolidated to a single image (post-review)

After seeing all 4 generated images together, they read as too visually
inconsistent state-to-state (identity lock via `init_image` kept hat/coat/
face close, but pose/proportions still drifted enough to be distracting).
Direct instruction: use the `working` image for all three states (and as
`base`) until animation is affordable again. `base.png`, `idle.png`, and
`error.png` are now byte-for-byte copies of `working.png` -- the other two
generated variants are gone from disk, not just unreferenced. `working.png`
is also the intended `first_frame` reference for all three future
`animate-with-text-v3` animations once more generations are available, so
the animated version stays visually consistent with what's live now.
The stove fire overlay still runs during `error` (see `public/avatar.js`
`renderStoveFire`) even though the character image itself no longer changes
for that state -- the fire is what signals "error," not the pose.

## Cost

6 generations this pass (background, base, idle, working x2, error).
Combined with an unrelated 1-generation connectivity test spent
re-verifying the PixelLab API was back after an outage (see chat log --
avoidable in hindsight, the free `/balance` endpoint alone already
confirmed the service was up): **7 generations used this session, on top
of 32 already spent** = **39/40 total, 1 remaining.**

## Status

Wired into `public/avatar.js` (`chef` in `REAL_ART_THEMES`, its own
`CHAR_POSITION_NATIVE` entry, three-tier render fallback since chef has
stills but no animation frames) and selectable via the picker in
`public/index.html` (`character/base.png` doubles as the portrait card
image -- no separate portrait generation). No animations, no separate
portrait. Given 1 generation remains, any further Chef art (animations,
a real portrait, redo of the working pose) needs a budget decision first.
