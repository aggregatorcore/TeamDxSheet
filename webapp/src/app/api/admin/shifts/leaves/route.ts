import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

/** POST /api/admin/shifts/leaves – add a leave (admin only). */
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
    const { userId, leave_date, leave_type } = body as { userId: string; leave_date: string; leave_type?: string };
    if (!userId || !leave_date) {
      return NextResponse.json({ error: "userId and leave_date required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: inserted, error } = await adminClient
      .from("user_leaves")
      .insert({ user_id: userId, leave_date: leave_date, leave_type: leave_type || null })
      .select("id, user_id, leave_date, leave_type")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Leave already exists for this date" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(inserted);
  } catch (err) {
    console.error("POST /api/admin/shifts/leaves error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add leave" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/shifts/leaves?id= – delete a leave by id (admin only). */
export async function DELETE(request: Request) {
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("user_leaves").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/shifts/leaves error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete leave" },
      { status: 500 }
    );
  }
}
