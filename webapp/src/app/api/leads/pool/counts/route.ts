import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function GET() {
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

    const adminClient = createAdminClient();

    const [poolRes, assignedRes] = await Promise.all([
      adminClient
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", "pool")
        .eq("is_invalid", false),
      adminClient
        .from("leads")
        .select("id", { count: "exact", head: true })
        .neq("assigned_to", "pool"),
    ]);

    const pool = poolRes.error ? 0 : (poolRes.count ?? 0);
    const assigned = assignedRes.error ? 0 : (assignedRes.count ?? 0);

    return NextResponse.json({ pool, assigned });
  } catch (err) {
    console.error("GET /api/leads/pool/counts error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch counts" },
      { status: 500 }
    );
  }
}
