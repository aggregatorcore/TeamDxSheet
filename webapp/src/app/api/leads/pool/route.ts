import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const assigned = searchParams.get("assigned") === "true";

    const adminClient = createAdminClient();
    const maxRows = 50000;

    if (assigned) {
      const { data, error } = await adminClient
        .from("leads")
        .select("id, source, name, number, assigned_to")
        .neq("assigned_to", "pool")
        .order("updated_at", { ascending: false })
        .range(0, maxRows - 1);
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    const { data, error } = await adminClient
      .from("leads")
      .select("id, source, name, number")
      .eq("assigned_to", "pool")
      .eq("is_invalid", false)
      .order("created_at", { ascending: false })
      .range(0, maxRows - 1);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /api/leads/pool error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch pool" },
      { status: 500 }
    );
  }
}
