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

  type ProfileRow = {
    role?: string;
    full_name?: string | null;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
    week_off_days?: string | null;
  };
  const profileSelect = "role, full_name, shift_start_time, shift_end_time, week_off_days";
  let profile: ProfileRow | null = null;
  const adminClient = tryCreateAdminClient();
  if (adminClient) {
    const { data } = await adminClient
      .from("profiles")
      .select(profileSelect)
      .eq("id", user.id)
      .single();
    profile = data as ProfileRow | null;
  }
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("id", user.id)
      .single();
    profile = data as ProfileRow | null;
  }
  const roleFromProfile = profile?.role?.toLowerCase();
  const roleFromMeta =
    (user.app_metadata as { role?: string })?.role?.toLowerCase() ??
    (user.user_metadata as { role?: string })?.role?.toLowerCase();
  const isAdmin =
    roleFromProfile === "admin" ||
    roleFromMeta === "admin" ||
    isAdminEmail(user.email ?? undefined);

  const initialShift =
    profile && (profile.shift_start_time != null || profile.shift_end_time != null || profile.week_off_days != null)
      ? {
          shift_start_time: profile.shift_start_time ?? null,
          shift_end_time: profile.shift_end_time ?? null,
          week_off_days: profile.week_off_days ?? null,
        }
      : null;

  return (
    <DashboardShell
      isAdmin={isAdmin}
      userEmail={user.email ?? undefined}
      userName={profile?.full_name ?? undefined}
      initialShift={initialShift}
    >
      {children}
    </DashboardShell>
  );
}
