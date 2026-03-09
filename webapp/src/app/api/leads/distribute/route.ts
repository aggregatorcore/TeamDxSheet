import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { leadIds, assignTo } = body as { leadIds: string[]; assignTo: string[] };

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "No leads selected" }, { status: 400 });
    }

    if (!Array.isArray(assignTo) || assignTo.length === 0) {
      return NextResponse.json({ error: "Select at least one user" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    let idx = 0;
    for (const id of leadIds) {
      const email = assignTo[idx % assignTo.length];
      idx++;
      const { error } = await adminClient
        .from("leads")
        .update({ assigned_to: email, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("assigned_to", "pool");

      if (error) throw error;
    }

    return NextResponse.json({ ok: true, distributed: leadIds.length });
  } catch (err) {
    console.error("POST /api/leads/distribute error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Distribution failed" },
      { status: 500 }
    );
  }
}
