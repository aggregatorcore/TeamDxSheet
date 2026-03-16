"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatTimeTo12h, formatWeekOffDisplay, WEEK_DAYS } from "@/lib/shiftUtils";

type ShiftUser = {
  id: string;
  email: string;
  full_name: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  week_off_days: string | null;
  leaves: { id: string; leave_date: string; leave_type: string | null }[];
};

export default function ShiftsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ShiftUser[]>([]);
  const [editing, setEditing] = useState<ShiftUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ updated: number; totalWithCallback: number } | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ merged: number; invalidated: number } | null>(null);
  const [fixCallbackLoading, setFixCallbackLoading] = useState(false);
  const [fixCallbackResult, setFixCallbackResult] = useState<{ fixed: number; tokensUpdated: number; totalWithCallback: number } | null>(null);
  const [backfillTagsLoading, setBackfillTagsLoading] = useState(false);
  const [backfillTagsResult, setBackfillTagsResult] = useState<{ updated: number; totalWithCallback: number } | null>(null);

  const fetchShifts = async () => {
    const res = await fetch("/api/admin/shifts");
    if (res.status === 403) {
      router.push("/dashboard");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      await fetchShifts();
      setLoading(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchShifts stable, run once on mount
  }, [router]);

  const handleSaveShift = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const weekOff = editing.week_off_days ?? "";
      const res = await fetch("/api/admin/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editing.id,
          shift_start_time: editStartTime.trim() || null,
          shift_end_time: editEndTime.trim() || null,
          week_off_days: weekOff || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save");
        return;
      }
      setEditing(null);
      setEditStartTime("");
      setEditEndTime("");
      await fetchShifts();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (editing) {
      setEditStartTime(timeToInput(editing.shift_start_time));
      setEditEndTime(timeToInput(editing.shift_end_time));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sync form when editing user changes (by id)
  }, [editing?.id]);

  const toggleWeekDay = (dayValue: string) => {
    if (!editing) return;
    const current = (editing.week_off_days ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
    const set = new Set(current);
    if (set.has(dayValue)) set.delete(dayValue);
    else set.add(dayValue);
    setEditing({ ...editing, week_off_days: Array.from(set).join(",") });
  };

  const handleAddLeave = async () => {
    if (!editing || !leaveDate.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shifts/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editing.id, leave_date: leaveDate.trim(), leave_type: leaveType.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to add leave");
        return;
      }
      const added = await res.json();
      setEditing({ ...editing, leaves: [...editing.leaves, { id: added.id, leave_date: added.leave_date, leave_type: added.leave_type }] });
      setLeaveDate("");
      setLeaveType("");
      await fetchShifts();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLeave = async (leaveId: string) => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shifts/leaves?id=${encodeURIComponent(leaveId)}`, { method: "DELETE" });
      if (!res.ok) return;
      setEditing({ ...editing, leaves: editing.leaves.filter((l) => l.id !== leaveId) });
      await fetchShifts();
    } finally {
      setSaving(false);
    }
  };

  const handleBackfillTokens = async () => {
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/backfill-tokens", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setBackfillResult({ updated: data.updated ?? 0, totalWithCallback: data.totalWithCallback ?? 0 });
      else setError(data?.error ?? "Backfill failed");
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleMergeDuplicates = async () => {
    setMergeLoading(true);
    setMergeResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/merge-duplicate-leads", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMergeResult({ merged: data.merged ?? 0, invalidated: data.invalidated ?? 0 });
      else setError(data?.error ?? "Merge failed");
    } finally {
      setMergeLoading(false);
    }
  };

  const handleFixCallbackTimes = async () => {
    setFixCallbackLoading(true);
    setFixCallbackResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/fix-callback-times", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setFixCallbackResult({ fixed: data.fixed ?? 0, tokensUpdated: data.tokensUpdated ?? 0, totalWithCallback: data.totalWithCallback ?? 0 });
      else setError(data?.error ?? "Fix failed");
    } finally {
      setFixCallbackLoading(false);
    }
  };

  const handleBackfillCallbackTags = async () => {
    setBackfillTagsLoading(true);
    setBackfillTagsResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/backfill-callback-tags", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setBackfillTagsResult({ updated: data.updated ?? 0, totalWithCallback: data.totalWithCallback ?? 0 });
      else setError(data?.error ?? "Backfill failed");
    } finally {
      setBackfillTagsLoading(false);
    }
  };

  const timeToInput = (t: string | null | undefined): string => {
    if (!t) return "";
    const part = String(t).trim().slice(0, 5);
    return part || "";
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-xl font-semibold text-neutral-900">Shift Management</h1>
        <p className="text-sm text-neutral-600">Set shift time, week off, and leaves for each user. Users see only their own shift.</p>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
          <p className="mb-2 text-sm font-medium text-neutral-700">Token backfill</p>
          <p className="mb-3 text-xs text-neutral-600">Assign token (by time order) to all leads that have a callback/reminder time. Run once to backfill existing leads.</p>
          <button
            type="button"
            onClick={handleBackfillTokens}
            disabled={backfillLoading}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {backfillLoading ? "Running…" : "Backfill tokens"}
          </button>
          {backfillResult && (
            <p className="mt-2 text-xs text-neutral-600">
              Updated {backfillResult.updated} of {backfillResult.totalWithCallback} leads with callback time.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
          <p className="mb-2 text-sm font-medium text-neutral-700">Merge duplicate leads</p>
          <p className="mb-3 text-xs text-neutral-600">Mobile number = primary key. Finds all leads with same number (globally), keeps one per number (oldest), merges note and latest callback, marks rest invalid. Refresh My Leads / dashboard after running.</p>
          <button
            type="button"
            onClick={handleMergeDuplicates}
            disabled={mergeLoading}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {mergeLoading ? "Running…" : "Merge duplicates"}
          </button>
          {mergeResult && (
            <p className="mt-2 text-xs text-neutral-600">
              Merged {mergeResult.merged} group(s), invalidated {mergeResult.invalidated} duplicate(s). Refresh the Leads view to see the change.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
          <p className="mb-2 text-sm font-medium text-neutral-700">Fix callback times (shift-aware)</p>
          <p className="mb-3 text-xs text-neutral-600">Fix existing leads whose callback time is before shift start (e.g. 8:30 AM when shift is 9:30 AM). Clamps to shift start and re-runs token assignment.</p>
          <button
            type="button"
            onClick={handleFixCallbackTimes}
            disabled={fixCallbackLoading}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {fixCallbackLoading ? "Running…" : "Fix callback times"}
          </button>
          {fixCallbackResult && (
            <p className="mt-2 text-xs text-neutral-600">
              Fixed {fixCallbackResult.fixed} lead(s), updated tokens for {fixCallbackResult.tokensUpdated} of {fixCallbackResult.totalWithCallback}.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
          <p className="mb-2 text-sm font-medium text-neutral-700">Backfill callback tags</p>
          <p className="mb-3 text-xs text-neutral-600">Leads with callback time but empty or invalid tags get tag from note (or &quot;No Answer&quot;). Fixes &quot;—&quot; in callback card. Refresh My Leads after running.</p>
          <button
            type="button"
            onClick={handleBackfillCallbackTags}
            disabled={backfillTagsLoading}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {backfillTagsLoading ? "Running…" : "Backfill callback tags"}
          </button>
          {backfillTagsResult && (
            <p className="mt-2 text-xs text-neutral-600">
              Updated {backfillTagsResult.updated} of {backfillTagsResult.totalWithCallback} leads with callback time.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">Shift</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">Week off</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">Leaves</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      <div className="text-sm font-medium text-neutral-900">{u.full_name || "—"}</div>
                      <div className="text-xs text-neutral-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-neutral-700">
                      {u.shift_start_time && u.shift_end_time
                        ? `${formatTimeTo12h(u.shift_start_time)} – ${formatTimeTo12h(u.shift_end_time)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-neutral-700">{formatWeekOffDisplay(u.week_off_days) || "—"}</td>
                    <td className="px-4 py-2 text-sm text-neutral-700">
                      {u.leaves.length === 0 ? "—" : `${u.leaves.length} date(s)`}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setEditing(u)}
                        className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">No users. Create users from the Users page first.</p>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setEditing(null)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Edit shift</h2>
            <p className="mb-4 text-sm text-neutral-600">{editing.full_name || editing.email}</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Start time</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">End time</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Week off</label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((d) => {
                    const current = (editing.week_off_days ?? "").split(",").map((x) => x.trim().toLowerCase());
                    const checked = current.includes(d.value);
                    return (
                      <label key={d.value} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWeekDay(d.value)}
                          className="rounded border-neutral-300"
                        />
                        <span className="text-sm text-neutral-700">{d.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Leaves</label>
                <ul className="mb-2 max-h-32 overflow-y-auto rounded border border-neutral-200 bg-neutral-50 p-2 text-sm">
                  {editing.leaves.length === 0 ? (
                    <li className="text-neutral-500">No leaves</li>
                  ) : (
                    editing.leaves.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 py-0.5">
                        <span>{l.leave_date}{l.leave_type ? ` (${l.leave_type})` : ""}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLeave(l.id)}
                          disabled={saving}
                          className="rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Type (optional)"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddLeave}
                    disabled={saving || !leaveDate.trim()}
                    className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShift}
                disabled={saving}
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
