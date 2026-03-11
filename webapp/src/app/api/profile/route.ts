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

    let profile: { role?: string; full_name?: string | null } | null = null;
    const adminClient = tryCreateAdminClient();
    if (adminClient) {
      const { data } = await adminClient
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      profile = data;
    }
    if (!profile) {
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      profile = data;
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
      full_name: profile?.full_name ?? null,
    });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: "Failed to get profile", role: null }, { status: 500 });
  }
}
