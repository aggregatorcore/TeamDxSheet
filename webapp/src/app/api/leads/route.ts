import { createClient } from "@/lib/supabase/server";
import {
  getLeadsForUser,
  updateLead,
  markLeadInvalid,
  markLeadHiddenForAdmin,
  markLeadForReview,
  markLeadDocumentReceived,
  getInvalidLeadsForAdmin,
  getReviewLeadsForAdmin,
  getGreenBucketLeads,
} from "@/lib/db";
import { NextResponse } from "next/server";

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "true";
    const review = searchParams.get("review") === "true";
    const green = searchParams.get("green") === "true";

    if (admin || (admin && review)) {
      const userIsAdmin = await isAdmin(user.id);
      if (!userIsAdmin) {
        return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
      }
    }

    if (admin && review) {
      const leads = await getReviewLeadsForAdmin();
      return NextResponse.json(leads);
    }
    if (admin) {
      const leads = await getInvalidLeadsForAdmin();
      return NextResponse.json(leads);
    }
    if (green) {
      const leads = await getGreenBucketLeads(user.email);
      return NextResponse.json(leads);
    }

    const leads = await getLeadsForUser(user.email);
    return NextResponse.json(leads);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
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
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { source, name, place, number, assignedTo } = body;

    const { data, error } = await supabase
      .from("leads")
      .insert({
        source: source ?? "",
        name: name ?? "",
        place: place ?? "",
        number: number ?? "",
        assigned_to: assignedTo ?? user.email,
        flow: "Select",
        tags: "",
        category: "active",
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data?.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, flow, tags, note, category, moveToAdmin, moveToAdminWithTag, moveToReview, moveToGreenBucket } = body;

    if (moveToGreenBucket && id && note) {
      await markLeadDocumentReceived(id, note, user.email);
      return NextResponse.json({ ok: true });
    }

    if (moveToAdmin && id) {
      await markLeadInvalid(id, user.email);
      return NextResponse.json({ ok: true });
    }

    if (moveToReview && id && tags && note) {
      await markLeadForReview(id, tags, note, user.email);
      return NextResponse.json({ ok: true });
    }

    if (moveToAdminWithTag && id && tags) {
      await markLeadHiddenForAdmin(id, tags, user.email, body.note);
      return NextResponse.json({ ok: true });
    }

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (flow !== undefined) updates.flow = flow;
    if (tags !== undefined) updates.tags = tags;
    if (note !== undefined) updates.note = note;
    if (category !== undefined) updates.category = category;
    if (body.name !== undefined) updates.name = body.name;
    if (body.place !== undefined) updates.place = body.place;
    if (body.number !== undefined) updates.number = body.number;
    if (body.callbackTime !== undefined)
      updates.callbackTime = body.callbackTime;
    if (body.whatsappFollowupStartedAt !== undefined)
      updates.whatsappFollowupStartedAt = body.whatsappFollowupStartedAt;

    await updateLead(id, updates as Parameters<typeof updateLead>[1], user.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update lead";
    console.error("PATCH /api/leads error:", err);
    const hint = /is_document_received|column.*does not exist/i.test(msg)
      ? " Run: ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_document_received boolean DEFAULT false;"
      : /is_in_review|column.*does not exist/i.test(msg)
        ? " Run: ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_in_review boolean DEFAULT false;"
        : "";
    return NextResponse.json(
      { error: msg + hint },
      { status: 500 }
    );
  }
}
