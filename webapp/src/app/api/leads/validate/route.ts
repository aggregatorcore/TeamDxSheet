import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

/** Normalize number for comparison - remove spaces, take first if comma-separated */
function normalizeNumber(n: string): string {
  return String(n ?? "")
    .replace(/\s/g, "")
    .split(",")[0]
    .trim();
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
    const { numbers } = body as { numbers: string[] };

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "No numbers provided" }, { status: 400 });
    }

    const normalized = numbers.map(normalizeNumber).filter(Boolean);
    const unique = [...new Set(normalized)];

    if (unique.length === 0) {
      return NextResponse.json({
        existingInSystem: [],
      });
    }

    const adminClient = createAdminClient();
    const { data: rows, error } = await adminClient
      .from("leads")
      .select("number, assigned_to")
      .in("number", unique);

    if (error) {
      console.error("Validate query error:", error);
      return NextResponse.json({ existingInSystem: [] });
    }

    const byNumber = new Map<string, { number: string; assignedTo: string }>();
    for (const r of rows ?? []) {
      const raw = String(r.number ?? "").trim();
      const norm = normalizeNumber(raw);
      if (norm && !byNumber.has(norm)) {
        byNumber.set(norm, { number: norm, assignedTo: String(r.assigned_to ?? "—") });
      }
    }

    const existingInSystem = unique
      .filter((n) => byNumber.has(n))
      .map((number) => byNumber.get(number)!);

    return NextResponse.json({ existingInSystem });
  } catch (err) {
    console.error("POST /api/leads/validate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Validation failed" },
      { status: 500 }
    );
  }
}
