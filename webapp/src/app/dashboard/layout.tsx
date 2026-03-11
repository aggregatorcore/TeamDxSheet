import { redirect } from "next/navigation";
import { createClient, tryCreateAdminClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";

/** Comma-separated emails treated as admin when profile read fails (e.g. RLS). */
const ADMIN_EMAILS_OVERRIDE = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  : [];

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS_OVERRIDE.includes(email.toLowerCase());
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  let profile: { role?: string; full_name?: string | null } | null = null;
  const adminClient = tryCreateAdminClient();
  if (adminClient) {
    const { data } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }
  const roleFromProfile = profile?.role?.toLowerCase();
  const roleFromMeta =
    (user.app_metadata as { role?: string })?.role?.toLowerCase() ??
    (user.user_metadata as { role?: string })?.role?.toLowerCase();
  const isAdmin =
    roleFromProfile === "admin" ||
    roleFromMeta === "admin" ||
    isAdminEmail(user.email ?? undefined);

  return (
    <DashboardShell
      isAdmin={isAdmin}
      userEmail={user.email ?? undefined}
      userName={profile?.full_name ?? undefined}
    >
      {children}
    </DashboardShell>
  );
}
