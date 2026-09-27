# Developer theme — art sourcing notes

Related: [Visual epic #4](https://github.com/ManonChab/8bit/issues/4), [Background system #6](https://github.com/ManonChab/8bit/issues/6), [Developer theme #7](https://github.com/ManonChab/8bit/issues/7)

## What was checked

- **Kenney.nl**: no office/desk/developer-specific pack exists. Character packs (e.g. Roguelike Characters) are fantasy/dungeon-themed; no civilian clothing set.
- **OpenGameArt.org**: searches for office/desk/computer pixel tiles returned only junk/test entries or unrelated 3D low-poly models — nothing usable found.
- **itch.io** (adjacent lead, not the two sites originally asked): has closer-fitting chibi portrait+sprite packs matching the original reference image style, but not pulled in yet — flagged for later if the Kenney-based approach isn't good enough.

## What was extracted

Source: [Kenney "Roguelike Characters" pack](https://kenney.nl/assets/roguelike-characters) (v2.0, 2015), **CC0** — free for any use, attribution appreciated but not required. Full pack license copied to `kenney-roguelike-characters/License.txt`.

- Base sprite: cell (col 1, row 9) of `Spritesheet/roguelikeChar_transparent.png` — a plain, clean-shaven, short-dark-hair 16×16 character with a simple round-neck garment (no fantasy robe/beard, the closest thing in the pack to a neutral human).
- Recolored the garment from its original brown/tan (a fantasy vest color) to blue via HSV hue-rotation (hue → 216°, kept original saturation/value per shade so the existing shading bands are preserved) to read as a plain shirt/hoodie instead.
- Saved as `kenney-roguelike-characters/developer-base-16x16.png`.

## Status

This is a prepared **reference asset**, not yet wired into the running app — background system (#6) and the developer theme (#7) haven't been implemented yet. When picked up:
- This 16×16 sprite can be scaled up the same way the procedural character is (nearest-neighbor, per Task #5's approach) or used as-is at native res if the background theme's art direction goes for a smaller/more "arcade" scale.
- The desk/monitor/chair scenery for this theme was **not** found as a usable asset on either site and should be built procedurally with canvas primitives instead (simple geometric furniture doesn't need the same fidelity a face does).
- No pose variants (sitting, typing) were extracted yet — only a standing idle-style frame. The per-theme contextual actions task (#13) will need a "coding" pose eventually; this pack does not include one, so that will likely need custom pixel editing or a different source.
