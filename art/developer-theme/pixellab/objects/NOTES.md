# Object sprites — PixelLab generation notes

Standalone, composable props (as opposed to the desk/chair/monitor baked directly into the
character sprites in `../medium/` and `../detailed/`). Generated via `POST
/generate-image-pixflux`, same style params as the `medium` character set for visual
consistency: `outline: "single color black outline"`, `shading: "medium shading"`, `detail:
"medium detail"`, `no_background: true`.

No `direction` param used (not applicable to inanimate objects); `view` set per-object
(`"side"` for everything except `keyboard`, which uses `"low top-down"` since a flat keyboard
reads as a bar rather than a keyboard from a pure side angle).

All 6 passed on the first generation attempt, no retries needed.

| File | Size | Notes |
|------|------|-------|
| `chair.png` | 64×64 | Front-3/4 angle rather than pure side — fine as a standalone/catalog object, but not the same angle as the character's baked-in chair (seen from behind). Revisit if used directly behind a character sprite. |
| `desk.png` | 112×56 | Front view. |
| `monitor.png` | 48×56 | Front-facing screen. |
| `plant.png` | 32×48 | |
| `keyboard.png` | 48×24 | Top-down view. |
| `rubber-duck.png` | 32×32 | PixelLab's minimum canvas area is 32×32 (24×24 was rejected with "Canvas must be size 32x32 area or larger"). |

Seeds: chair=31001, desk=31002, monitor=31003, plant=31004, keyboard=31005, rubber-duck=31006.

These are not yet positioned/scaled relative to each other or to the character sprite —
that alignment work (and deciding real composited scale) is left for whenever the
"separate object layers" compositing approach (flagged in `../NOTES.md`) is actually wired
into the app.
