"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "upload" | "distribute" | "advance";

interface ParsedLead {
  source: string;
  name: string;
  place: string;
  number: string;
}

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: "active" | "exited";
}

export default function LeadsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("upload");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; error?: string } | null>(null);
  const [validationStage, setValidationStage] = useState<"idle" | "validating" | "results">("idle");
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });
  const [validationResults, setValidationResults] = useState<{
    duplicatesInBatch: { number: string; count: number }[];
    existingInSystem: { number: string; assignedTo: string }[];
    validLeads: ParsedLead[];
  } | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [uploadSource, setUploadSource] = useState<"csv" | "sheet" | null>(null);
  const [poolLeads, setPoolLeads] = useState<{ id: string; source: string; name: string; number: string }[]>([]);
  const [distributeSelected, setDistributeSelected] = useState<string[]>([]);
  const [distributing, setDistributing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignMethod, setAssignMethod] = useState<"round-robin" | "direct">("round-robin");
  const [directAssignUser, setDirectAssignUser] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const admin = profile?.role === "admin";
      setIsAdmin(admin);
      if (!admin) {
        router.push("/dashboard");
        return;
      }
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: UserOption) => u.role === "telecaller" && u.status === "active"));
      }
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (isAdmin && tab === "distribute") {
      fetch("/api/leads/pool")
        .then((r) => r.json())
        .then((data) => setPoolLeads(Array.isArray(data) ? data : []))
        .catch(() => setPoolLeads([]));
    }
  }, [isAdmin, tab]);

  const parseCsv = (text: string): ParsedLead[] => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const sourceIdx = headers.findIndex((h) => h === "source" || h === "source_name");
    const nameIdx = headers.findIndex((h) => h === "name" || h === "customer" || h === "customer_name");
    const placeIdx = headers.findIndex((h) => h === "place" || h === "location" || h === "city");
    const numberIdx = headers.findIndex((h) => h === "number" || h === "phone" || h === "mobile" || h === "contact");

    const fallback = (arr: string[], i: number) => (i >= 0 ? arr[i]?.trim() ?? "" : "");
    const leads: ParsedLead[] = [];
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
    return leads;
  };

  const handleFetchFromSheet = async () => {
    if (!sheetUrl.trim()) return;
    setFetchingSheet(true);
    setParseError(null);
    setUploadResult(null);
    setParsedLeads([]);
    try {
      const res = await fetch("/api/leads/fetch-from-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setParseError(data?.error ?? "Failed to fetch from sheet");
        return;
      }
      setParsedLeads(data.leads ?? []);
      setUploadSource("sheet");
    } catch {
      setParseError("Failed to fetch from Google Sheet");
    } finally {
      setFetchingSheet(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCsvFile(null);
    setParsedLeads([]);
    setParseError(null);
    setUploadResult(null);
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setParseError("Please upload a CSV file");
      return;
    }
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const leads = parseCsv(text);
        setParsedLeads(leads);
        setUploadSource("csv");
        setParseError(leads.length === 0 ? "No valid leads found in CSV" : null);
      } catch {
        setParseError("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const normalizeNumber = (n: string) =>
    String(n ?? "").replace(/\s/g, "").split(",")[0].trim();

  const runValidation = async () => {
    if (parsedLeads.length === 0) return;
    setValidationStage("validating");
    setValidationResults(null);
    setValidationProgress({ current: 0, total: parsedLeads.length });

    const numbers = parsedLeads.map((l) => normalizeNumber(l.number)).filter(Boolean);
    const numberToLead = new Map<string, ParsedLead>();
    for (const l of parsedLeads) {
      const n = normalizeNumber(l.number);
      if (n && !numberToLead.has(n)) numberToLead.set(n, l);
    }

    const duplicateCount = new Map<string, number>();
    for (const n of numbers) {
      duplicateCount.set(n, (duplicateCount.get(n) ?? 0) + 1);
    }
    const duplicatesInBatch = [...duplicateCount.entries()]
      .filter(([, c]) => c > 1)
      .map(([number, count]) => ({ number, count }));

    const uniqueNumbers = [...new Set(numbers)];
    const CHUNK = 300;
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueNumbers.length; i += CHUNK) {
      chunks.push(uniqueNumbers.slice(i, i + CHUNK));
    }

    const allExisting: { number: string; assignedTo: string }[] = [];
    for (let i = 0; i < chunks.length; i++) {
      setValidationProgress({ current: Math.min((i + 1) * CHUNK, uniqueNumbers.length), total: uniqueNumbers.length });
      const res = await fetch("/api/leads/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: chunks[i] }),
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.existingInSystem)) {
        allExisting.push(...data.existingInSystem);
      }
    }

    const existingSet = new Set(allExisting.map((e) => e.number));
    const existingInSystem = [...existingSet].map((number) => ({
      number,
      assignedTo: allExisting.find((e) => e.number === number)?.assignedTo ?? "—",
    }));

    const validNumbers = uniqueNumbers.filter((n) => !existingSet.has(n));
    const validLeads = validNumbers
      .map((n) => numberToLead.get(n))
      .filter((l): l is ParsedLead => !!l);

    setValidationResults({
      duplicatesInBatch,
      existingInSystem,
      validLeads,
    });
    setValidationStage("results");
  };

  const handleUploadClick = () => {
    runValidation();
  };

  const handleUploadConfirm = async () => {
    const results = validationResults;
    if (!results || results.validLeads.length === 0) {
      setValidationStage("idle");
      setValidationResults(null);
      return;
    }
    setValidationStage("idle");
    setValidationResults(null);
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await fetch("/api/leads/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: results.validLeads,
          assignTo: ["pool"],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadResult({ inserted: 0, error: data?.error ?? "Upload failed" });
        return;
      }
      setUploadResult({ inserted: data?.inserted ?? results.validLeads.length });
      setParsedLeads([]);
      setUploadSource(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadResult({ inserted: 0, error: "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const getAssignToEmails = (): string[] => {
    if (assignMethod === "direct" && directAssignUser) return [directAssignUser];
    return selectedUserEmails;
  };

  const handleDistribute = async () => {
    const assignTo = getAssignToEmails();
    if (distributeSelected.length === 0 || assignTo.length === 0) return;
    setDistributing(true);
    try {
      const res = await fetch("/api/leads/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: distributeSelected,
          assignTo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDistributeSelected([]);
        setPoolLeads((prev) => prev.filter((l) => !distributeSelected.includes(l.id)));
        setShowAssignModal(false);
        setDirectAssignUser("");
      } else {
        alert(data?.error ?? "Distribution failed");
      }
    } catch {
      alert("Distribution failed");
    } finally {
      setDistributing(false);
    }
  };

  const toggleUser = (email: string) => {
    setSelectedUserEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const toggleDistributeLead = (id: string) => {
    setDistributeSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllPool = () => {
    if (distributeSelected.length === poolLeads.length) {
      setDistributeSelected([]);
    } else {
      setDistributeSelected(poolLeads.map((l) => l.id));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Leads Management</h2>
          <p className="text-sm text-neutral-500">Upload, distribute, and manage leads</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {(["upload", "distribute", "advance"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-all ${
                tab === t ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        {tab === "upload" && (
          <div className="space-y-6">
            <p className="text-xs text-neutral-500">
              Columns: source, name, place, number (or phone, mobile, contact)
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => { setUploadSource("csv"); triggerFileInput(); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 transition-all ${
                  uploadSource === "csv"
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                  <svg className="h-4 w-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-neutral-900">Upload CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadSource("sheet")}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 transition-all ${
                  uploadSource === "sheet"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100">
                  <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v7zm4 0h-2v-4h2v4z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-neutral-900">Fetch from Google Sheet</span>
              </button>

              {uploadSource === "sheet" && (
                <>
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="Paste Google Sheet URL..."
                    className="min-w-[240px] flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromSheet}
                    disabled={fetchingSheet || !sheetUrl.trim()}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {fetchingSheet ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Fetching…
                      </>
                    ) : (
                      "Fetch"
                    )}
                  </button>
                </>
              )}
            </div>

            {parsedLeads.length > 0 && (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                    Preview ({parsedLeads.length} leads)
                  </h3>
                  <div className="max-h-48 overflow-auto rounded border border-neutral-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-neutral-50">
                        <tr>
                          <th className="px-3 py-2 font-medium">Source</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Place</th>
                          <th className="px-3 py-2 font-medium">Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedLeads.slice(0, 10).map((l, i) => (
                          <tr key={i} className="border-t border-neutral-100">
                            <td className="px-3 py-1.5">{l.source}</td>
                            <td className="px-3 py-1.5">{l.name}</td>
                            <td className="px-3 py-1.5">{l.place}</td>
                            <td className="px-3 py-1.5">{l.number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedLeads.length > 10 && (
                      <p className="px-3 py-2 text-xs text-neutral-500">
                        +{parsedLeads.length - 10} more
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={uploading || validationStage === "validating"}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : validationStage === "validating" ? "Validating…" : "Upload to Pool"}
                  </button>
                  {uploadResult && (
                    <span
                      className={`text-sm ${uploadResult.error ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {uploadResult.error ?? `Inserted ${uploadResult.inserted} leads`}
                    </span>
                  )}
                </div>
              </>
            )}

            {parseError && <p className="text-sm text-red-600">{parseError}</p>}
          </div>
        )}

        {tab === "distribute" && (
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-neutral-800">Pool Leads</h3>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  disabled={distributeSelected.length === 0}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign ({distributeSelected.length})
                </button>
              </div>
              <p className="mb-3 text-xs text-neutral-500">
                Select leads, then click Assign to distribute.
              </p>
              {poolLeads.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-8 text-center text-sm text-neutral-500">
                  No leads in pool. Upload leads without assigning to add to pool.
                </p>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllPool}
                      className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
                    >
                      {distributeSelected.length === poolLeads.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-auto rounded border border-neutral-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-neutral-50">
                        <tr>
                          <th className="w-8 px-2 py-2" />
                          <th className="px-3 py-2 font-medium">Source</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poolLeads.map((l) => (
                          <tr
                            key={l.id}
                            className={`border-t border-neutral-100 ${distributeSelected.includes(l.id) ? "bg-blue-50" : ""}`}
                          >
                            <td className="px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={distributeSelected.includes(l.id)}
                                onChange={() => toggleDistributeLead(l.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-1.5">{l.source}</td>
                            <td className="px-3 py-1.5">{l.name}</td>
                            <td className="px-3 py-1.5">{l.number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {tab === "advance" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-800">Advance & Start</h3>
            <p className="text-sm text-neutral-500">
              Campaign start, bulk actions, and automation controls. Coming soon.
            </p>
            <div className="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
              <p className="text-sm text-neutral-500">Advance and start logic will be added here.</p>
            </div>
          </div>
        )}
      </div>

      {/* Assign Leads Modal */}
      {showAssignModal && distributeSelected.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Assign Leads</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-neutral-500">
              {distributeSelected.length} lead(s) selected. Choose assignment method.
            </p>

            <div className="mb-4 space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
                <input
                  type="radio"
                  name="assignMethod"
                  checked={assignMethod === "round-robin"}
                  onChange={() => setAssignMethod("round-robin")}
                  className="border-neutral-300"
                />
                <div>
                  <p className="font-medium text-neutral-900">Round Robin</p>
                  <p className="text-xs text-neutral-500">Distribute leads evenly among selected users</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
                <input
                  type="radio"
                  name="assignMethod"
                  checked={assignMethod === "direct"}
                  onChange={() => setAssignMethod("direct")}
                  className="border-neutral-300"
                />
                <div>
                  <p className="font-medium text-neutral-900">Direct Assign</p>
                  <p className="text-xs text-neutral-500">Assign all leads to one user</p>
                </div>
              </label>
            </div>

            {assignMethod === "round-robin" && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-neutral-800">Select users</p>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 hover:bg-neutral-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserEmails.includes(u.email)}
                        onChange={() => toggleUser(u.email)}
                        className="rounded border-neutral-300"
                      />
                      <span className="text-sm">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {assignMethod === "direct" && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-neutral-800">Select user</p>
                <select
                  value={directAssignUser}
                  onChange={(e) => setDirectAssignUser(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                >
                  <option value="">Choose user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDistribute}
                disabled={
                  distributing ||
                  (assignMethod === "round-robin" && selectedUserEmails.length === 0) ||
                  (assignMethod === "direct" && !directAssignUser)
                }
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {distributing ? "Distributing…" : "Distribute"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {(validationStage === "validating" || validationStage === "results") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => validationStage === "results" && setValidationStage("idle")}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {validationStage === "validating" && (
              <>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Validating leads</h3>
                <p className="mb-4 text-sm text-neutral-600">
                  Checking {validationProgress.current} of {validationProgress.total} numbers…
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-300"
                    style={{
                      width: `${validationProgress.total > 0 ? (validationProgress.current / validationProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "300ms" }} />
                </div>
              </>
            )}

            {validationStage === "results" && validationResults && (
              <>
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Validation Results</h3>

                {validationResults.duplicatesInBatch.length > 0 && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-2 text-sm font-medium text-amber-800">
                      Duplicates in upload: {validationResults.duplicatesInBatch.length} number(s)
                    </p>
                    <div className="max-h-24 overflow-auto text-xs text-amber-700">
                      {validationResults.duplicatesInBatch.map((d) => (
                        <div key={d.number}>
                          {d.number} — appears {d.count} times
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationResults.existingInSystem.length > 0 && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="mb-2 text-sm font-medium text-red-800">
                      Already in system: {validationResults.existingInSystem.length} number(s)
                    </p>
                    <div className="max-h-32 overflow-auto text-xs text-red-700">
                      {validationResults.existingInSystem.map((e) => (
                        <div key={e.number}>
                          {e.number} — assigned to {e.assignedTo}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-800">
                    Ready to upload: {validationResults.validLeads.length} lead(s)
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setValidationStage("idle"); setValidationResults(null); }}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadConfirm}
                    disabled={validationResults.validLeads.length === 0}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Upload {validationResults.validLeads.length} leads
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
