// Local stand-in for the Anthropic API so the full UI can be exercised without a key.
import http from "node:http";
const SUFFIX = "--ar 21:9 --style raw --v 7";
let n = 0;
http.createServer((req, res) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", () => {
    const user = JSON.parse(b).messages[0].content;
    const scene = /SCENE (S\d+)/.exec(user)?.[1];
    n++;
    const bad = scene === "S05" && !/previous answer failed/.test(user); // S05 fails once, then is auto-fixed
    const mj = `Cinematic still for ${scene}, an elder patriarch and his son share a quiet frame in soft directional light, dust hanging in the air, shallow depth of field on their hands, anamorphic lens, muted desaturated palette, naturalistic Gulf Arab interior, restrained emotion, fine film grain, no text in frame, deep shadow pooling at the edges, stillness before dawn breaks over the far horizon ${SUFFIX}`;
    const out = {
      midjourney: bad ? "too short" : mj,
      runway: "One continuous shot, 8 seconds. Slow push-in toward the joined hands, light creeping across the fabric, dust drifting, no cuts, steady breathing rhythm, shallow focus holding on the fingers as they barely move.",
      sound: "ElevenLabs: صوت هادئ متعب منخفض بنبرة حنين وتوقف بين الجمل. Suno: sparse felt piano, distant desert wind.",
    };
    setTimeout(() => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(out) }] }));
    }, 150);
  });
}).listen(4010, () => console.log("mock anthropic on 4010"));
