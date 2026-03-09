#!/usr/bin/env node
/**
 * TeamDX - Create 20 test leads
 *
 * Usage:
 *   node scripts/seed-test-leads.mjs [assignedTo]
 *   assignedTo = email to assign leads to (default: telecaller@teamdx.com)
 *
 * Required: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    const alt = resolve(__dirname, "../.env.local");
    if (existsSync(alt)) return loadEnvFrom(alt);
    console.error("❌ .env.local not found");
    process.exit(1);
  }
  return loadEnvFrom(envPath);
}

function loadEnvFrom(envPath) {
  const content = readFileSync(envPath, "utf8").replace(/\r\n/g, "\n");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      env[key] = val;
    }
  }
  return env;
}

const assignedTo = process.argv[2] || "telecaller@teamdx.com";

const TEST_LEADS = [
  { source: "Website", name: "Rahul Sharma", place: "Mumbai", number: "9876543210" },
  { source: "Website", name: "Priya Patel", place: "Ahmedabad", number: "9876543211" },
  { source: "Referral", name: "Amit Kumar", place: "Delhi", number: "9876543212" },
  { source: "Website", name: "Sneha Reddy", place: "Hyderabad", number: "9876543213" },
  { source: "Referral", name: "Vikram Singh", place: "Pune", number: "9876543214" },
  { source: "Website", name: "Anita Desai", place: "Bangalore", number: "9876543215" },
  { source: "Referral", name: "Rajesh Gupta", place: "Chennai", number: "9876543216" },
  { source: "Website", name: "Kavita Mehta", place: "Kolkata", number: "9876543217" },
  { source: "Referral", name: "Manoj Gupta", place: "Jaipur", number: "9876543218" },
  { source: "Website", name: "Kiran Bhat", place: "Surat", number: "9876543219" },
  { source: "Referral", name: "Deepak Nair", place: "Kochi", number: "9876543220" },
  { source: "Website", name: "Pooja Iyer", place: "Coimbatore", number: "9876543221" },
  { source: "Referral", name: "Suresh Menon", place: "Thiruvananthapuram", number: "9876543222" },
  { source: "Website", name: "Lakshmi Rao", place: "Vijayawada", number: "9876543223" },
  { source: "Referral", name: "Arun Joshi", place: "Nagpur", number: "9876543224" },
  { source: "Website", name: "Meera Krishnan", place: "Indore", number: "9876543225" },
  { source: "Referral", name: "Sanjay Verma", place: "Lucknow", number: "9876543226" },
  { source: "Website", name: "Neha Agarwal", place: "Kanpur", number: "9876543227" },
  { source: "Referral", name: "Ravi Malhotra", place: "Chandigarh", number: "9876543228" },
  { source: "Website", name: "Divya Kapoor", place: "Ludhiana", number: "9876543229" },
];

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Add SUPABASE_SERVICE_ROLE_KEY to .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Creating 20 test leads (assigned to: ${assignedTo})...`);

  const rows = TEST_LEADS.map((l) => ({
    source: l.source,
    name: l.name,
    place: l.place,
    number: l.number,
    assigned_to: assignedTo,
    flow: "Select",
    tags: "",
    category: "active",
    is_invalid: false,
  }));

  const { data, error } = await supabase.from("leads").insert(rows).select("id");

  if (error) {
    console.error("❌", error.message);
    process.exit(1);
  }

  console.log(`\n✅ Created ${data?.length ?? 0} test leads successfully!`);
}

main();
