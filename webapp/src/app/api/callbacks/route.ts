import { adjustCallbackTimeToShift } from "@/lib/callbackShiftAdjust";
import { getSupabaseAndUserFromRequest } from "@/lib/supabase/apiAuth";
import { resolveSlotAndToken } from "@/lib/tokenSlot";
import { scheduleCallback } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const auth = await getSupabaseAndUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { supabase, user } = auth;

    const body = await request.json();
    const { id, callbackTime } = body;

    if (!id || !callbackTime) {
      return NextResponse.json(
        { error: "id and callbackTime required" },
        { status: 400 }
      );
    }

    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 401 });
    }

    // Order: shift first, then token, then save
    let callbackTimeToSave = callbackTime as string;
    const [profileRes, leavesRes] = await Promise.all([
      supabase.from("profiles").select("shift_start_time, shift_end_time, week_off_days").eq("id", user.id).single(),
      supabase.from("user_leaves").select("leave_date").eq("user_id", user.id),
    ]);
    const profile = profileRes.data as { shift_start_time?: string | null; shift_end_time?: string | null; week_off_days?: string | null } | null;
    const leaves = (leavesRes.data ?? []) as { leave_date: string }[];
    const leaveDates = leaves.map((r) => r.leave_date);
    if (profile?.shift_start_time != null && profile?.shift_end_time != null) {
      callbackTimeToSave = adjustCallbackTimeToShift({
        requestedCallbackTimeISO: callbackTimeToSave,
        shiftStart: profile.shift_start_time,
        shiftEnd: profile.shift_end_time,
        weekOffDays: profile.week_off_days ?? null,
        leaveDates,
      });
    }

    const { callbackTime: resolvedTime, token: resolvedToken } = await resolveSlotAndToken({
      assignedTo: userEmail,
      proposedCallbackTimeISO: callbackTimeToSave,
      excludeLeadId: id,
      supabase,
    });

    await scheduleCallback(id, resolvedTime, userEmail, supabase, resolvedToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to schedule callback" },
      { status: 500 }
    );
  }
}
