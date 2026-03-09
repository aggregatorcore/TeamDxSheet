import { createClient } from "@/lib/supabase/server";
import { getLeadsForUser, markOverdue } from "@/lib/db";
import { GRACE_PERIOD_HOURS } from "@/lib/constants";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await getLeadsForUser(user.email);
    const now = new Date();
    const graceMs = GRACE_PERIOD_HOURS * 60 * 60 * 1000;

    for (const lead of leads) {
      if (lead.category !== "callback" || !lead.callbackTime) continue;

      const callbackDate = new Date(lead.callbackTime);
      const deadline = new Date(callbackDate.getTime() + graceMs);

      if (now > deadline) {
        await markOverdue(lead.id, user.email);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to check overdue" },
      { status: 500 }
    );
  }
}
