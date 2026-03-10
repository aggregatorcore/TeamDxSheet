import { getSupabaseAndUserFromRequest } from "@/lib/supabase/apiAuth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteAllLeads } from "@/lib/db";
import { NextResponse } from "next/server";

async function isAdmin(userId: string, supabase?: SupabaseClient): Promise<boolean> {
  const client = supabase ?? (await createClient());
  const { data } = await client.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function POST(request: Request) {
  try {
    const auth = await getSupabaseAndUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(auth.user.id, auth.supabase);
    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== "DELETE_ALL") {
      return NextResponse.json(
        { error: "Confirmation required. Send { confirm: 'DELETE_ALL' } in body." },
        { status: 400 }
      );
    }

    const deleted = await deleteAllLeads();
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("POST /api/leads/delete-all error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete leads" },
      { status: 500 }
    );
  }
}
