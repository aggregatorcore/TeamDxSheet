#!/usr/bin/env node
/**
 * TeamDX - Create telecaller/admin user + profile
 * 
 * Usage:
 *   node scripts/create-user.mjs <email> <password> [role]
 *   role = telecaller (default) or admin
 * 
 * Required: Add SUPABASE_SERVICE_ROLE_KEY to .env.local
 * Get it from: Supabase Dashboard → Project Settings → API → service_role
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

const [email, password, role = "telecaller"] = process.argv.slice(2);
if (!email || !password) {
  console.log("Usage: node scripts/create-user.mjs <email> <password> [role]");
  console.log("  role: telecaller (default) | admin");
  process.exit(1);
}
if (!["telecaller", "admin"].includes(role)) {
  console.error("❌ role must be telecaller or admin");
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Add SUPABASE_SERVICE_ROLE_KEY to .env.local");
  console.error("   Get it from: Supabase Dashboard → Project Settings → API → service_role");
  if (!serviceKey) console.error("   (SUPABASE_SERVICE_ROLE_KEY not found in .env.local)");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  console.log(`Creating user: ${email} (${role})...`);

  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError) {
    console.error("❌", userError.message);
    if (userError.message?.includes("Database error")) {
      console.error("\n   Try: DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;");
    }
    if (userError.message?.includes("already been registered")) {
      console.error("\n   User exists. Try different email or add profile manually.");
    }
    process.exit(1);
  }

  const userId = user.user?.id;
  if (!userId) {
    console.error("❌ User created but no ID returned");
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: userId, email, role },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("❌ Profile insert failed:", profileError.message);
    console.error("   Add manually in Table Editor → profiles:");
    console.error(`   id: ${userId}, email: ${email}, role: ${role}`);
    process.exit(1);
  }

  console.log("\n✅ User created successfully!");
  console.log(`   Email: ${email}`);
  console.log(`   Role: ${role}`);
  console.log("\n   Login at: http://localhost:3000");
}

main();
