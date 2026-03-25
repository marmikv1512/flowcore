"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  Settings,
  User,
  Shield,
  Database,
  Sparkles,
  CheckCircle2,
  Mail,
  Lock,
} from "lucide-react";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
    }
  }, [authLoading, user]);

  async function copyUserId() {
    if (!user?.id) {
      toast.error("No user ID found");
      return;
    }

    try {
      await navigator.clipboard.writeText(user.id);
      toast.success("User ID copied");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("copy user id error:", error);
      toast.error("Failed to copy user ID");
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%)] pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 mb-4">
              <Sparkles size={14} />
              Workspace settings
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Manage your Flowcore workspace and account details.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Review your account identity, security status, and environment
              setup.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <MiniStat label="Access" value="Authenticated" />
            <MiniStat label="Storage" value="Supabase" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300">
              <User size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold">Account</div>
              <div className="text-sm text-zinc-500">
                Basic workspace identity
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <InfoCard
              icon={<Mail size={15} />}
              label="Email"
              value={user?.email || "No email found"}
            />

            <InfoCard
              icon={<Lock size={15} />}
              label="User ID"
              value={user?.id || "No user id found"}
              action={
                <button
                  onClick={copyUserId}
                  className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 hover:bg-white/[0.06] transition"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              }
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold">Security</div>
              <div className="text-sm text-zinc-500">
                Per-user protection status
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <StatusRow label="Authentication" status="Enabled" good />
            <StatusRow label="Per-user data isolation" status="Active" good />
            <StatusRow label="RLS protection" status="Enabled" good />
            <StatusRow label="Session access" status="Working" good />
          </div>
        </section>

        <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300">
              <Database size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold">System</div>
              <div className="text-sm text-zinc-500">
                Current app architecture
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <SystemRow label="Frontend" value="Next.js" />
            <SystemRow label="Database" value="Supabase" />
            <SystemRow label="Hosting" value="Vercel" />
            <SystemRow label="Auth mode" value="Email + password" />
          </div>
        </section>

        <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300">
              <Settings size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold">Next upgrades</div>
              <div className="text-sm text-zinc-500">
                Best use of your next dev cycle
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <UpgradeRow text="Replace alert() with toast notifications" />
            <UpgradeRow text="Add edit client support" />
            <UpgradeRow text="Create real template management" />
            <UpgradeRow text="Add workflow execution backend later" />
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold truncate">{value}</div>
    </div>
  );
}

function InfoCard({ icon, label, value, action }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
          {icon}
          {label}
        </div>
        <div className="text-sm text-zinc-200 break-all">{value}</div>
      </div>
      {action}
    </div>
  );
}

function StatusRow({ label, status, good = false }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm text-zinc-300">{label}</div>
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
          good
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : "border-white/10 bg-white/[0.05] text-zinc-300"
        }`}
      >
        {good && <CheckCircle2 size={13} />}
        {status}
      </div>
    </div>
  );
}

function SystemRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-200">{value}</div>
    </div>
  );
}

function UpgradeRow({ text }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-300">
      {text}
    </div>
  );
}