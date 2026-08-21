import fs from "node:fs";

let key = "";
try {
  const env = fs.readFileSync("web/.env.local", "utf8");
  key = env.match(/ELEVENLABS_API_KEY=(.*)/)?.[1]?.trim()?.replace(/^["']|["']$/g, "") || "";
} catch (e) {
  console.error("Could not read web/.env.local:", e.message);
}

if (!key) {
  console.log("No ELEVENLABS_API_KEY found in web/.env.local");
  process.exit(1);
}

console.log("Checking ElevenLabs API Key:", key.slice(0, 8) + "..." + key.slice(-4));

try {
  const resp = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": key },
  });
  console.log("HTTP status:", resp.status);
  const text = await resp.text();
  console.log("Subscription:", text);
} catch (e) {
  console.error("Error:", e);
}


