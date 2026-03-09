import { createClient } from "@/lib/supabase/server";
import { scheduleCallback } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, callbackTime } = body;

    if (!id || !callbackTime) {
      return NextResponse.json(
        { error: "id and callbackTime required" },
        { status: 400 }
      );
    }

    await scheduleCallback(id, callbackTime, user.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to schedule callback" },
      { status: 500 }
    );
  }
}
