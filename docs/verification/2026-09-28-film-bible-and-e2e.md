# Verification — Film Bible, validator, and browser E2E

**Date:** 2026-09-28  **Branch:** `claude/film-storyboard-generator-JBdhF`

## What changed

| Area | Change |
|---|---|
| Continuity | `lib/filmBible.js`: film bible + per-scene era look + character descriptions with ages derived from the script (Hamad b.1938, Youssef b.1963; Noura b.1966 is an assumption) injected into every request |
| Quality | `lib/validate.js`: checks the `--ar 21:9 --style raw --v 7` suffix, word counts, English-only, duration in seconds, camera move, ElevenLabs/Suno fields |
| Self-repair | `/api/generate` retries once, feeding the validator's failures back to the model; unresolved issues are returned and flagged in the UI, never hidden |
| Security | API now takes `sceneId` only and looks the scene up server-side (previously the client sent scene text). Corrects the earlier claim in the architecture doc |
| UI | Quality badge, character ages, issue list; fixed a layout mirroring bug from `dir="rtl"` on `<html>` (layout is LTR; Arabic elements set RTL individually); favicon 404 removed |

## Evidence

| Check | Result | How |
|---|---|---|
| Unit/integration suite | PASS 12/12 | `npm test` (handler run against mocked Anthropic) |
| Suite can fail | PASS | Mutation checks: wrong birth year and disabled suffix check each turned the suite red; restored to green |
| Production build | PASS | `npm run build` |
| Browser E2E, all 10 scenes | PASS | Chromium/Playwright drove RUN ALL against a local mock Anthropic (`tests/e2e/mock-anthropic.mjs`): 10/10 done, zero console errors, S05 deliberately failed once and was auto-repaired ("AUTO-FIXED IN 2 TRIES") |
| Visual check | PASS | Screenshots reviewed after the RTL fix |

## NOT verified

- **No live Anthropic call was made** (no API key in this environment). Real prompt quality, real latency and the default model id `claude-sonnet-5` (override with `ANTHROPIC_MODEL`) are unverified. The validator will flag any real output that misses the format rules.
- Noura's age is an assumption; confirm against the script.
- Mobile layout not re-checked this round.

## Next action

Add a real key to `.env.local`, run RUN ALL once, and review the Midjourney text for face consistency across S02 / S03 / S08.

## Addendum — Animatic (free pre-production preview)

`public/previz/animatic.html` (served at `/previz/animatic.html`) is a self-contained, zero-cost previz: 10 procedurally animated scenes (camera move, era grade, lighting, age-correct silhouettes), a full-film player (84 s), key-frame strip, procedural sound, and an in-page test suite executed on rendered pixels.

| Check | Result |
|---|---|
| In-page tests (renders / motion / cast-age / length / fade per scene + 5 film-level) | PASS 55/55 |
| Playback, seek, next, pause, end-of-film, sound toggle | PASS, no console errors (Chromium) |
| Phone width (400 px) | PASS, no page-level horizontal overflow |
| Visual review | Reviewed contact sheets; found and fixed broken seated pose, face mask, floating car occupants |

Limits: this is a stylised animatic, not photoreal AI video. It validates pacing, framing, continuity and shot lengths; it does not validate how Midjourney/Runway will render faces. Sound is a procedural drone/wind bed, not a score.
