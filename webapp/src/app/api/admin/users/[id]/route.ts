import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const body = await request.json();
    const { full_name, role, password, banned } = body;

    const adminClient = createAdminClient();

    const authUpdates: Record<string, unknown> = {};
    if (typeof password === "string" && password.length >= 6) {
      authUpdates.password = password;
    }
    if (typeof banned === "boolean") {
      authUpdates.ban_duration = banned ? "876000h" : "none";
    }
    if (typeof full_name === "string") {
      const { data: existingUser } = await adminClient.auth.admin.getUserById(id);
      const existingMeta = (existingUser?.user?.user_metadata as Record<string, unknown>) ?? {};
      authUpdates.user_metadata = { ...existingMeta, full_name: full_name.trim() || null } as Record<string, unknown>;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(id, authUpdates);
      if (authError) {
        return NextResponse.json(
          { error: authError.message ?? "Failed to update user" },
          { status: 400 }
        );
      }
    }

    const profileUpdates: Record<string, unknown> = {};
    if (["telecaller", "admin"].includes(role)) {
      profileUpdates.role = role;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("id", id);

      if (profileError) {
        return NextResponse.json(
          { error: "Profile update failed: " + profileError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/users/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user" },
      { status: 500 }
    );
  }
}
