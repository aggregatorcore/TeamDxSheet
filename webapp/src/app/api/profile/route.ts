import { tryCreateAdminClient } from "@/lib/supabase/server";
import { getSupabaseAndUserFromRequest } from "@/lib/supabase/apiAuth";
import { NextResponse } from "next/server";

const ADMIN_EMAILS_OVERRIDE = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  : [];

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS_OVERRIDE.includes(email.toLowerCase());
}

/** GET /api/profile – current user's role & profile (for dashboard nav). Uses admin client so role is always readable. */
export async function GET(request: Request) {
  try {
    const auth = await getSupabaseAndUserFromRequest(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", role: null }, { status: 401 });
    }
    const { supabase, user } = auth;

    type ProfileRow = { role?: string; shift_start_time?: string | null; shift_end_time?: string | null; week_off_days?: string | null };
    const profileSelect = "role, shift_start_time, shift_end_time, week_off_days";
    let profile: ProfileRow | null = null;
    const adminClient = tryCreateAdminClient();
    const client = adminClient ?? supabase;
    const { data: dataFull, error: errFull } = await client
      .from("profiles")
      .select(profileSelect)
      .eq("id", user.id)
      .single();
    if (!errFull && dataFull) {
      profile = dataFull as ProfileRow;
    } else {
      // Fallback: shift columns may not exist (migration 009 not run) – fetch only role
      const { data: dataRole } = await client.from("profiles").select("role").eq("id", user.id).single();
      profile = dataRole ? { role: (dataRole as { role?: string }).role } : null;
    }

    const roleFromProfile = profile?.role?.toLowerCase();
    const roleFromMeta =
      (user.app_metadata as { role?: string })?.role?.toLowerCase() ??
      (user.user_metadata as { role?: string })?.role?.toLowerCase();
    const role =
      roleFromProfile ??
      roleFromMeta ??
      (isAdminEmail(user.email ?? undefined) ? "admin" : null);
    return NextResponse.json({
      role,
      email: user.email ?? null,
      shift_start_time: profile?.shift_start_time ?? null,
      shift_end_time: profile?.shift_end_time ?? null,
      week_off_days: profile?.week_off_days ?? null,
    });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: "Failed to get profile", role: null }, { status: 500 });
  }
}
