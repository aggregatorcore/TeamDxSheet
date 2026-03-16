import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCallbackDisplayTagFallback } from "@/lib/leadNote";
import { TAGS_SCHEDULEABLE_CALLBACK } from "@/types/lead";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

const VALID_CALLBACK_TAGS = new Set(TAGS_SCHEDULEABLE_CALLBACK);

/**
 * POST /api/admin/backfill-callback-tags
 * Finds leads with callback_time set but tags empty or not in No Answer/Switch Off/Busy IVR.
 * Sets tags from note (last known tag) or "No Answer". Fixes "—" in callback card.
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
    const PAGE_SIZE = 1000;
    const rows: { id: string; note: string | null; tags: string | null }[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: page, error: fetchErr } = await admin
        .from("leads")
        .select("id, note, tags")
        .not("callback_time", "is", null)
        .eq("is_invalid", false)
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchErr) {
        console.error("backfill-callback-tags fetch:", fetchErr);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
      }
      const list = (page ?? []) as { id: string; note: string | null; tags: string | null }[];
      rows.push(...list);
      hasMore = list.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    let updated = 0;
    for (const row of rows) {
      const currentTags = (row.tags ?? "").trim();
      const needsBackfill =
        !currentTags || !VALID_CALLBACK_TAGS.has(currentTags);
      if (!needsBackfill) continue;

      const newTag = getCallbackDisplayTagFallback(row.note ?? undefined);
      const { error: upErr } = await admin
        .from("leads")
        .update({ tags: newTag, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (!upErr) updated++;
    }

    return NextResponse.json({ ok: true, updated, totalWithCallback: rows.length });
  } catch (err) {
    console.error("POST /api/admin/backfill-callback-tags error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backfill failed" },
      { status: 500 }
    );
  }
}
