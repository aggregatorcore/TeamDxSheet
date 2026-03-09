import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

/** Extract spreadsheet ID and gid from Google Sheet URL */
function parseSheetUrl(url: string): { sheetId: string; gid: string } | null {
  const trimmed = url.trim();
  const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const sheetId = idMatch[1];
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return { sheetId, gid };
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
    const { sheetUrl } = body as { sheetUrl?: string };

    if (!sheetUrl || typeof sheetUrl !== "string") {
      return NextResponse.json({ error: "Google Sheet URL required" }, { status: 400 });
    }

    const parsed = parseSheetUrl(sheetUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid Google Sheet URL. Use format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit" },
        { status: 400 }
      );
    }

    const exportUrl = `https://docs.google.com/spreadsheets/d/${parsed.sheetId}/export?format=csv&gid=${parsed.gid}`;

    const res = await fetch(exportUrl, {
      headers: { "User-Agent": "TeamDX-LeadManager/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "Could not fetch sheet. Ensure the sheet is shared with 'Anyone with the link can view'.",
        },
        { status: 400 }
      );
    }

    const text = await res.text();
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "Sheet is empty or has no data rows" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const sourceIdx = headers.findIndex((h) => h === "source" || h === "source_name");
    const nameIdx = headers.findIndex((h) => h === "name" || h === "customer" || h === "customer_name");
    const placeIdx = headers.findIndex((h) => h === "place" || h === "location" || h === "city");
    const numberIdx = headers.findIndex((h) => h === "number" || h === "phone" || h === "mobile" || h === "contact");

    const fallback = (arr: string[], i: number) => (i >= 0 ? arr[i]?.trim() ?? "" : "");
    const leads: { source: string; name: string; place: string; number: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const number = fallback(cols, numberIdx) || fallback(cols, 3) || fallback(cols, 0);
      if (!number) continue;
      leads.push({
        source: fallback(cols, sourceIdx) || fallback(cols, 1) || "",
        name: fallback(cols, nameIdx) || fallback(cols, 2) || "",
        place: fallback(cols, placeIdx) || "",
        number,
      });
    }

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No valid leads found. Ensure columns: source, name, place, number (or phone, mobile)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ leads, count: leads.length });
  } catch (err) {
    console.error("POST /api/leads/fetch-from-sheet error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch from sheet" },
      { status: 500 }
    );
  }
}
