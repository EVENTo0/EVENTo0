# Deployment — Storyboard Pipeline

## Prerequisites

- Node.js 18+
- An Anthropic API key with access to `claude-sonnet-4-5`

## Local development

```bash
git clone https://github.com/EVENTo0/EVENTo0.git
cd EVENTo0
npm install
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
npm run dev
# Open http://localhost:3000
```

## Production build

```bash
npm run build
npm start
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — keep server-side, never `NEXT_PUBLIC_` |

## Vercel deployment

```bash
vercel --env ANTHROPIC_API_KEY=sk-ant-...
```

Or set `ANTHROPIC_API_KEY` in the Vercel project dashboard under Settings → Environment Variables.

## Rollback

Revert to previous git commit and redeploy. No database migrations required.
