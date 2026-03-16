import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizeLeadNumber } from "@/lib/leadNumber";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
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
    const { leads, assignTo } = body as {
      leads: { source?: string; name?: string; place?: string; number: string }[];
      assignTo: string[];
    };

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided" }, { status: 400 });
    }

    const assignToList = Array.isArray(assignTo) ? assignTo : [];
    const usePool = assignToList.length === 0 || (assignToList.length === 1 && assignToList[0] === "pool");
    const targetEmails = usePool ? ["pool"] : assignToList.filter((e: string) => e !== "pool");
    if (targetEmails.length === 0) {
      return NextResponse.json({ error: "Select at least one user or use pool" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Global: mobile number = primary key. Existing normalized numbers (any lead) so we never insert duplicate.
    const existingNumbers = new Set<string>();
    const { data: existingRows } = await adminClient
      .from("leads")
      .select("number")
      .eq("is_invalid", false);
    for (const r of existingRows ?? []) {
      const norm = normalizeLeadNumber(r.number);
      if (norm) existingNumbers.add(norm);
    }

    let idx = 0;
    const rows: { source: string; name: string; place: string; number: string; assigned_to: string; flow: string; tags: string; category: string }[] = [];
    let skipped = 0;
    for (const l of leads) {
      const email = targetEmails[idx % targetEmails.length];
      idx++;
      const number = String(l.number ?? "").trim();
      const norm = normalizeLeadNumber(number);
      if (!norm || existingNumbers.has(norm)) {
        skipped++;
        continue;
      }
      existingNumbers.add(norm);
      rows.push({
        source: String(l.source ?? "").trim(),
        name: String(l.name ?? "").trim(),
        place: String(l.place ?? "").trim(),
        number,
        assigned_to: email,
        flow: "Not Connected",
        tags: "",
        category: "active",
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0, skippedDuplicates: skipped });
    }

    const { data, error } = await adminClient.from("leads").insert(rows).select("id");

    if (error) throw error;
    return NextResponse.json({ inserted: data?.length ?? rows.length, skippedDuplicates: skipped });
  } catch (err) {
    console.error("POST /api/leads/upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
