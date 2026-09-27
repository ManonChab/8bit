# Retro: PixelLab visual art (developer theme + animation session)

Scope: all PixelLab spend to date (v1 pass through the animation/portrait
session), plus the wider visual-art process on issues #4–#7, #13–#14.
Written before starting the next background theme, per the [Retro
process](README.md).

## Generation spend audit

40 free generations total. 32 used, 8 remaining.

| Batch | Count | Status | Root cause |
|---|---|---|---|
| `detailed/` character (idle/working/error) | 3 | **Wasted** | No shared spec existed yet; fully superseded by v2 |
| `medium/` character (idle/working/error) | 3 | **Wasted** | Same — a second style-param experiment on an ungrounded spec |
| `background/` v1 | 1 | **Wasted** | Wide room shot; zoom mismatch vs. character found only after both were generated independently |
| `objects/` v1 (6 objects) | 6 | **Wasted** | No shared camera/scale convention set before generating each one |
| v2 `background` | 1 | Productive | Redone with a locked spec (view/direction/scale) |
| v2 `character` (base+idle+working+error) | 4 | Productive | Identity-locked via `base.png` as shared reference |
| v2 `objects` (6 objects) | 6 | **Unconfirmed spend** | Generated, but never wired into any composited scene — furniture is baked into the character/background art instead. Kept as files, dropped from the UI this session |
| (undocumented) | 2 | Unknown | Predates this session's practice of logging discarded attempts |
| `working` test, `/animate-with-text` (wrong endpoint) | 1 | **Wasted** | Used the SDK's default endpoint without checking it was v3 as asked; off-style, discarded |
| `working` retry, SDK response-parsing crash | 1 | **Wasted** | SDK's response model assumes a usd-billed account; this account bills in "generations" — API call succeeded and charged, client crashed before saving |
| `working`/`idle`/`error` v3 animations | 3 | Productive | Schema-verified first, correct on first real attempt |
| portrait (`create-image-pixflux`) | 1 | Productive | Schema verified via free OpenAPI fetch before spending |

**Wasted (redone/discarded): 15 of 32 (47%). Unconfirmed spend (generated, never shipped): 6 of 32 (19%). Only ~34% of all spend to date is both correct and live in the product today.**

## Critical retrospective

**My mistakes (agent):**
- Called the SDK's default `animate_with_text` without checking it matched the v3 endpoint the user explicitly named — spent a generation before verifying the tool matched the ask.
- Trusted the SDK's response parsing without checking the account's actual billing shape first — the crash happened on the very first real animation call.
- Kept the running budget count in conversation memory instead of computing it from the API each time — it drifted by one (stated 33/40 when the true count was 32/40).
- Eyeballed generated frames one at a time in chat instead of running a pixel-level scan right after generating — the purple-line artifact shipped in two commits before being caught live by the user.
- Did learn to verify schemas for free before spending (portrait, animation rewrite) — but only after two generations had already paid for that lesson.

**Process/collaboration gaps:**
- No shared generation spec (view, direction, canvas size, style params) existed before the first PixelLab pass — it only got written down in v2's NOTES.md after ~13 generations were already spent on work that spec would have prevented.
- Object sprites were generated before the compositing approach that would use them was decided, and never ended up used.
- Budget check-ins ("this costs N of M remaining, proceed?") only started mid-session, not from the first call.

**What went well (keep doing):**
- The reverted 3/4-back-view experiment cost 0 generations — it was pure procedural code, reverted cheaply. Exploring direction in code before committing to paid generation worked exactly as it should.
- Once learned, every later call verified the real API schema for free first (portrait, the v3 animation rewrite).
- Adopted a safety net (dump raw API response to disk before parsing) after the first crash — no generation has been lost to a client-side bug since.
- The window day/night cycle (sun/moon/field/town) was built entirely procedurally and verified with free Pillow renders before touching the live code — zero budget spent on something that didn't need real generated art.

## Conclusions

- Lock the shared spec before the first generation, not after the first redo.
- Verify schema/account/response-shape for free before any paid call — every SDK is guilty until checked.
- Don't generate composable assets before the compositing approach that would use them is decided.
- Track budget from the API's own numbers each call, not memory.
- QA new assets with a script, not a glance.
- Explore direction/layout in cheap code before spending on final-quality generation.
- Roughly two-thirds of all spend so far was either wasted or never shipped.

## Guidelines for next theme creation

1. Before any call: write/update the shared spec (view, direction, canvas size per asset type, outline/shading/detail, palette) — default to the developer theme's v2 spec unless deliberately deviating.
2. Before any call: fetch the current OpenAPI schema for the endpoint being used; don't assume the installed SDK matches it.
3. Before the first call of a session: confirm the account's balance/usage response shape once; don't let a client library's response model crash after the API has already charged.
4. Decide the compositing approach before generating supporting assets (objects/props) — if nothing in the render path will draw a separate sprite, don't generate it yet.
5. State the full planned generation list (asset × count × frames) and its budget cost before the first call in a batch; get one go-ahead, not per-frame confirmations.
6. After generating, run a pixel-level scan (stray full-width/height solid rows, off-palette colors) before calling a batch done.
7. Prefer procedural/code exploration over paid generation for anything about direction or layout that doesn't need final art quality to evaluate.
8. State the running spend total (used/remaining) after every generating call, computed from that call's actual response — not carried from memory.
