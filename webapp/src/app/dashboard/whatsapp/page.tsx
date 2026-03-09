"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { openWhatsApp, getWaChatUrl } from "@/lib/whatsapp";

export default function WhatsAppPage() {
  const [loading, setLoading] = useState(true);
  const [phoneInput, setPhoneInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleOpenChat = () => {
    if (!phoneInput.trim()) return;
    openWhatsApp(getWaChatUrl(phoneInput.trim()));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">TeamDX Lead Manager</h1>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              Leads
            </Link>
            <span className="rounded bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800">
              WhatsApp
            </span>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="rounded bg-neutral-200 px-3 py-1.5 text-sm text-neutral-900 hover:bg-neutral-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl flex-1 p-6">
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">WhatsApp Desktop</h2>
              <p className="text-sm text-neutral-600">Number pe chat kholo - app khulegi</p>
            </div>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-sm font-medium text-neutral-700">Number pe chat kholo</h3>
              <p className="mb-3 text-sm text-neutral-600">
                Lead ka number yahan paste karo, WhatsApp Desktop app mein chat khul jayegi.
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOpenChat()}
                  className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <button
                  onClick={handleOpenChat}
                  disabled={!phoneInput.trim()}
                  className="rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:bg-neutral-300 disabled:text-neutral-500"
                >
                  Chat Kholo
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
