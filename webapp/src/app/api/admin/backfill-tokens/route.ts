import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeTokenAssignments, type LeadForBackfill } from "@/lib/tokenBackfill";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

const BATCH_SIZE = 50;

/** POST /api/admin/backfill-tokens – assign token to all leads with callback_time (time order). Admin only. */
export async function POST() {
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

    const admin = createAdminClient();
    const { data: rows, error: fetchError } = await admin
      .from("leads")
      .select("id, callback_time, assigned_to")
      .not("callback_time", "is", null);

    if (fetchError) {
      console.error("backfill-tokens fetch:", fetchError);
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    const leads = (rows ?? []) as LeadForBackfill[];
    const assignments = computeTokenAssignments(leads);
    let updated = 0;
    for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
      const batch = assignments.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(({ id, token }) => admin.from("leads").update({ token }).eq("id", id).select("id"))
      );
      const succeeded = results.filter((r) => !r.error).length;
      updated += succeeded;
    }

    const totalWithCallback = leads.length;
    return NextResponse.json({
      updated,
      skipped: totalWithCallback - assignments.length,
      totalWithCallback,
    });
  } catch (err) {
    console.error("backfill-tokens:", err);
    return NextResponse.json({ error: "Failed to backfill tokens" }, { status: 500 });
  }
}
