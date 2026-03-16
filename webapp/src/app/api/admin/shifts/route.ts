import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

/** GET /api/admin/shifts – list all users with shift and leaves (admin only). */
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
    const [authResult, profilesResult, leavesResult] = await Promise.all([
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      adminClient.from("profiles").select("id, email, shift_start_time, shift_end_time, week_off_days"),
      adminClient.from("user_leaves").select("id, user_id, leave_date, leave_type").order("leave_date", { ascending: true }),
    ]);

    const authUsers = authResult.data?.users ?? [];
    const profiles = (profilesResult.data ?? []) as {
      id: string;
      email: string | null;
      shift_start_time: string | null;
      shift_end_time: string | null;
      week_off_days: string | null;
    }[];
    const leaves = (leavesResult.data ?? []) as { id: string; user_id: string; leave_date: string; leave_type: string | null }[];

    const leavesByUser = new Map<string, { id: string; leave_date: string; leave_type: string | null }[]>();
    for (const l of leaves) {
      const list = leavesByUser.get(l.user_id) ?? [];
      list.push({ id: l.id, leave_date: l.leave_date, leave_type: l.leave_type });
      leavesByUser.set(l.user_id, list);
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const users = authUsers.map((u) => {
      const profile = profileMap.get(u.id);
      const meta = u.user_metadata as { full_name?: string } | undefined;
      const fullName = meta?.full_name ?? null;
      return {
        id: u.id,
        email: u.email ?? "(no email)",
        full_name: fullName,
        shift_start_time: profile?.shift_start_time ?? null,
        shift_end_time: profile?.shift_end_time ?? null,
        week_off_days: profile?.week_off_days ?? null,
        leaves: leavesByUser.get(u.id) ?? [],
      };
    });
    users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/admin/shifts error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch shifts" },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/shifts – update one user's shift (admin only). */
export async function PATCH(request: Request) {
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
    const { userId, shift_start_time, shift_end_time, week_off_days } = body as {
      userId: string;
      shift_start_time?: string | null;
      shift_end_time?: string | null;
      week_off_days?: string | null;
    };
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const toTime = (v: string | null | undefined): string | null => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const s = String(v).trim();
      return s.length === 5 && /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
    };
    const updates: Record<string, unknown> = {};
    if (shift_start_time !== undefined) updates.shift_start_time = toTime(shift_start_time);
    if (shift_end_time !== undefined) updates.shift_end_time = toTime(shift_end_time);
    if (week_off_days !== undefined) updates.week_off_days = week_off_days === null || week_off_days === "" ? "" : String(week_off_days);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Upsert so we create profile row if missing (e.g. user created before trigger)
    const row = { id: userId, ...updates } as Record<string, unknown>;
    const { error } = await adminClient
      .from("profiles")
      .upsert(row, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/shifts error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update shift" },
      { status: 500 }
    );
  }
}
