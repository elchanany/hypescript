import fs from "node:fs";

const env = fs.readFileSync("web/.env.local", "utf8");
const key = env.match(/ELEVENLABS_API_KEY=(.*)/)?.[1]?.trim();
console.log("ElevenLabs key exists:", !!key, "prefix:", key ? key.slice(0, 10) + "..." : "none");

try {
  const resp = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": key },
  });
  console.log("HTTP status:", resp.status);
  const text = await resp.text();
  console.log("Body:", text);
} catch (e) {
  console.error("Error:", e);
}
