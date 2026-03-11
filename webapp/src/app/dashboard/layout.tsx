import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

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
