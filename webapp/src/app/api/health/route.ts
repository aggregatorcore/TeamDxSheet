import { NextResponse } from "next/server";

/**
 * Health check for Cloudflare and hosting platforms.
 * GET /api/health returns 200 when the server is up – helps avoid Error 521
 * when the origin is running but other routes are slow or failing.
 */
export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
