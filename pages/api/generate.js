import { getScene } from "../../lib/scenes.js";
import { buildSystemPrompt, buildUserPrompt, castFor } from "../../lib/filmBible.js";
import { extractJson, validatePrompts } from "../../lib/validate.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const MAX_ATTEMPTS = 2;

async function callModel(apiKey, system, user) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(`${BASE_URL}/v1/messages`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages: [{ role: "user", content: user }] }),
    });
    const data = await r.json();
    if (!r.ok) {
      const err = new Error(data?.error?.message || `Anthropic HTTP ${r.status}`);
      err.status = r.status;
      throw err;
    }
    return data.content?.[0]?.text || "";
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const scene = getScene(req.body?.sceneId);
  if (!scene) return res.status(400).json({ error: "unknown sceneId" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const system = buildSystemPrompt();
  let feedback = "";
  let prompts = null;
  let issues = ["no response"];
  let attempts = 0;

  try {
    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      const text = await callModel(apiKey, system, buildUserPrompt(scene, feedback));
      const parsed = extractJson(text);
      const check = validatePrompts(parsed, scene);
      if (parsed) prompts = { midjourney: parsed.midjourney || "", runway: parsed.runway || "", sound: parsed.sound || "" };
      issues = parsed ? check.issues : ["response was not valid JSON"];
      if (check.ok) break;
      feedback = issues.join("; ");
    }
  } catch (e) {
    return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.name === "AbortError" ? "model timed out" : e.message });
  }

  if (!prompts) return res.status(502).json({ error: `model returned unusable output: ${issues.join("; ")}` });

  return res.status(200).json({
    prompts,
    quality: { ok: issues.length === 0, issues, attempts },
    cast: castFor(scene).map(({ name, age }) => ({ name, age })),
  });
}
