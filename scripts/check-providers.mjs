#!/usr/bin/env node
// Live-checks every AI provider key by actually calling its API.
// Usage: node scripts/check-providers.mjs [path/to/.env]   (default: web/.env.local)
// Never prints key material — only a masked fingerprint.

import fs from "node:fs";

const envPath = process.argv[2] || "web/.env.local";
let env = {};
try {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch (e) {
  console.error(`Could not read ${envPath}: ${e.message}`);
  process.exit(1);
}

const mask = (k) => (k.length < 10 ? `len=${k.length}` : `${k.slice(0, 6)}…${k.slice(-4)}`);

async function timed(url, init = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 10000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    return { r, ms: Date.now() - t0 };
  } finally { clearTimeout(to); }
}

const PROVIDERS = [
  { id: "ElevenLabs", key: "ELEVENLABS_API_KEY", check: async (k) => {
      const { r, ms } = await timed("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": k } });
      if (!r.ok) return { ok: false, ms, note: `HTTP ${r.status} ${(await r.text()).slice(0, 120)}` };
      const s = (await r.json()).subscription || {};
      const pct = s.character_limit ? Math.round((s.character_count / s.character_limit) * 100) : 0;
      const exhausted = s.character_limit && s.character_count >= s.character_limit;
      return { ok: !exhausted, ms, note: `tier=${s.tier} quota=${s.character_count}/${s.character_limit} (${pct}%)${exhausted ? " — EXHAUSTED" : ""}` };
    } },
  { id: "Groq", key: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/models", hdr: (k) => ({ Authorization: `Bearer ${k}` }) },
  { id: "OpenAI", key: "OPENAI_API_KEY", url: "https://api.openai.com/v1/models", hdr: (k) => ({ Authorization: `Bearer ${k}` }) },
  { id: "DeepSeek", key: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/models", hdr: (k) => ({ Authorization: `Bearer ${k}` }) },
  { id: "Anthropic", key: "ANTHROPIC_API_KEY", url: "https://api.anthropic.com/v1/models", hdr: (k) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" }) },
  { id: "Gemini", key: "GEMINI_API_KEY", check: async (k) => {
      const { r, ms } = await timed(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`);
      return { ok: r.ok, ms, note: r.ok ? "models listed" : `HTTP ${r.status} ${(await r.text()).slice(0, 120)}` };
    } },
];

console.log(`\nProvider health — source: ${envPath}\n${"=".repeat(72)}`);
let ready = 0, bad = 0, missing = 0;

for (const p of PROVIDERS) {
  const k = env[p.key] || "";
  if (!k) { console.log(`  ○  ${p.id.padEnd(12)} MISSING     ${p.key} not set`); missing++; continue; }
  try {
    let res;
    if (p.check) res = await p.check(k);
    else {
      const { r, ms } = await timed(p.url, { headers: p.hdr(k) });
      res = { ok: r.ok, ms, note: r.ok ? "models listed" : `HTTP ${r.status} ${(await r.text()).slice(0, 120)}` };
    }
    const icon = res.ok ? "✓" : "✗";
    console.log(`  ${icon}  ${p.id.padEnd(12)} ${(res.ok ? "READY" : "UNHEALTHY").padEnd(11)} ${mask(k)}  ${res.ms}ms  ${res.note}`);
    res.ok ? ready++ : bad++;
  } catch (e) {
    console.log(`  ✗  ${p.id.padEnd(12)} UNHEALTHY   ${mask(k)}  ${e.name === "AbortError" ? "timeout" : e.message}`);
    bad++;
  }
}

console.log(`${"=".repeat(72)}\n  ready=${ready}  unhealthy=${bad}  missing=${missing}\n`);
process.exit(bad > 0 ? 1 : 0);
