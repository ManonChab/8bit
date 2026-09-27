# v2 — uniformized asset pass

Supersedes `../medium/`, `../detailed/`, `../background/`, and `../objects/` (kept for
history/comparison, not wired into `test-assets.html` anymore).

## Why this pass exists

The first pass generated background/character/objects fully independently, with no shared
spec, which produced three concrete problems:

1. **Character pose drift** — idle/working/error were chained sequentially
   (idle → working → error, each using the previous as `init_image`), so small
   differences compounded and the character looked different state to state.
2. **Background zoom mismatch** — the background was a wide room shot while the character
   sprite was a tight close-up; different implied camera zoom levels.
3. **Objects had no shared camera convention or scale** — `side` view for chair/desk/plant/
   duck, `low top-down` for keyboard, and the model rendered the monitor near-frontal
   regardless of what was asked. Sizes were also guessed per-object with no common reference.

## The shared spec (applies to character, background, and every object)

- **Camera**: `view: "side"`, `direction: "north-east"` (background has no `direction` —
  not applicable to a static scene), `isometric: false` for everything, including objects
  that would more naturally be front-facing (monitor, keyboard). Trade-off accepted:
  the monitor screen is seen at an angle rather than face-on, in exchange for a
  perspective-consistent scene.
- **Style**: `outline: "single color black outline"`, `shading: "medium shading"`,
  `detail: "medium detail"` — unchanged from the `medium/` folder.
- **Character identity lock**: `character/base.png` is a neutral seated pose generated
  once, then idle/working/error were each generated independently *from that same base*
  (`init_image` + `init_image_strength: 140`), not chained state-to-state. This keeps
  hair/palette/chair/desk/monitor locked across states while only the pose text changes.
- **Scale reference**: the character's 64×64 canvas is the ruler. The background was
  regenerated tighter (128×112, description asks for a "close-up cropped" view rather than
  a wide room) so it reads at a comparable zoom level. Object canvas sizes were chosen
  relative to each other and to the character (chair 40×56, desk 72×40, monitor 32×36,
  plant 28×40, keyboard 40×28, rubber-duck 32×32 — PixelLab's minimum canvas area is 32×32).
- **Display**: `public/test-assets.html` renders background, character, and every object at
  the *same* 6x-native-pixel scale — previously each asset had its own arbitrary CSS size,
  which silently reintroduced scale mismatches even when the source images were fine.

## Known accepted imperfections (v1 of this pass)

- `objects/desk.png` has a small stray object already on its surface (asked for empty).
- `objects/monitor.png` bezel rendered purple-ish rather than matching the character's
  dark grey/black.
- `objects/keyboard.png` has a thin stray line artifact near one corner.
- Character `idle`/`error` poses still don't fully match the text brief (hands read as
  near the chest rather than "behind the head"; error's arm is raised but not fully
  "thrown up") — same trade-off accepted in the first pass, carried forward here.

## Next up

Animations were explicitly deferred to a later pass — not attempted here.
