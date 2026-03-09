#!/usr/bin/env node
/**
 * Run Supabase migrations (002, 003, etc.)
 * Requires: DATABASE_URL in .env.local
 * Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const path = existsSync(envPath) ? envPath : resolve(__dirname, '../.env.local');
  if (!existsSync(path)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  const content = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
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

const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

async function run() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('Missing DATABASE_URL or SUPABASE_DB_URL in .env.local');
    console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)');
    process.exit(1);
  }

  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error('Install pg: npm install pg');
    process.exit(1);
  }

  const client = new pg.default.Client({ connectionString: url });
  try {
    await client.connect();
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const f of files) {
      const sql = readFileSync(join(migrationsDir, f), 'utf8');
      console.log(`Running ${f}...`);
      await client.query(sql);
      console.log(`  ✓ ${f}`);
    }
    console.log('Migrations done.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
