import { createClient } from "@/lib/supabase/server";
import { computeTokenAssignments, type LeadForBackfill } from "@/lib/tokenBackfill";
import { NextResponse } from "next/server";

const BATCH_SIZE = 50;

/**
 * POST /api/sync-my-tokens
 * Current user ki saari leads (jinke paas callback_time hai) ke tokens recompute karta hai
 * (same logic as admin backfill, sirf is user ke leads). Tag apply ke baad ya Refresh pe call karo.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.email;
    const { data: rows, error: fetchError } = await supabase
      .from("leads")
      .select("id, callback_time, assigned_to")
      .eq("assigned_to", userEmail)
      .not("callback_time", "is", null);

    if (fetchError) {
      console.error("sync-my-tokens fetch:", fetchError);
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    const leads = (rows ?? []) as LeadForBackfill[];
    const assignments = computeTokenAssignments(leads);
    let updated = 0;
    for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
      const batch = assignments.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(({ id, token }) =>
          supabase.from("leads").update({ token, updated_at: new Date().toISOString() }).eq("id", id).eq("assigned_to", userEmail).select("id")
        )
      );
      updated += results.filter((r) => !r.error).length;
    }

    return NextResponse.json({ ok: true, updated, totalWithCallback: leads.length });
  } catch (err) {
    console.error("POST /api/sync-my-tokens error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
