# AI System Record — Storyboard Prompt Generator

## Use case and user value

Transform a structured Arabic screenplay breakdown (scene name, time period,
emotion, script excerpt) into three production-ready prompts per scene:
visual (Midjourney v7), motion (Runway Gen-3), and sound (ElevenLabs/Suno).

## Model and provider

- **Provider:** Anthropic
- **Model:** `claude-sonnet-4-5`
- **Max tokens:** 1000 per call
- **Fallback:** If JSON parse fails, raw model output is returned in the `midjourney` field
- **Cost estimate:** ~$0.003–0.006 per scene (10 scenes ≈ $0.03–0.06 per full run)
- **Latency target:** < 8s per scene

## Prompt structure

```
System: "You are a world-class AI film production director."
User:   Scene metadata (arabic title, time, emotion, script excerpt)
        → Return ONLY a JSON object with three keys: midjourney, runway, sound
```

The response format is enforced by instruction only (no tool use / structured output).
The API route parses the response with a regex strip of markdown fences before JSON.parse.

## Safety and abuse controls

- All scene data is static (hardcoded in the component); no user input reaches prompts
- No PII is transmitted
- The API key is server-side only; it is not logged or returned to the client

## Privacy and retention

- No user data is collected
- Generated prompts are stored in React state only (lost on page refresh)
- No database, no analytics

## Evaluation criteria

- Each response must parse as valid JSON with all three keys
- `midjourney` field must end with `--ar 21:9 --style raw --v 7`
- `runway` field must specify duration in seconds and camera movement
- `sound` field must contain both ElevenLabs and Suno directions

## Known limitations

- Response quality depends on model version; may need prompt tuning for other films
- Structured output is not enforced at the API level — malformed responses degrade gracefully
- No retry logic on parse failure (scene shows ERROR)

## Verification evidence

See `docs/verification/2026-08-07-storyboard-launch.md`.
