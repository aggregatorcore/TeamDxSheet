import { getSupabaseAndUserFromRequest } from "@/lib/supabase/apiAuth";
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

    await scheduleCallback(id, callbackTime, user.email, supabase);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to schedule callback" },
      { status: 500 }
    );
  }
}
