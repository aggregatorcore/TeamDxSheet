import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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

export async function getLeadsForUser(
  userEmail: string,
  client?: SupabaseClient
): Promise<Lead[]> {
  const supabase = client ?? (await createClient());
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
  _userEmail: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient());
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
  userEmail: string,
  client?: SupabaseClient
): Promise<void> {
  await updateLead(id, { callbackTime, category: "callback" }, userEmail, client);
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
  _userEmail: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient());
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

export async function getGreenBucketLeads(
  userEmail: string,
  client?: SupabaseClient
): Promise<Lead[]> {
  const supabase = client ?? (await createClient());
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

/** Delete a lead by id. Admin only – uses service role. */
export async function deleteLead(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

/** Delete all leads. Admin only – uses service role. */
export async function deleteAllLeads(): Promise<number> {
  const supabase = createAdminClient();
  const batch = 500;
  let totalDeleted = 0;
  for (;;) {
    const { data: rows, error: fetchErr } = await supabase
      .from("leads")
      .select("id")
      .limit(batch);
    if (fetchErr) throw fetchErr;
    if (!rows?.length) break;
    const ids = rows.map((r) => r.id);
    const { error: deleteErr } = await supabase.from("leads").delete().in("id", ids);
    if (deleteErr) throw deleteErr;
    totalDeleted += ids.length;
    if (ids.length < batch) break;
  }
  return totalDeleted;
}

export type TelecallerStats = {
  email: string;
  work: number;
  green: number;
  exhaust: number;
  review: number;
};

/** Get work leads for a telecaller (admin view only, read-only). */
export async function getLeadsForUserAsAdmin(userEmail: string): Promise<Lead[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", userEmail)
    .eq("is_invalid", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const notInReview = (data ?? []).filter((row) => !row.is_in_review);
  const notDocumentReceived = notInReview.filter((row) => !row.is_document_received);
  const now = Date.now();
  const twoDaysMs = WHATSAPP_FOLLOWUP_MAX_DAYS * 24 * 60 * 60 * 1000;
  const filtered = notDocumentReceived.filter((row) => {
    if (row.tags === "WhatsApp No Reply" && row.whatsapp_followup_started_at) {
      const started = new Date(row.whatsapp_followup_started_at as string).getTime();
      if (now - started >= twoDaysMs) return false;
    }
    return true;
  });

  return filtered.map((row, i) => ({
    ...dbRowToLead(row),
    rowIndex: i + 1,
  }));
}

/** Get telecaller's bucket leads (admin view only). bucket: green | review | exhaust */
export async function getLeadsForUserAsAdminByBucket(
  userEmail: string,
  bucket: "green" | "review" | "exhaust"
): Promise<Lead[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", userEmail)
    .order("updated_at", { ascending: false });
  if (bucket === "green") {
    query = query.eq("is_document_received", true);
  } else if (bucket === "review") {
    query = query.eq("is_in_review", true);
  } else {
    query = query.eq("is_invalid", true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row, i) => ({
    ...dbRowToLead(row),
    rowIndex: i + 1,
  }));
}

/** Get lead counts per assigned_to (telecaller). Admin only. */
export async function getTelecallerLeadStats(): Promise<TelecallerStats[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("assigned_to, is_invalid, is_in_review, is_document_received");

  if (error) throw error;

  const byEmail = new Map<
    string,
    { work: number; green: number; exhaust: number; review: number }
  >();

  for (const row of data ?? []) {
    const email = String(row.assigned_to ?? "").trim() || "(unassigned)";
    const inv = !!row.is_invalid;
    const rev = !!row.is_in_review;
    const doc = !!row.is_document_received;

    if (!byEmail.has(email)) {
      byEmail.set(email, { work: 0, green: 0, exhaust: 0, review: 0 });
    }
    const c = byEmail.get(email)!;
    if (inv) c.exhaust++;
    else if (rev) c.review++;
    else if (doc) c.green++;
    else c.work++;
  }

  return Array.from(byEmail.entries())
    .map(([email, counts]) => ({
      email,
      ...counts,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}
