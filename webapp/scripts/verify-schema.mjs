#!/usr/bin/env node
/**
 * Verify leads table has note + whatsapp_followup_started_at columns
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const path = existsSync(envPath) ? envPath : resolve(__dirname, "../.env.local");
  if (!existsSync(path)) {
    console.error("❌ .env.local not found");
    process.exit(1);
  }
  const content = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      process.env[key] = val;
    }
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing");
  process.exit(1);
}

const supabase = createClient(url, key);

async function verify() {
  const { data, error } = await supabase
    .from("leads")
    .select("id, note, whatsapp_followup_started_at")
    .limit(1);

  if (error) {
    console.error("❌ Schema check failed:", error.message);
    if (error.message?.includes("note") || error.message?.includes("whatsapp_followup")) {
      console.error("   → Migration lagao: Supabase SQL Editor mein ALTER TABLE wala SQL chalao");
    }
    process.exit(1);
  }
  console.log("✅ Schema OK – note + whatsapp_followup_started_at columns exist");
}

verify();
