#!/usr/bin/env node
/**
 * TeamDX - Create test leads
 *
 * Usage:
 *   node scripts/seed-test-leads.mjs [assignedTo] [count] [start]
 *   assignedTo = "pool" for pool-only (unassigned), or email (default: telecaller@teamdx.com)
 *   count = number of leads to create (default: 40)
 *   start = start index in list (default: 0)
 *
 * 50 pool-only test leads: node scripts/seed-test-leads.mjs pool 50
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
  { source: "Website", name: "Sunita Nanda", place: "Bhopal", number: "9876543230" },
  { source: "Referral", name: "Gopal Tiwari", place: "Patna", number: "9876543231" },
  { source: "Website", name: "Rekha Saxena", place: "Raipur", number: "9876543232" },
  { source: "Referral", name: "Mukesh Yadav", place: "Ranchi", number: "9876543233" },
  { source: "Website", name: "Shalini Dubey", place: "Allahabad", number: "9876543234" },
  { source: "Referral", name: "Anil Mishra", place: "Dehradun", number: "9876543235" },
  { source: "Website", name: "Preeti Choudhury", place: "Guwahati", number: "9876543236" },
  { source: "Referral", name: "Vijay Thakur", place: "Shimla", number: "9876543237" },
  { source: "Website", name: "Sunil Bansal", place: "Bhubaneswar", number: "9876543238" },
  { source: "Referral", name: "Ritu Goyal", place: "Srinagar", number: "9876543239" },
  { source: "Website", name: "Naveen Chopra", place: "Amritsar", number: "9876543240" },
  { source: "Referral", name: "Pallavi Sinha", place: "Mysore", number: "9876543241" },
  { source: "Website", name: "Kunal Oberoi", place: "Jodhpur", number: "9876543242" },
  { source: "Referral", name: "Swati Rastogi", place: "Udaipur", number: "9876543243" },
  { source: "Website", name: "Rohit Bhatia", place: "Vadodara", number: "9876543244" },
  { source: "Referral", name: "Anjali Tandon", place: "Rajkot", number: "9876543245" },
  { source: "Website", name: "Sachin Arora", place: "Bareilly", number: "9876543246" },
  { source: "Referral", name: "Monika Sethi", place: "Moradabad", number: "9876543247" },
  { source: "Website", name: "Tarun Varma", place: "Gwalior", number: "9876543248" },
  { source: "Referral", name: "Ishita Khanna", place: "Cuttack", number: "9876543249" },
  { source: "Website", name: "Varun Dutta", place: "Tiruchirappalli", number: "9876543250" },
  { source: "Referral", name: "Shruti Banerjee", place: "Madurai", number: "9876543251" },
  { source: "Website", name: "Aditya Ghosh", place: "Tirunelveli", number: "9876543252" },
  { source: "Referral", name: "Nikita Sharma", place: "Salem", number: "9876543253" },
  { source: "Website", name: "Karan Mehta", place: "Warangal", number: "9876543254" },
];

const count = Math.min(parseInt(process.argv[3], 10) || 40, TEST_LEADS.length);
const start = Math.max(0, parseInt(process.argv[4], 10) || 0);

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
  const leadsToUse = TEST_LEADS.slice(start, start + count);
  console.log(`Creating ${leadsToUse.length} test leads (assigned to: ${assignedTo})...`);

  const rows = leadsToUse.map((l) => ({
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
