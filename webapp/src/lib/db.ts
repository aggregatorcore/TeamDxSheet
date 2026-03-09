import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Lead, LeadCategory } from "@/types/lead";

function dbRowToLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id ?? ""),
    rowIndex: 0,
    source: String(row.source ?? ""),
    name: String(row.name ?? ""),
    place: String(row.place ?? ""),
    number: String(row.number ?? ""),
    flow: (row.flow as Lead["flow"]) || "Select",
    tags: (row.tags as Lead["tags"]) || "",
    note: row.note ? String(row.note) : undefined,
    callbackTime: row.callback_time
      ? new Date(row.callback_time as string).toISOString()
      : "",
    whatsappFollowupStartedAt: row.whatsapp_followup_started_at
      ? new Date(row.whatsapp_followup_started_at as string).toISOString()
      : undefined,
    assignedTo: String(row.assigned_to ?? ""),
    category: (row.category as LeadCategory) || "active",
  };
}

const WHATSAPP_FOLLOWUP_MAX_DAYS = 2;

export async function getLeadsForUser(userEmail: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", userEmail)
    .eq("is_invalid", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Filter out review leads (column may not exist in older DBs)
  const notInReview = (data ?? []).filter((row) => !row.is_in_review);
  // Filter out document received (green bucket) leads (column may not exist in older DBs)
  const notDocumentReceived = notInReview.filter((row) => !row.is_document_received);

  const now = Date.now();
  const twoDaysMs = WHATSAPP_FOLLOWUP_MAX_DAYS * 24 * 60 * 60 * 1000;
  const toHide: string[] = [];
  const filtered = notDocumentReceived.filter((row) => {
    if (row.tags === "WhatsApp No Reply" && row.whatsapp_followup_started_at) {
      const started = new Date(row.whatsapp_followup_started_at as string).getTime();
      if (now - started >= twoDaysMs) {
        toHide.push(String(row.id));
        return false;
      }
    }
    return true;
  });

  if (toHide.length > 0) {
    await supabase
      .from("leads")
      .update({ is_invalid: true })
      .in("id", toHide);
  }

  return filtered.map((row, i) => ({
    ...dbRowToLead(row),
    rowIndex: i + 1,
  }));
}

export async function updateLead(
  id: string,
  updates: Partial<Lead>,
  _userEmail: string
): Promise<void> {
  const supabase = await createClient();
  const body: Record<string, unknown> = {};
  if (updates.flow !== undefined) body.flow = updates.flow;
  if (updates.tags !== undefined) body.tags = updates.tags;
  if (updates.note !== undefined) body.note = updates.note;
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.place !== undefined) body.place = updates.place;
  if (updates.category !== undefined) body.category = updates.category;
  if (updates.number !== undefined) body.number = updates.number;
  if (updates.callbackTime !== undefined)
    body.callback_time = updates.callbackTime ? new Date(updates.callbackTime) : null;
  if (updates.whatsappFollowupStartedAt !== undefined)
    body.whatsapp_followup_started_at = updates.whatsappFollowupStartedAt
      ? new Date(updates.whatsappFollowupStartedAt)
      : null;
  if ((updates as { isInvalid?: boolean }).isInvalid !== undefined)
    body.is_invalid = (updates as { isInvalid?: boolean }).isInvalid;
  if (updates.assignedTo !== undefined) body.assigned_to = updates.assignedTo;

  const { error } = await supabase.from("leads").update(body).eq("id", id);
  if (error) throw error;
}

export async function markLeadInvalid(id: string, _userEmail: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({ is_invalid: true, tags: "Invalid Number", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markLeadForReview(
  id: string,
  tags: string,
  note: string,
  _userEmail: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({
      is_in_review: true,
      tags,
      note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function markLeadHiddenForAdmin(
  id: string,
  tags: string,
  _userEmail: string,
  note?: string
): Promise<void> {
  const supabase = createAdminClient();
  const body: Record<string, unknown> = {
    is_invalid: true,
    tags,
    updated_at: new Date().toISOString(),
  };
  if (note !== undefined) body.note = note;
  const { error } = await supabase.from("leads").update(body).eq("id", id);
  if (error) throw error;
}

export async function scheduleCallback(
  id: string,
  callbackTime: string,
  userEmail: string
): Promise<void> {
  await updateLead(id, { callbackTime, category: "callback" }, userEmail);
}

export async function markOverdue(id: string, userEmail: string): Promise<void> {
  await updateLead(id, { category: "overdue" }, userEmail);
}

export async function getInvalidLeadsForAdmin(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("is_invalid", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row, i) => ({
    ...dbRowToLead(row),
    rowIndex: i + 1,
  }));
}

export async function getReviewLeadsForAdmin(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("is_in_review", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row, i) => ({
    ...dbRowToLead(row),
    rowIndex: i + 1,
  }));
}

export async function markLeadDocumentReceived(
  id: string,
  note: string,
  _userEmail: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      is_document_received: true,
      note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function getGreenBucketLeads(userEmail: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", userEmail)
    .eq("is_document_received", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row, i) => ({
    ...dbRowToLead(row),
    rowIndex: i + 1,
  }));
}
