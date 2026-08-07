# Security Record — Storyboard Pipeline

## Scope and assets

- Anthropic API key (`ANTHROPIC_API_KEY`)
- Generated prompts (creative output, not sensitive)

## Trust boundaries

```
Browser  →  Next.js API routes  →  Anthropic API
  (untrusted)    (trusted server)   (external)
```

## Controls

| Risk | Control | Status |
|---|---|---|
| API key exposure | Key in `.env.local` (server-side env, not `NEXT_PUBLIC_`) | IMPLEMENTED |
| Key in git | `.gitignore` includes `.env.local` and `.env` | IMPLEMENTED |
| Key in HTTP response | `/api/health` returns boolean only; `/api/generate` returns prompts only | IMPLEMENTED |
| Prompt injection | Scene data is static hardcoded values — no user input in prompts | IMPLEMENTED |
| Secrets in logs | No logging of env vars | IMPLEMENTED |

## Open risks

- Single-user local tool: no authentication, no rate limiting on the Next.js API routes
- If deployed publicly, add authentication and per-IP rate limiting before `/api/generate`
