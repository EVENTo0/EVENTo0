export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { scene } = req.body;
  if (!scene) return res.status(400).json({ error: "scene required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const prompt = `You are a world-class AI film production director.
For this Arabic screenplay scene, generate 3 prompts in JSON format only (no markdown, no explanation):

Scene: ${scene.arabic}
Time: ${scene.time}
Emotion: ${scene.emotion}
Script excerpt: ${scene.script}

Return ONLY this JSON:
{
  "midjourney": "cinematic still [full English Midjourney v7 prompt, 80-100 words, ending with --ar 21:9 --style raw --v 7]",
  "runway": "video prompt [50-70 words for Runway Gen-3, specify motion, duration in seconds, camera movement]",
  "sound": "ElevenLabs: [10-word Arabic voice tone direction]. Suno: [8-word music mood]"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json({ error: data.error?.message || "API error" });
  }

  const text = data.content?.[0]?.text || "";
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.json(parsed);
  } catch {
    return res.json({ midjourney: text.slice(0, 400), runway: "", sound: "" });
  }
}
