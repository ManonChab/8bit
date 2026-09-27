# Developer character — PixelLab generation notes

Related: [Visual epic #4](https://github.com/ManonChab/8bit/issues/4), [Developer theme #7](https://github.com/ManonChab/8bit/issues/7)

Generated via the PixelLab REST API (`POST /generate-image-pixflux`, https://api.pixellab.ai/v1),
not the MCP server (no MCP integration installed in this project).

## Direction/view reference

`reference.png` is a PixelLab sample (not our character/style) used only to confirm the
8-direction enum convention: it shows a "3/4 back view" character facing screen-*left*, which
corresponds to `direction: "north-west"`. Our brief asked for the same angle mirrored to face
screen-*right*, so all three states use:

- `view: "side"`
- `direction: "north-east"`

## Furniture/props

Decision: for this pass, chair/desk/monitor/keyboard are baked into each character-state
sprite rather than generated as separate composable "object" layers (simpler to wire up now).
Separate object sprites (chair, keyboard, laptop-on-fire) were flagged as a possible future
refactor if per-pose art becomes limiting.

## Two style folders

Same poses/descriptions/seeds/direction/view in both — only the `detail` param differs.

- **`detailed/`** — `detail: "highly detailed"`. Richer shading gradients, more painterly.
  Archived; not currently wired into the app or test page.
- **`medium/`** — `detail: "medium detail"`. Flatter shading, fewer color bands, more
  consistent chair/desk rendering across the three states. **Currently the active style**,
  wired into `public/test-assets.html`.

All: 64×64px, transparent background (`no_background: true`), single-color black outline,
medium shading. Character continuity across states was carried forward by passing the
previous accepted image as `init_image` (`init_image_strength` 120–160) rather than
regenerating from text alone each time — plain re-prompting without an init image tends to
just repeat the same pose.

Known accepted imperfections (v1, same in both style folders):
- `idle`: hands read as resting near the chest/lap rather than fully "clasped behind the head".
- `error`: arm rests on the desk rather than being thrown fully up; monitor shows sparks/small
  flame rather than being "engulfed" in fire.

Seeds (for reference, not guaranteed reproducible against future model versions):
idle=90210, working=55555, error=13013.
