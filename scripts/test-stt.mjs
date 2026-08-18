import fs from "node:fs";

const env = fs.readFileSync("web/.env.local", "utf8");
const key = env.match(/ELEVENLABS_API_KEY=(.*)/)?.[1]?.trim();

const fd = new FormData();
// create dummy mp3 buffer
const dummy = Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00]);
fd.append("file", new Blob([dummy], { type: "audio/mpeg" }), "test.mp3");
fd.append("model_id", "scribe_v1");

try {
  const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: fd,
  });
  console.log("STT Status:", resp.status);
  const text = await resp.text();
  console.log("STT Body:", text);
} catch (e) {
  console.error("STT Error:", e);
}
