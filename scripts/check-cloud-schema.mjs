#!/usr/bin/env node
// Verifies that every Supabase table the code actually touches exists in the
// target project, and that server-side secrets are long enough to be usable.
//
// Why this exists: two features shipped broken for weeks because their
// migration was never applied. `user_provider_secrets` (BYOK keys) and
// `user_brand_kits` both existed as .sql files in the repo but not in the
// database. Every write returned an error the caller swallowed, so the UI
// looked like "no data yet" instead of "this is broken". A missing table is a
// deploy-time fact — it should fail loudly here, not silently in a user's face.
//
// The table list is derived from the source, not hand-maintained, so a new
// .from("something") is covered the moment it is written.
//
// Usage: node scripts/check-cloud-schema.mjs [path/to/.env]   (default: web/.env.local)
// Never prints secret material — only lengths and pass/fail.

// No supabase-js import on purpose: this must run from any cwd and in CI
// without installing web/node_modules first. PostgREST over plain fetch is
// enough to ask "does this relation exist".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = process.argv[2] || path.join(REPO_ROOT, "web/.env.local");
const env = {};
try {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch (e) {
  console.error(`Could not read ${envPath}: ${e.message}`);
  process.exit(1);
}
// Real environment wins, so CI can run this without a file on disk.
for (const k of Object.keys(env)) if (process.env[k]) env[k] = process.env[k];

const SRC_ROOTS = ["web/app", "web/lib"].map((p) => path.join(REPO_ROOT, p));
// Capture the receiver so built-ins can be excluded by name: Array.from("abc")
// is a string conversion, not a table read, and lowercase snake_case alone does
// not tell them apart.
const FROM_CALL = /([A-Za-z_$][\w$]*)\s*\.from\(\s*"([a-z][a-z0-9_]*)"/g;
const NOT_A_CLIENT = new Set([
  "Array", "Buffer", "Object", "Set", "Map", "Int8Array", "Uint8Array",
  "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array",
  "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array",
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const tables = new Map(); // table -> first file that referenced it
for (const root of SRC_ROOTS) {
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(FROM_CALL)) {
      if (NOT_A_CLIENT.has(m[1])) continue;
      if (!tables.has(m[2])) tables.set(m[2], file);
    }
  }
}

const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

console.log(`Project : ${url}`);
console.log(`Source  : ${tables.size} distinct tables referenced by web/app + web/lib\n`);

const headers = { apikey: key, Authorization: `Bearer ${key}` };

let missing = 0;
for (const [table, file] of [...tables].sort()) {
  // limit=0 fetches no rows — this asks "does the relation exist and can the
  // service role read it", nothing more.
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers });
  if (res.ok) {
    console.log(`ok       ${table}`);
    continue;
  }
  missing++;
  const body = await res.json().catch(() => ({}));
  console.log(`MISSING  ${table.padEnd(24)} ${res.status} ${body.message || res.statusText}`);
  console.log(`         first referenced in ${path.relative(REPO_ROOT, file)}`);
}

// Same failure shape, different cause: the code demands >= 32 chars and throws
// byok_encryption_not_configured otherwise, which surfaces to the user as a 503
// with no explanation.
const REQUIRED_SECRET_LENGTHS = { BYOK_ENCRYPTION_KEY: 32 };
let weak = 0;
console.log("");
for (const [name, min] of Object.entries(REQUIRED_SECRET_LENGTHS)) {
  const len = (env[name] || "").length;
  if (len === 0) {
    weak++;
    console.log(`MISSING  ${name} is not set (needs >= ${min} chars)`);
  } else if (len < min) {
    weak++;
    console.log(`TOO SHORT ${name} is ${len} chars, needs >= ${min}`);
  } else {
    console.log(`ok       ${name} (${len} chars)`);
  }
}

console.log("");
if (missing || weak) {
  console.error(`FAIL: ${missing} missing table(s), ${weak} misconfigured secret(s).`);
  process.exit(1);
}
console.log("PASS: every referenced table exists and required secrets are long enough.");
