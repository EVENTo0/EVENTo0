# System Architecture — الجذر Storyboard Pipeline

## Context and goals

Single-user Next.js 14 web application that turns a static screenplay scene
breakdown into AI production prompts. All AI calls go through a server-side
API route so no credentials reach the browser.

## Components

```
Browser (React)
  └── PipelineDashboard.jsx
        ├── GET /api/health          ← on mount
        └── POST /api/generate       ← per scene

Next.js Server
  ├── /api/health     → env check, no external call
  └── /api/generate   → POST → Anthropic API (ANTHROPIC_API_KEY)
                          model: claude-sonnet-4-5
                          max_tokens: 1000
```

## Data flow

1. Browser mounts → GET `/api/health` → shows green/red banner
2. User triggers run → Browser POST `/api/generate` with `{scene}` object
3. Server builds system prompt, calls Anthropic, parses JSON response
4. Server returns `{midjourney, runway, sound}` — no key leaves server
5. Browser stores result in React state (session only, no persistence)

## Trust boundaries

- `ANTHROPIC_API_KEY` lives only in `.env.local` (server-side env, not `NEXT_PUBLIC_`)
- Browser never receives the key; health endpoint returns boolean only
- No user input reaches the Anthropic prompt without server-side template wrapping

## Failure modes

| Scenario | Handling |
|---|---|
| API key not set | `/api/health` returns 503; banner shows setup instructions |
| Anthropic API error | Scene status → ERROR; error message shown; other scenes continue |
| JSON parse failure | Raw text returned as `midjourney` field; `runway`/`sound` empty |
| User aborts batch | `abortRef.current = true` exits the for-loop after current scene |

## Security controls

- API key: server env only, never logged, never returned
- No user-supplied content reaches the Anthropic prompt (all scene data is static)
- No authentication required (single-user local tool)

## Performance

- Sequential scene processing with 600ms delay (avoids burst rate limits)
- Full batch of 10 scenes: ~60–90s depending on API latency
- No caching layer (prompts are regeneratable)
