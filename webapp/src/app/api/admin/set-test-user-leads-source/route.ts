import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

/**
 * POST /api/admin/set-test-user-leads-source
 * Body: { userEmail: string } — Test user ka email (e.g. telecaller@teamdx.com).
 * Us user ki saari leads (exhaust, review, green, kisi bhi bucket) ka source = "testing" set karta hai.
 */
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

    const body = await request.json().catch(() => ({}));
    const userEmail = typeof body.userEmail === "string" ? body.userEmail.trim() : "";
    if (!userEmail) {
      return NextResponse.json({ error: "userEmail required (test user email)" }, { status: 400 });
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
        .eq("assigned_to", userEmail)
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchErr) {
        console.error("set-test-user-leads-source fetch:", fetchErr);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
      }
      const ids = (page ?? []) as { id: string }[];
      if (ids.length === 0) break;

      const { error: updateErr } = await admin
        .from("leads")
        .update({ source: "testing", updated_at: new Date().toISOString() })
        .in("id", ids.map((r) => r.id));

      if (updateErr) {
        console.error("set-test-user-leads-source update:", updateErr);
        return NextResponse.json({ error: "Failed to update leads" }, { status: 500 });
      }
      totalUpdated += ids.length;
      hasMore = ids.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    return NextResponse.json({ ok: true, updated: totalUpdated, userEmail });
  } catch (err) {
    console.error("POST /api/admin/set-test-user-leads-source error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
