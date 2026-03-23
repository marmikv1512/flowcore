"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Workflow,
  Activity,
  PlayCircle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();

  const [clients, setClients] = useState(0);
  const [workflows, setWorkflows] = useState(0);
  const [logs, setLogs] = useState(0);
  const [todayRuns, setTodayRuns] = useState(0);
  const [activeWorkflows, setActiveWorkflows] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      refreshStats();
    }
  }, [authLoading, user]);

  async function refreshStats() {
    if (!user) return;

    setLoadingStats(true);

    const [
      { data: clientsData, error: clientsError },
      { data: workflowsData, error: workflowsError },
      { data: logsData, error: logsError },
      { count: logsCount, error: logsCountError },
    ] = await Promise.all([
      supabase.from("clients").select("id").eq("user_id", user.id),

      supabase
        .from("workflows")
        .select("id, is_active")
        .eq("user_id", user.id),

      supabase
        .from("logs")
        .select("id, workflow_name, client_name, trigger, time_text, steps")
        .eq("user_id", user.id)
        .order("id", { ascending: false })
        .limit(6),

      supabase
        .from("logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    if (clientsError || workflowsError || logsError || logsCountError) {
      console.error(
        clientsError || workflowsError || logsError || logsCountError
      );
      setLoadingStats(false);
      return;
    }

    const c = clientsData || [];
    const w = workflowsData || [];
    const l = logsData || [];

    setClients(c.length);
    setWorkflows(w.length);
    setLogs(logsCount || 0);
    setActiveWorkflows(w.filter((x) => x.is_active ?? true).length);
    setRecentLogs(l);

    const today = new Date().toDateString();

    const runsToday = l.filter(
      (x) => x.time_text && new Date(x.time_text).toDateString() === today
    ).length;

    setTodayRuns(runsToday);
    setLoadingStats(false);
  }

  const completionRate = useMemo(() => {
    if (!workflows) return 0;
    return Math.round((activeWorkflows / workflows) * 100);
  }, [workflows, activeWorkflows]);

  if (authLoading || loadingStats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">
        Loading dashboard...
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
              Flowcore control center
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Run your agency workflows without the messy ops.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Track clients, monitor workflow activity, and manage automation from
              one clean workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <MiniStat label="Account" value={user?.email || "-"} />
            <MiniStat label="Active rate" value={`${completionRate}%`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Clients"
          value={clients}
          icon={<Users size={18} />}
          subtext="Total managed accounts"
        />
        <MetricCard
          title="Workflows"
          value={workflows}
          icon={<Workflow size={18} />}
          subtext={`${activeWorkflows} currently active`}
        />
        <MetricCard
          title="Total Logs"
          value={logs}
          icon={<Activity size={18} />}
          subtext="Execution history stored"
        />
        <MetricCard
          title="Runs Today"
          value={todayRuns}
          icon={<PlayCircle size={18} />}
          subtext="Based on recent activity"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-lg font-semibold">Recent Activity</div>
              <div className="text-sm text-zinc-500">
                Latest workflow runs across your workspace
              </div>
            </div>

            <a
              href="/logs"
              className="text-sm text-zinc-300 hover:text-white inline-flex items-center gap-1"
            >
              View all
              <ArrowUpRight size={15} />
            </a>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-sm text-zinc-500 text-center">
                No recent activity yet.
              </div>
            )}

            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-white/5 bg-black/20 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {log.workflow_name || "Untitled workflow"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 truncate">
                      {log.client_name || "No client"}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-300">
                    {log.trigger || "No trigger"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-zinc-500 truncate">
                    {log.time_text || "-"}
                  </div>

                  <div className="text-xs text-zinc-400">
                    {(log.steps || []).length} steps
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="mb-5">
            <div className="text-lg font-semibold">Workspace Snapshot</div>
            <div className="text-sm text-zinc-500">
              Quick read on your current setup
            </div>
          </div>

          <div className="space-y-4">
            <SnapshotRow
              label="Client base"
              value={`${clients} total`}
              tone="neutral"
            />
            <SnapshotRow
              label="Workflow status"
              value={`${activeWorkflows}/${workflows || 0} active`}
              tone="green"
            />
            <SnapshotRow
              label="Automation activity"
              value={`${todayRuns} runs today`}
              tone="blue"
            />
            <SnapshotRow
              label="Log depth"
              value={`${logs} saved logs`}
              tone="purple"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="text-sm font-medium mb-1">What to do next</div>
            <div className="text-sm text-zinc-500">
              Tighten the templates page, polish the workflow builder, then make
              the workflows list feel premium.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, icon, subtext }) {
  return (
    <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm text-zinc-400">{title}</div>
        <div className="h-10 w-10 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300">
          {icon}
        </div>
      </div>

      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-sm text-zinc-500">{subtext}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 mb-1">
        {label}
      </div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}

function SnapshotRow({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "bg-white/5 text-zinc-300 border-white/5",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    purple: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>
        {value}
      </div>
    </div>
  );
}