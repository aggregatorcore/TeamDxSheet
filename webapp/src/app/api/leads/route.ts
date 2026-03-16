import { getSupabaseAndUserFromRequest } from "@/lib/supabase/apiAuth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adjustCallbackTimeToShift } from "@/lib/callbackShiftAdjust";
import { resolveSlotAndToken } from "@/lib/tokenSlot";
import {
  getLeadsForUser,
  getLeadsForUserAsAdmin,
  getLeadsForUserAsAdminByBucket,
  getLeadByAssignedAndNumber,
  getLeadByNumber,
  updateLead,
  markLeadInvalid,
  markLeadHiddenForAdmin,
  markLeadForReview,
  markLeadDocumentReceived,
  markLeadNewAssigned,
  getInvalidLeadsForAdmin,
  getReviewLeadsForAdmin,
  getNewAssignedLeadsForAdmin,
  getGreenBucketLeads,
  deleteLead,
  getTelecallerLeadStats,
} from "@/lib/db";
import { TAG_OPTIONS } from "@/types/lead";
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
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 401 });
    }

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
    const bucket = searchParams.get("bucket") as "green" | "review" | "exhaust" | "new_assigned" | null;
    if (admin && bucket === "new_assigned") {
      const leads = await getNewAssignedLeadsForAdmin();
      return NextResponse.json(leads);
    }
    if (assignedTo) {
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
      const leads = await getGreenBucketLeads(userEmail, supabase);
      return NextResponse.json(leads);
    }

    const leads = await getLeadsForUser(userEmail, supabase);
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
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(user.id, supabase);
    const body = await request.json();
    const { source, name, place, number, assignedTo } = body;

    // Only admins can assign leads to others; telecallers always get their own email
    const assigned_to = userIsAdmin ? (assignedTo ?? userEmail) : userEmail;

    // Global: mobile number = primary key. One lead per number in the system; merge into existing if number exists.
    const existing = await getLeadByNumber(number ?? "");
    if (existing) {
      const updates: Parameters<typeof updateLead>[1] = {};
      if (source !== undefined) updates.source = String(source ?? "").trim() || existing.source;
      if (name !== undefined) updates.name = String(name ?? "").trim() || existing.name;
      if (place !== undefined) updates.place = String(place ?? "").trim() || existing.place;
      const mergedNote = existing.note ? `${existing.note} | Merged` : "Merged";
      updates.note = mergedNote;
      const adminClient = createAdminClient();
      await updateLead(existing.id, updates, userEmail, adminClient);
      return NextResponse.json({ id: existing.id, merged: true });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        source: source ?? "",
        name: name ?? "",
        place: place ?? "",
        number: number ?? "",
        assigned_to,
        flow: "Not Connected",
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
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 401 });
    }

    const body = await request.json();
    const { id, flow, tags, note, category, moveToAdmin, moveToAdminWithTag, moveToReview, moveToGreenBucket, moveToNewAssigned } = body;

    // Ownership check for admin actions (markLeadInvalid/ForReview/Hidden use adminClient, bypass RLS)
    const verifyOwnership = async (leadId: string) => {
      const { data } = await supabase.from("leads").select("id").eq("id", leadId).single();
      return !!data; // RLS: only returns row if assigned_to = user.email
    };

    if (moveToGreenBucket && id && note) {
      await markLeadDocumentReceived(id, note, userEmail, supabase);
      return NextResponse.json({ ok: true });
    }

    if (moveToAdmin && id) {
      if (!(await verifyOwnership(id))) {
        return NextResponse.json({ error: "Forbidden - Lead not assigned to you" }, { status: 403 });
      }
      await markLeadInvalid(id, userEmail);
      return NextResponse.json({ ok: true });
    }

    if (moveToReview && id && tags && note) {
      if (!(await verifyOwnership(id))) {
        return NextResponse.json({ error: "Forbidden - Lead not assigned to you" }, { status: 403 });
      }
      await markLeadForReview(id, tags, note, userEmail);
      return NextResponse.json({ ok: true });
    }

    if (moveToAdminWithTag && id && tags) {
      if (!(await verifyOwnership(id))) {
        return NextResponse.json({ error: "Forbidden - Lead not assigned to you" }, { status: 403 });
      }
      await markLeadHiddenForAdmin(id, tags, userEmail, body.note);
      return NextResponse.json({ ok: true });
    }

    if (moveToNewAssigned && id) {
      if (!(await verifyOwnership(id))) {
        return NextResponse.json({ error: "Forbidden - Lead not assigned to you" }, { status: 403 });
      }
      await markLeadNewAssigned(id, body.note, supabase);
      return NextResponse.json({ ok: true });
    }

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    // Global: only Connected | Not Connected
    if (flow !== undefined) {
      if (flow !== "Connected" && flow !== "Not Connected") {
        return NextResponse.json({ error: "flow must be Connected or Not Connected" }, { status: 400 });
      }
      updates.flow = flow;
    }
    // Global: tags must be one of TAG_OPTIONS or empty
    if (tags !== undefined) {
      if (tags !== "" && !TAG_OPTIONS.includes(tags)) {
        return NextResponse.json(
          { error: `tags must be one of: ${TAG_OPTIONS.join(", ")} or empty` },
          { status: 400 }
        );
      }
      updates.tags = tags;
    }
    if (note !== undefined) updates.note = note;
    if (category !== undefined) updates.category = category;
    if (body.name !== undefined) updates.name = body.name;
    if (body.place !== undefined) updates.place = body.place;
    if (body.number !== undefined) {
      const existing = await getLeadByNumber(body.number as string);
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "This number is already used by another lead. Mobile number is the primary key; one lead per number." },
          { status: 409 }
        );
      }
      updates.number = body.number;
    }
    if (body.callbackTime !== undefined) {
      // Auto / manual schedule: always apply shift first, then token, then save. Order guaranteed.
      let callbackTimeToSave = body.callbackTime as string;
      const [profileRes, leavesRes] = await Promise.all([
        supabase.from("profiles").select("shift_start_time, shift_end_time, week_off_days").eq("id", user.id).single(),
        supabase.from("user_leaves").select("leave_date").eq("user_id", user.id),
      ]);
      const profile = profileRes.data as { shift_start_time?: string | null; shift_end_time?: string | null; week_off_days?: string | null } | null;
      const leaves = (leavesRes.data ?? []) as { leave_date: string }[];
      const leaveDates = leaves.map((r) => r.leave_date);
      // 1. Shift: adjust to shift window, week-off, leave, overnight (e.g. 22:00–04:00)
      if (profile?.shift_start_time != null && profile?.shift_end_time != null) {
        callbackTimeToSave = adjustCallbackTimeToShift({
          requestedCallbackTimeISO: callbackTimeToSave,
          shiftStart: profile.shift_start_time,
          shiftEnd: profile.shift_end_time,
          weekOffDays: profile.week_off_days ?? null,
          leaveDates,
        });
      }
      // 2. Token: resolve 5-min slot and token per user per date
      const { callbackTime: resolvedTime, token: resolvedToken } = await resolveSlotAndToken({
        assignedTo: userEmail,
        proposedCallbackTimeISO: callbackTimeToSave,
        excludeLeadId: id,
        supabase,
      });
      updates.callbackTime = resolvedTime;
      updates.token = resolvedToken;
    }
    if (body.whatsappFollowupStartedAt !== undefined)
      updates.whatsappFollowupStartedAt = body.whatsappFollowupStartedAt;

    await updateLead(id, updates as Parameters<typeof updateLead>[1], userEmail, supabase);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update lead";
    console.error("PATCH /api/leads error:", err);
    const hint = /is_document_received|column.*does not exist/i.test(msg)
      ? " Run: ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_document_received boolean DEFAULT false;"
      : /is_in_review|column.*does not exist/i.test(msg)
        ? " Run: ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_in_review boolean DEFAULT false;"
        : /is_new_assigned|column.*does not exist/i.test(msg)
          ? " Run: ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_new_assigned boolean DEFAULT false;"
          : /token|column.*does not exist/i.test(msg)
            ? " Run migration: 010_leads_token.sql (ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS token text;)"
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
