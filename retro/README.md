# Retro

A Retro is a short, honest audit of a work stream, done **before** starting
the next chunk of similar work — not a post-mortem filed away and forgotten.
This folder holds one dated file per retro. The first one
(`2026-09-27-pixellab-visual-art.md`) is also the template: read it for the
shape a retro should take.

## When to run one

- Before starting a new PixelLab theme pass (or any paid-generation work).
- After any session that included a revert, a discarded asset pass, or
  visible spend inefficiency.
- Whenever asked to.

## What a retro contains

1. **Spend audit** — every unit of real cost (generations, hours, whatever
   the currency is), tagged productive or wasted, with the *root cause* of
   each waste — not just "this didn't work out."
2. **Critical retrospective** — what went wrong, stated plainly, covering
   both sides (agent behavior and process/collaboration gaps). No blame
   framing, no hedging either.
3. **Conclusions** — the lessons, as terse bullets. If a bullet needs a
   paragraph to justify itself, it's not a conclusion yet.
4. **Guidelines** — a short checklist derived directly from the root causes
   above. Every guideline should trace back to a specific thing that went
   wrong. No generic best-practice filler.

## Rules

- Root-cause everything. "The first pass had quality issues" is not a
  finding; "no shared camera/scale spec existed before generating, so
  background and character were generated at mismatched zoom levels" is.
- Distinguish **wasted** (redone/discarded), **unconfirmed spend**
  (generated speculatively, never actually wired into the product), and
  **productive** spend. They're different failure modes with different
  fixes.
- Verify counts against the record (git log, NOTES.md, API responses) —
  don't trust a running tally kept only in conversation. (This is itself a
  finding from the first retro: a manually-tracked budget count drifted by
  one mid-session.)
- Keep it shorter than the work it's reviewing.

## Future: `/retro` skill

This file is the draft instruction set for a `/retro` skill: point it at a
work stream (a branch, a date range, an issue), and it produces a dated
file in this folder following the contract above.
