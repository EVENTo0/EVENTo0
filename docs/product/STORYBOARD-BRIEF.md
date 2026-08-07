# Project Brief — الجذر / THE ROOT Storyboard Pipeline

## Product

- **Name:** الجذر / THE ROOT — AI Storyboard Pipeline
- **Owner:** EVENTo0 / EVENTO AI Studios
- **Status:** Active — v1.0
- **Target release:** 2026-08-07

## Problem and opportunity

Film pre-production for Arabic cinema requires generating hundreds of AI tool
prompts (image generation, video generation, sound design) for each scene.
Doing this manually per scene is slow and inconsistent. A pipeline that
transforms a structured screenplay breakdown into production-ready prompts
for Midjourney, Runway Gen-3, ElevenLabs, and Suno saves hours of pre-production
time and ensures consistent visual language across the film.

## Target users

- Film directors and producers using AI tools for pre-production
- Arabic-language film productions (primary)
- Any screenplay with a structured scene breakdown (secondary)

## Outcomes and success metrics

- All 10 scenes generate prompts without error
- Each prompt is immediately usable in the target tool without editing
- Pipeline completes in under 3 minutes for all scenes
- Individual scene regeneration works without full restart

## Scope

### In scope

- 10-scene structured pipeline for الجذر / THE ROOT
- Per-scene prompt generation: Midjourney v7, Runway Gen-3, ElevenLabs/Suno
- Sequential batch run and single-scene run
- Live pipeline log with timestamps
- One-click copy per prompt block
- Export all generated prompts as JSON
- API health check with user-visible status banner
- Server-side Anthropic API key (never exposed to browser)

### Out of scope

- Image/video generation (prompts only — output is piped into external tools)
- User authentication
- Prompt history persistence (session only)
- Multi-film support

## Core user journeys

1. Developer sets `ANTHROPIC_API_KEY` in `.env.local` and runs `npm run dev`
2. User opens the dashboard, sees API status banner (green = ready)
3. User clicks **RUN ALL** — all 10 scenes process sequentially with live log
4. User copies or exports individual prompts for use in Midjourney / Runway / ElevenLabs
5. User reruns a single scene if the output needs refreshing

## Requirements

### Functional

- FR-01: API route `/api/generate` proxies Anthropic API server-side
- FR-02: API route `/api/health` returns API key status without exposing the key
- FR-03: Dashboard shows per-scene status: QUEUED / RUNNING / DONE / ERROR
- FR-04: STOP aborts the running batch
- FR-05: RESET clears all results and log
- FR-06: EXPORT JSON downloads all done scenes as a timestamped JSON file
- FR-07: Health banner shown on load; hidden once confirmed green

### Non-functional

- NFR-01: API key never sent to browser
- NFR-02: Build must succeed with `next build` (no type errors, no missing imports)
- NFR-03: RTL Arabic text rendered correctly

## Acceptance criteria

- AC-01: `npm run build` exits 0 with no errors
- AC-02: `/api/health` returns `{"ok":true}` when env var is set
- AC-03: `/api/generate` returns a JSON object with `midjourney`, `runway`, `sound` keys
- AC-04: All 10 scenes transition from QUEUED → RUNNING → DONE in sequence
- AC-05: Export JSON button produces a downloadable file with all generated prompts
- AC-06: No API key is logged or returned to the browser

## Dependencies, assumptions, and risks

- **Dependency:** `ANTHROPIC_API_KEY` must be provided by the user
- **Risk:** Anthropic API rate limits may cause errors on full batch run — mitigated by 600ms delay between scenes
- **Assumption:** Model `claude-sonnet-4-5` is available for the configured API key

## First verified vertical slice

Single-scene prompt generation via `/api/generate` with a valid API key, returning all three prompt fields.
