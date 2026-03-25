"use client";

import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmModal";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Trash2,
  Search,
  Sparkles,
  Clock3,
  Workflow,
  Bell,
  Mail,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();
  const confirm = useConfirm();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      load();
    }
  }, [authLoading, user]);

  async function load() {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      toast.error(error.message || "Failed to load logs");
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  async function deleteLog(id) {
    if (!user) return;

    const ok = await confirm({
      title: "Delete log",
      description: "Are you sure you want to delete this log?",
    });

    if (!ok) return;

    const previousLogs = logs;

    setLogs((prev) => prev.filter((l) => l.id !== id));

    const { error } = await supabase
      .from("logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setLogs(previousLogs);
      toast.error(error.message || "Failed to delete log");
      return;
    }

    toast.success("Log deleted");
  }

  async function clearLogs() {
    if (!user) return;

    const ok = await confirm({
      title: "Clear all logs",
      description: "Are you sure you want to clear all your logs?",
    });

    if (!ok) return;

    const previousLogs = logs;

    setLogs([]);

    const { error } = await supabase
      .from("logs")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      setLogs(previousLogs);
      toast.error(error.message || "Failed to clear logs");
      return;
    }

    toast.success("All logs cleared");
  }

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase();

    return logs.filter((log) => {
      const workflow = (log.workflow_name || "").toLowerCase();
      const client = (log.client_name || "").toLowerCase();
      const trigger = (log.trigger || "").toLowerCase();
      const time = (log.time_text || "").toLowerCase();

      return (
        workflow.includes(q) ||
        client.includes(q) ||
        trigger.includes(q) ||
        time.includes(q)
      );
    });
  }, [logs, search]);

  const stats = useMemo(() => {
    const total = logs.length;
    const today = new Date().toDateString();

    const todayCount = logs.filter(
      (log) => log.time_text && new Date(log.time_text).toDateString() === today
    ).length;

    return {
      total,
      today: todayCount,
    };
  }, [logs]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">
        Loading logs...
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
              Activity tracking
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Monitor workflow activity across your workspace.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Review what ran, when it ran, and what each workflow step produced.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <MiniStat label="Total logs" value={stats.total} />
            <MiniStat label="Today" value={stats.today} />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflow, client, trigger, or time"
              className="w-full rounded-2xl border border-white/5 bg-black/20 pl-10 pr-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-400">
              {filteredLogs.length} shown
            </div>

            <button
              onClick={clearLogs}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 hover:bg-red-500/15 transition"
            >
              <Trash2 size={15} />
              Clear all
            </button>
          </div>
        </div>
      </section>

      {filteredLogs.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-400">
            <Activity size={24} />
          </div>
          <div className="text-lg font-medium">No logs found</div>
          <div className="mt-2 text-sm text-zinc-500">
            Run a workflow or adjust your search to see activity here.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-black/20 px-3 py-1.5 text-xs text-zinc-300">
                      <Workflow size={13} />
                      {log.workflow_name || "Untitled workflow"}
                    </div>

                    <Badge tone="blue" label={log.trigger || "No trigger"} />
                  </div>

                  <div className="text-sm text-zinc-400 mb-2">
                    Client: {log.client_name || "No client"}
                  </div>

                  <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
                    <Clock3 size={13} />
                    {log.time_text || "-"}
                  </div>
                </div>

                <button
                  onClick={() => deleteLog(log.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/15 transition h-fit"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>

              {log.steps && log.steps.length > 0 && (
                <div className="mt-5 space-y-2">
                  <div className="text-sm font-medium text-zinc-300">
                    Step results
                  </div>

                  <div className="grid gap-2">
                    {log.steps.map((s, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 flex items-start gap-3"
                      >
                        <div className="mt-0.5 text-zinc-400">
                          {getStepIcon(s.type)}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm text-zinc-200">
                            {s.type || "Step"}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 break-words">
                            {s.result || "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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

function Badge({ label, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.05] text-zinc-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>
      {label}
    </span>
  );
}

function getStepIcon(type) {
  if (type === "Email") return <Mail size={15} />;
  if (type === "Notify") return <Bell size={15} />;
  if (type === "Trigger") return <Zap size={15} />;
  return <Workflow size={15} />;
}