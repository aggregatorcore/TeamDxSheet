import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getLeadByNumber } from "@/lib/db";
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
    let distributed = 0;
    let skippedDuplicates = 0;
    let idx = 0;
    for (const id of leadIds) {
      const email = assignTo[idx % assignTo.length];
      idx++;
      const { data: leadRow } = await adminClient
        .from("leads")
        .select("number")
        .eq("id", id)
        .eq("assigned_to", "pool")
        .single();
      if (!leadRow) continue;
      const number = String(leadRow.number ?? "").trim();
      const existing = await getLeadByNumber(number);
      if (existing && existing.id !== id) {
        await adminClient.from("leads").update({ is_invalid: true, updated_at: new Date().toISOString() }).eq("id", id);
        skippedDuplicates++;
        continue;
      }
      const { error } = await adminClient
        .from("leads")
        .update({ assigned_to: email, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("assigned_to", "pool");
      if (error) throw error;
      distributed++;
    }

    return NextResponse.json({ ok: true, distributed, skippedDuplicates });
  } catch (err) {
    console.error("POST /api/leads/distribute error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Distribution failed" },
      { status: 500 }
    );
  }
}
