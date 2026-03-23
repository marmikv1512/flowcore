"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!authLoading && user) {
      refreshStats();

      const interval = setInterval(async () => {
        const { data: workflowsData, error: workflowsError } = await supabase
          .from("workflows")
          .select("*");

        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*");

        if (workflowsError || clientsError) {
          console.error(workflowsError || clientsError);
          return;
        }

        for (const w of workflowsData || []) {
          if (!(w.is_active ?? true)) continue;
          if (!w.trigger) continue;
          if (w.trigger === "Manual") continue;

          if (w.trigger === "Time Schedule") {
            const { data: stepsData, error: stepsError } = await supabase
              .from("workflow_steps")
              .select("*")
              .eq("workflow_id", w.id)
              .order("step_order", { ascending: true });

            if (stepsError) {
              console.error(stepsError);
              continue;
            }

            const log = {
              workflow_name: w.name,
              client_name:
                clientsData.find((c) => c.id == w.client_id)?.name || "No client",
              trigger: w.trigger,
              time_text: new Date().toLocaleString(),
              steps: (stepsData || []).map((s) => ({
                type: s.type,
                result: `${s.type} executed`,
              })),
              user_id: user.id,
            };

            await supabase.from("logs").insert([log]);

            await supabase
              .from("workflows")
              .update({ run_count: (w.run_count || 0) + 1 })
              .eq("id", w.id);
          }
        }

        refreshStats();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [authLoading, user]);

  async function refreshStats() {
    const [
      { data: clientsData, error: clientsError },
      { data: workflowsData, error: workflowsError },
      { data: logsData, error: logsError },
    ] = await Promise.all([
      supabase.from("clients").select("id"),
      supabase.from("workflows").select("id, is_active"),
      supabase.from("logs").select("*").order("id", { ascending: false }),
    ]);

    if (clientsError || workflowsError || logsError) {
      console.error(clientsError || workflowsError || logsError);
      return;
    }

    const c = clientsData || [];
    const w = workflowsData || [];
    const l = logsData || [];

    setClients(c.length);
    setWorkflows(w.length);
    setLogs(l.length);
    setActiveWorkflows(w.filter((x) => x.is_active ?? true).length);
    setRecentLogs(l.slice(0, 5));

    const today = new Date().toDateString();

    const runsToday = l.filter(
      (x) => x.time_text && new Date(x.time_text).toDateString() === today
    ).length;

    setTodayRuns(runsToday);
  }

  function Card({ title, value }) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
        <div className="text-zinc-400 text-sm mb-1">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
    );
  }

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="text-2xl mb-6">Dashboard</div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <Card title="Clients" value={clients} />
        <Card title="Workflows" value={workflows} />
        <Card title="Active" value={activeWorkflows} />
        <Card title="Total Runs" value={logs} />
        <Card title="Runs Today" value={todayRuns} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
        <div className="text-lg mb-4">Recent Activity</div>

        <div className="flex flex-col gap-3">
          {recentLogs.length === 0 && (
            <div className="text-zinc-400 text-sm">No recent activity</div>
          )}

          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="border border-zinc-800 rounded p-3"
            >
              <div className="text-sm">{log.workflow_name}</div>
              <div className="text-xs text-zinc-400">{log.client_name}</div>
              <div className="text-xs text-blue-400">{log.trigger}</div>
              <div className="text-xs text-zinc-500">{log.time_text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}