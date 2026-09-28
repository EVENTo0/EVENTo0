const MJ_SUFFIX = "--ar 21:9 --style raw --v 7";
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const ARABIC = /[؀-ۿ]/;
const CAMERA = /(dolly|pan|tilt|push[- ]in|pull[- ]back|handheld|static|locked[- ]off|track|crane|zoom|steadicam|rack focus)/i;

export function extractJson(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a === -1 || b <= a) return null;
    try {
      return JSON.parse(cleaned.slice(a, b + 1));
    } catch {
      return null;
    }
  }
}

export function validatePrompts(p, scene) {
  const issues = [];
  if (!p || typeof p !== "object") return { ok: false, issues: ["response is not a JSON object"] };

  const mj = p.midjourney;
  if (typeof mj !== "string" || !mj) issues.push("midjourney is missing");
  else {
    if (!mj.trim().endsWith(MJ_SUFFIX)) issues.push(`midjourney must end with "${MJ_SUFFIX}"`);
    const n = words(mj.replace(MJ_SUFFIX, ""));
    if (n < 55 || n > 130) issues.push(`midjourney is ${n} words, expected 70-100`);
    if (ARABIC.test(mj)) issues.push("midjourney must be English only");
    if (scene?.cast?.includes("hamad") && !/hamad|elder|patriarch|father/i.test(mj)) issues.push("midjourney omits Hamad's description");
  }

  const rw = p.runway;
  if (typeof rw !== "string" || !rw) issues.push("runway is missing");
  else {
    const n = words(rw);
    if (n < 30 || n > 90) issues.push(`runway is ${n} words, expected 45-70`);
    if (!/\b\d+(\.\d+)?\s?(s|sec|secs|seconds)\b/i.test(rw)) issues.push("runway must state a duration in seconds");
    if (!CAMERA.test(rw)) issues.push("runway must name a camera movement");
    if (ARABIC.test(rw)) issues.push("runway must be English only");
  }

  const snd = p.sound;
  if (typeof snd !== "string" || !snd) issues.push("sound is missing");
  else {
    if (!/ElevenLabs:/i.test(snd)) issues.push('sound must contain "ElevenLabs:"');
    if (!/Suno:/i.test(snd)) issues.push('sound must contain "Suno:"');
  }

  return { ok: issues.length === 0, issues };
}
