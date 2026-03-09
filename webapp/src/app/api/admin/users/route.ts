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

    const [authResult, profilesResult] = await Promise.all([
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      adminClient.from("profiles").select("id, email, role"),
    ]);

    const authUsers = authResult.data?.users ?? [];
    const profiles = (profilesResult.data ?? []) as { id: string; email: string; role: string }[];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const users = authUsers.map((u) => {
      const profile = profileMap.get(u.id);
      const isBanned = !!u.banned_until;
      const meta = u.user_metadata as { full_name?: string } | undefined;
      const name = meta?.full_name || null;
      return {
        id: u.id,
        email: u.email ?? "(no email)",
        full_name: name,
        role: profile?.role ?? "—",
        status: isBanned ? ("exited" as const) : ("active" as const),
      };
    });

    users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}

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
    const { email, password, role = "telecaller", full_name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    if (!["telecaller", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be telecaller or admin" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: authData, error: userError } = await adminClient.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: typeof full_name === "string" && full_name.trim() ? { full_name: full_name.trim() } : undefined,
    });

    if (userError) {
      const msg = (userError.message ?? "Failed to create user").toLowerCase();
      const isDuplicate =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("user already registered") ||
        msg.includes("duplicate") ||
        msg.includes("already exists");
      if (isDuplicate) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: userError.message ?? "Failed to create user" },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User created but no ID returned" }, { status: 500 });
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      { id: userId, email: String(email).trim(), role },
      { onConflict: "id" }
    );

    if (profileError) {
      return NextResponse.json(
        { error: "Profile creation failed: " + profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: userId,
      email: String(email).trim(),
      role,
    });
  } catch (err) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
