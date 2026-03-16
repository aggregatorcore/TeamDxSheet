import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

/** Fresh state: flow Not Connected, no tags, category active, no callback, no note, no review/green/new_assigned/whatsapp. */
function getFreshUpdate() {
  return {
    flow: "Not Connected",
    tags: "",
    category: "active",
    callback_time: null,
    note: "",
    token: null,
    is_in_review: false,
    is_document_received: false,
    is_new_assigned: false,
    whatsapp_followup_started_at: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * POST /api/admin/fresh-test-leads
 * Saari leads jinka source = "testing" hai unko fresh state mein reset karta hai
 * (flow Not Connected, tags "", category active, callback/time/note/token/review/green/new_assigned/whatsapp clear).
 */
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
    const PAGE_SIZE = 500;
    let totalUpdated = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: page, error: fetchErr } = await admin
        .from("leads")
        .select("id")
        .eq("source", "testing")
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchErr) {
        console.error("fresh-test-leads fetch:", fetchErr);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
      }
      const ids = (page ?? []) as { id: string }[];
      if (ids.length === 0) break;

      const { error: updateErr } = await admin
        .from("leads")
        .update(getFreshUpdate())
        .in("id", ids.map((r) => r.id));

      if (updateErr) {
        console.error("fresh-test-leads update:", updateErr);
        return NextResponse.json({ error: "Failed to update leads" }, { status: 500 });
      }
      totalUpdated += ids.length;
      hasMore = ids.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    return NextResponse.json({ ok: true, updated: totalUpdated });
  } catch (err) {
    console.error("POST /api/admin/fresh-test-leads error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
