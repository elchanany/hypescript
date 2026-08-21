import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key exists:", !!serviceKey);

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function purgeAll() {
  console.log("Purging all cloud projects, assets, and jobs from Supabase...");

  // 1. Delete all cloud usage events
  const { error: errUsage } = await supabase.from("cloud_usage_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errUsage) console.warn("cloud_usage_events purge warning:", errUsage.message);
  else console.log("✓ Purged cloud_usage_events");

  // 2. Delete all cloud jobs
  const { error: errJobs } = await supabase.from("cloud_jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errJobs) console.warn("cloud_jobs purge warning:", errJobs.message);
  else console.log("✓ Purged cloud_jobs");

  // 3. Delete all cloud assets
  const { error: errAssets } = await supabase.from("cloud_assets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errAssets) console.warn("cloud_assets purge warning:", errAssets.message);
  else console.log("✓ Purged cloud_assets");

  // 4. Delete all cloud projects
  const { error: errProjects } = await supabase.from("cloud_projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (errProjects) console.warn("cloud_projects purge warning:", errProjects.message);
  else console.log("✓ Purged cloud_projects");

  console.log("ALL CLOUD DATA HAS BEEN COMPLETELY PURGED FROM SUPABASE!");
}

purgeAll().catch((err) => {
  console.error("Fatal error during purge:", err);
  process.exit(1);
});
