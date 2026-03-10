import { getSupabaseAndUserFromRequest } from "@/lib/supabase/apiAuth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getLeadsForUser,
  getLeadsForUserAsAdmin,
  getLeadsForUserAsAdminByBucket,
  updateLead,
  markLeadInvalid,
  markLeadHiddenForAdmin,
  markLeadForReview,
  markLeadDocumentReceived,
  getInvalidLeadsForAdmin,
  getReviewLeadsForAdmin,
  getGreenBucketLeads,
  deleteLead,
  getTelecallerLeadStats,
} from "@/lib/db";
import { NextResponse } from "next/server";

async function isAdmin(userId: string, supabase?: SupabaseClient): Promise<boolean> {
  const client = supabase ?? (await createClient());
  const { data } = await client.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function GET(request: Request) {
  try {
    const auth = await getSupabaseAndUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { supabase, user } = auth;

    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "true";
    const review = searchParams.get("review") === "true";
    const green = searchParams.get("green") === "true";
    const stats = searchParams.get("stats") === "true";
    const assignedTo = searchParams.get("assignedTo")?.trim();

    if (admin || (admin && review) || stats || assignedTo) {
      const userIsAdmin = await isAdmin(user.id, supabase);
      if (!userIsAdmin) {
        return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
      }
    }

    if (stats) {
      const telecallerStats = await getTelecallerLeadStats();
      return NextResponse.json({ telecallers: telecallerStats });
    }
    if (assignedTo) {
      const bucket = searchParams.get("bucket") as "green" | "review" | "exhaust" | null;
      if (bucket === "green" || bucket === "review" || bucket === "exhaust") {
        const leads = await getLeadsForUserAsAdminByBucket(assignedTo, bucket);
        return NextResponse.json(leads);
      }
      const leads = await getLeadsForUserAsAdmin(assignedTo);
      return NextResponse.json(leads);
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
      const leads = await getGreenBucketLeads(user.email, supabase);
      return NextResponse.json(leads);
    }

    const leads = await getLeadsForUser(user.email, supabase);
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
    const auth = await getSupabaseAndUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { supabase, user } = auth;

    const userIsAdmin = await isAdmin(user.id, supabase);
    const body = await request.json();
    const { source, name, place, number, assignedTo } = body;

    // Only admins can assign leads to others; telecallers always get their own email
    const assigned_to = userIsAdmin ? (assignedTo ?? user.email) : user.email;

    const { data, error } = await supabase
      .from("leads")
      .insert({
        source: source ?? "",
        name: name ?? "",
        place: place ?? "",
        number: number ?? "",
        assigned_to,
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
    const auth = await getSupabaseAndUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { supabase, user } = auth;

    const body = await request.json();
    const { id, flow, tags, note, category, moveToAdmin, moveToAdminWithTag, moveToReview, moveToGreenBucket } = body;

    // Ownership check for admin actions (markLeadInvalid/ForReview/Hidden use adminClient, bypass RLS)
    const verifyOwnership = async (leadId: string) => {
      const { data } = await supabase.from("leads").select("id").eq("id", leadId).single();
      return !!data; // RLS: only returns row if assigned_to = user.email
    };

    if (moveToGreenBucket && id && note) {
      await markLeadDocumentReceived(id, note, user.email, supabase);
      return NextResponse.json({ ok: true });
    }

    if (moveToAdmin && id) {
      if (!(await verifyOwnership(id))) {
        return NextResponse.json({ error: "Forbidden - Lead not assigned to you" }, { status: 403 });
      }
      await markLeadInvalid(id, user.email);
      return NextResponse.json({ ok: true });
    }

    if (moveToReview && id && tags && note) {
      if (!(await verifyOwnership(id))) {
        return NextResponse.json({ error: "Forbidden - Lead not assigned to you" }, { status: 403 });
      }
      await markLeadForReview(id, tags, note, user.email);
      return NextResponse.json({ ok: true });
    }

    if (moveToAdminWithTag && id && tags) {
      if (!(await verifyOwnership(id))) {
        return NextResponse.json({ error: "Forbidden - Lead not assigned to you" }, { status: 403 });
      }
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

    await updateLead(id, updates as Parameters<typeof updateLead>[1], user.email, supabase);
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

export async function DELETE(request: Request) {
  try {
    const auth = await getSupabaseAndUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;

    const userIsAdmin = await isAdmin(user.id, auth.supabase);
    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await deleteLead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/leads error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete lead" },
      { status: 500 }
    );
  }
}
