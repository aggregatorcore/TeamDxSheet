import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizeLeadNumber } from "@/lib/leadNumber";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

type Row = {
  id: string;
  assigned_to: string;
  number: string;
  note: string | null;
  callback_time: string | null;
  created_at: string | null;
};

/**
 * POST /api/admin/merge-duplicate-leads
 * Global: mobile number = primary key. Finds all leads with same normalized number (any assigned_to),
 * keeps one per number (oldest by created_at), merges note and latest callback_time, marks rest is_invalid = true.
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
    const list: Row[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: page, error: fetchErr } = await admin
        .from("leads")
        .select("id, assigned_to, number, note, callback_time, created_at")
        .eq("is_invalid", false)
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchErr) {
        console.error("merge-duplicate-leads fetch:", fetchErr);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
      }
      const rows = (page ?? []) as Row[];
      list.push(...rows);
      hasMore = rows.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    const key = (r: Row) => normalizeLeadNumber(r.number);
    const byKey = new Map<string, Row[]>();
    for (const r of list) {
      const k = key(r);
      if (!k) continue;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(r);
    }

    let merged = 0;
    let invalidated = 0;
    for (const [, group] of byKey) {
      if (group.length <= 1) continue;
      group.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      const keep = group[0];
      const rest = group.slice(1);
      const notes = [keep.note, ...rest.map((r) => r.note)].filter(Boolean) as string[];
      const mergedNote = notes.length ? notes.join(" | Merged") : "Merged";
      let latestCallback = keep.callback_time;
      for (const r of rest) {
        if (r.callback_time && (!latestCallback || r.callback_time > latestCallback)) {
          latestCallback = r.callback_time;
        }
      }
      const updates: Record<string, unknown> = {
        note: mergedNote,
        updated_at: new Date().toISOString(),
      };
      if (latestCallback) updates.callback_time = latestCallback;
      const { error: upErr } = await admin.from("leads").update(updates).eq("id", keep.id);
      if (upErr) {
        console.error("merge update error for", keep.id, upErr);
        continue;
      }
      merged++;
      for (const r of rest) {
        const { error: invErr } = await admin
          .from("leads")
          .update({ is_invalid: true, updated_at: new Date().toISOString() })
          .eq("id", r.id);
        if (!invErr) invalidated++;
      }
    }

    return NextResponse.json({ ok: true, merged, invalidated });
  } catch (err) {
    console.error("POST /api/admin/merge-duplicate-leads error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Merge failed" },
      { status: 500 }
    );
  }
}
