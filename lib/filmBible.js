import { SCENES, getScene } from "./scenes.js";

// Birth years are derived from the script: Hamad is 80 in 2018 (S08), Youssef is 10 in 1973 (S02).
// Noura's birth year is a working assumption — edit it here and every scene updates.
const BORN = { hamad: 1938, youssef: 1963, noura: 1966 };

const NAMES = { hamad: "Hamad", youssef: "Youssef", noura: "Noura" };

function lookFor(who, age) {
  if (who === "youssef") {
    if (age <= 14) return "a thin ten-year-old Gulf Arab boy in a faded white thobe, sun-darkened skin, tired serious eyes";
    if (age <= 35) return `a lean Gulf Arab man of ${age} with a trimmed black beard, white thobe and ghutra, restrained posture`;
    if (age <= 50) return `a Gulf Arab man of ${age} with a short beard flecked with grey, white thobe, the settled shoulders of a man who now carries decisions`;
    return `a Gulf Arab man of ${age} with a full grey-white beard, deep lines around the eyes, plain white thobe, gentle weary hands`;
  }
  if (who === "hamad") {
    if (age <= 45) return `a tall, hard-jawed Gulf Arab man of ${age}, black beard, dark bisht over white thobe, an unbending gaze that never turns back`;
    if (age <= 65) return `a commanding Gulf Arab patriarch of ${age}, greying beard, dark bisht, heavy hands, seated like a king`;
    if (age <= 75) return `an ageing Gulf Arab patriarch of ${age}, white beard, fading authority, shoulders beginning to fold`;
    return `a frail Gulf Arab elder of ${age}, sparse white beard, sunken cheeks, thin papery hands, only the eyes still proud`;
  }
  return `a Gulf Arab woman of ${age}, dark abaya and loose headscarf, patient, capable hands, eyes that have learned to wait`;
}

export function castFor(scene) {
  return scene.cast.map((who) => {
    const age = scene.year - BORN[who];
    return { who, name: NAMES[who], age, look: lookFor(who, age) };
  });
}

const ERA = {
  1973: "1973 desert dawn: bleached amber and pale gold, hard low sun, 35mm film grain, dust in the air, vast empty horizon",
  1993: "1993 interiors: warm tungsten lamplight against deep shadow, 16mm texture, muted reds and browns, heavy fabric, low ceilings",
  2010: "2010 daylight: clean natural light, slightly cooler neutral grade, modern digital clarity, institutional greens and greys",
  2018: "2018 night: a single warm bedside lamp against cold blue dark, intimate close focus, soft shadows",
  2019: "present-day dawn: cold pre-sunrise blue turning to thin gold, muted desaturated grade, quiet and still",
};

export const BIBLE = {
  title: "الجذر / THE ROOT",
  premise:
    "A son sits beside his dying father and remembers a lifetime of a father who never turned around, until the last hour reverses it.",
  visual:
    "Anamorphic cinema, 21:9, shallow depth of field, slow deliberate camera, naturalistic Gulf Arab setting, restraint over melodrama, no text or subtitles in frame",
  motifs: "hands held or almost held, the back of a father walking away, the empty chair, desert horizon, first light",
  rules: [
    "Reuse the character descriptions below verbatim so faces stay consistent across scenes.",
    "Never contradict the scene's year or the character ages given.",
    "Emotion lives in small physical detail, not gesture or spectacle.",
  ],
};

export function eraFor(scene) {
  return ERA[scene.year];
}

export function buildSystemPrompt() {
  return [
    "You are the head of production design for an award-level Arabic feature film, writing prompts that other AI tools will execute.",
    `FILM: ${BIBLE.title}. ${BIBLE.premise}`,
    `VISUAL LANGUAGE: ${BIBLE.visual}.`,
    `RECURRING MOTIFS: ${BIBLE.motifs}.`,
    "RULES:",
    ...BIBLE.rules.map((r) => `- ${r}`),
    "Respond with a single JSON object and nothing else: no markdown fences, no commentary.",
  ].join("\n");
}

export function buildUserPrompt(scene, feedback) {
  const cast = castFor(scene)
    .map((c) => `- ${c.name} (age ${c.age}): ${c.look}`)
    .join("\n");
  const idx = SCENES.findIndex((s) => s.id === scene.id);
  const prev = idx > 0 ? SCENES[idx - 1] : null;

  return [
    `SCENE ${scene.id} — ${scene.arabic}`,
    `Year: ${scene.year}. Time: ${scene.time}.`,
    `Emotional target: ${scene.emotion}`,
    `Script: ${scene.script}`,
    prev ? `Previous scene for continuity: ${prev.id} (${prev.year}) — ${prev.arabic}.` : "This is the opening scene.",
    `LOOK OF THIS ERA: ${eraFor(scene)}`,
    "CAST IN THIS SCENE (copy these descriptions verbatim into the image prompt):",
    cast,
    "",
    "Return exactly this JSON shape:",
    "{",
    '  "midjourney": "English Midjourney v7 still, 70-100 words: subject with the cast descriptions, setting, light, lens, mood, then end with exactly: --ar 21:9 --style raw --v 7",',
    '  "runway": "English Runway Gen-3 shot, 45-70 words: one continuous shot, name the camera move, state the duration in seconds (e.g. 8 seconds), describe the motion of subject and light",',
    '  "sound": "ElevenLabs: <Arabic vocal direction, ~10 words>. Suno: <English music mood, ~8 words>"',
    "}",
    feedback ? `\nYour previous answer failed these checks — fix them: ${feedback}` : "",
  ].join("\n");
}

export { getScene };
