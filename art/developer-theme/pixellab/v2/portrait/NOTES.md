# Developer character portrait — PixelLab `create-image-pixflux`

Related: [Visual epic #4](https://github.com/ManonChab/8bit/issues/4)

Bust/head-and-shoulders portrait for the style picker (now a single
"Developer" card, replacing the old two procedural palette options),
inspired by game character-select portrait cards — close-up, expressive,
higher-detail than the 64×64 overworld sprite.

## Approach

Generated via `scripts/pixellab/generate_portrait.py`, calling
`/create-image-pixflux` directly (bypassing the `pixellab` SDK for the same
response-parsing reason as the animation script — this account is billed in
"generations," which crashes the SDK's usd-only response model).

- `color_image`: the existing `../character/base.png`, passed as a forced
  color palette so hair/hoodie/skin tones stay locked to the established
  character. No `init_image` — a full-body seated pose would fight the
  close-up bust framing, so composition is text-only.
- `description`: explicit identity details (short tousled light brown hair,
  pale skin, pale blue hooded sweater, hood down, three-quarter view facing
  right) plus "video game character-select portrait" framing language.
- `detail: "highly detailed"` (bumped up from the sprite's "medium detail"
  — a portrait reads faces at much closer range), `shading: "medium
  shading"` and `outline: "single color black outline"` unchanged from the
  rest of the v2 pass.
- `image_size`: 96×96 (larger than the 64×64 sprite canvas — more room for
  facial detail at this crop).
- `no_background: true`.
- seed 90210 (same seed originally used for the idle sprite, for no reason
  beyond consistency of habit — not meaningfully tied to this image).

## Cost

1 generation, accepted on the first attempt.

## Known accepted state

Single portrait only — no alternate expressions/angles. Not regenerated
per character state (idle/working/error); the picker only ever shows this
one image regardless of the live session state.
