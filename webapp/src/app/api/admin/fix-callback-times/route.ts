import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { adjustCallbackTimeToShift } from "@/lib/callbackShiftAdjust";
import { computeTokenAssignments, type LeadForBackfill } from "@/lib/tokenBackfill";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

const BATCH_SIZE = 50;
const DEFAULT_SHIFT_TZ_OFFSET_MINUTES = 330;

/**
 * POST /api/admin/fix-callback-times
 * Fix existing leads whose callback_time is before shift start (e.g. 8:30 AM when shift is 9:30 AM).
 * Uses adjustCallbackTimeToShift with forceAdjust. Then runs token backfill so tokens stay correct.
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

    const [leadsRes, profilesRes, leavesRes] = await Promise.all([
      admin.from("leads").select("id, callback_time, assigned_to").not("callback_time", "is", null),
      admin.from("profiles").select("id, email, shift_start_time, shift_end_time, week_off_days"),
      admin.from("user_leaves").select("user_id, leave_date"),
    ]);

    if (leadsRes.error) {
      console.error("fix-callback-times leads fetch:", leadsRes.error);
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    const profiles = (profilesRes.data ?? []) as {
      id: string;
      email: string | null;
      shift_start_time: string | null;
      shift_end_time: string | null;
      week_off_days: string | null;
    }[];
    const leaves = (leavesRes.data ?? []) as { user_id: string; leave_date: string }[];

    const profileByEmail = new Map(
      profiles
        .filter((p) => p.email)
        .map((p) => [p.email!.toLowerCase().trim(), p])
    );
    const leaveDatesByUserId = new Map<string, string[]>();
    for (const l of leaves) {
      const list = leaveDatesByUserId.get(l.user_id) ?? [];
      list.push(l.leave_date);
      leaveDatesByUserId.set(l.user_id, list);
    }

    const leads = (leadsRes.data ?? []) as { id: string; callback_time: string; assigned_to: string | null }[];
    const toUpdate: { id: string; callback_time: string }[] = [];

    for (const lead of leads) {
      const email = (lead.assigned_to ?? "").trim().toLowerCase();
      if (!email) continue;
      const profile = profileByEmail.get(email);
      if (!profile?.shift_start_time || !profile?.shift_end_time) continue;

      const leaveDates = leaveDatesByUserId.get(profile.id) ?? [];
      const adjusted = adjustCallbackTimeToShift({
        requestedCallbackTimeISO: lead.callback_time,
        shiftStart: profile.shift_start_time,
        shiftEnd: profile.shift_end_time,
        weekOffDays: profile.week_off_days ?? null,
        leaveDates,
        timezoneOffsetMinutes: DEFAULT_SHIFT_TZ_OFFSET_MINUTES,
        forceAdjust: true,
      });

      if (adjusted !== lead.callback_time) {
        toUpdate.push({ id: lead.id, callback_time: adjusted });
      }
    }

    let fixed = 0;
    const updatedTimeById = new Map(toUpdate.map((u) => [u.id, u.callback_time]));
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(({ id, callback_time }) =>
          admin.from("leads").update({ callback_time }).eq("id", id).select("id")
        )
      );
      fixed += results.filter((r) => !r.error).length;
    }

    const allLeadsWithCallback = (leadsRes.data ?? []) as LeadForBackfill[];
    const leadsForToken = allLeadsWithCallback.map((l) =>
      updatedTimeById.has(l.id) ? { ...l, callback_time: updatedTimeById.get(l.id)! } : l
    );
    const assignments = computeTokenAssignments(leadsForToken, DEFAULT_SHIFT_TZ_OFFSET_MINUTES);
    let tokensUpdated = 0;
    for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
      const batch = assignments.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(({ id, token }) => admin.from("leads").update({ token }).eq("id", id).select("id"))
      );
      tokensUpdated += results.filter((r) => !r.error).length;
    }

    return NextResponse.json({
      ok: true,
      fixed,
      tokensUpdated,
      totalWithCallback: leads.length,
    });
  } catch (err) {
    console.error("fix-callback-times:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fix callback times" },
      { status: 500 }
    );
  }
}
