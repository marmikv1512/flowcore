"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Play,
  Pencil,
  Copy,
  Trash2,
  Power,
  FolderKanban,
  Sparkles,
  ChevronRight,
  Files,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();

  const [workflows, setWorkflows] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      loadAll();
    }
  }, [authLoading, user]);

  async function loadAll() {
    if (!user) return;

    setLoading(true);

    const [
      { data: workflowsData, error: workflowsError },
      { data: clientsData, error: clientsError },
    ] = await Promise.all([
      supabase
        .from("workflows")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false }),

      supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false }),
    ]);

    setLoading(false);

    if (workflowsError) {
      console.error("load workflows error:", workflowsError);
      alert(workflowsError.message);
      return;
    }

    if (clientsError) {
      console.error("load clients error:", clientsError);
      alert(clientsError.message);
      return;
    }

    setWorkflows(workflowsData || []);
    setClients(clientsData || []);
  }

  function getClientName(id) {
    const c = clients.find((c) => c.id == id);
    return c ? c.name : "No client";
  }

  async function deleteWorkflow(id) {
    if (!user) return;

    const yes = window.confirm("Delete this workflow?");
    if (!yes) return;

    const { error } = await supabase
      .from("workflows")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("delete workflow error:", error);
      alert(error.message);
      return;
    }

    loadAll();
  }

  async function duplicateWorkflow(id) {
    if (!user) return;

    const { data: originalWorkflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (workflowError) {
      console.error(workflowError);
      alert(workflowError.message);
      return;
    }

    const { data: originalSteps, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", id)
      .eq("user_id", user.id)
      .order("step_order", { ascending: true });

    if (stepsError) {
      console.error(stepsError);
      alert(stepsError.message);
      return;
    }

    const { data: newWorkflow, error: insertWorkflowError } = await supabase
      .from("workflows")
      .insert([
        {
          name: `${originalWorkflow.name} copy`,
          client_id: originalWorkflow.client_id,
          trigger: originalWorkflow.trigger,
          is_active: originalWorkflow.is_active,
          run_count: 0,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (insertWorkflowError) {
      console.error(insertWorkflowError);
      alert(insertWorkflowError.message);
      return;
    }

    if (originalSteps?.length) {
      const copiedSteps = originalSteps.map((s) => ({
        workflow_id: newWorkflow.id,
        type: s.type,
        step_order: s.step_order,
        config: s.config || {},
        user_id: user.id,
      }));

      const { error: insertStepsError } = await supabase
        .from("workflow_steps")
        .insert(copiedSteps);

      if (insertStepsError) {
        console.error(insertStepsError);
        alert(insertStepsError.message);
        return;
      }
    }

    loadAll();
  }

  async function toggleWorkflowStatus(id, currentValue) {
    if (!user) return;

    const { error } = await supabase
      .from("workflows")
      .update({ is_active: !currentValue })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadAll();
  }

  function startRename(w) {
    setRenameId(w.id);
    setRenameValue(w.name || "");
  }

  async function saveRename(id) {
    if (!user) return;

    const { error } = await supabase
      .from("workflows")
      .update({ name: renameValue || "Untitled workflow" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setRenameId(null);
    setRenameValue("");
    loadAll();
  }

  async function saveAsTemplate(w) {
    if (!user) return;

    const { data: stepsData, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", w.id)
      .eq("user_id", user.id)
      .order("step_order", { ascending: true });

    if (stepsError) {
      console.error(stepsError);
      alert(stepsError.message);
      return;
    }

    const simplifiedSteps = (stepsData || []).map((s) => ({
      type: s.type,
      config: s.config || {},
      step_order: s.step_order,
    }));

    const { error } = await supabase.from("templates").insert([
      {
        name: `${w.name} template`,
        trigger: w.trigger || "Manual",
        steps: simplifiedSteps,
        user_id: user.id,
      },
    ]);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Saved as template");
  }

  async function runWorkflow(w) {
    if (!user) return;

    setRunningId(w.id);

    const { data: stepsData, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", w.id)
      .eq("user_id", user.id)
      .order("step_order", { ascending: true });

    if (stepsError) {
      setRunningId(null);
      console.error(stepsError);
      alert(stepsError.message);
      return;
    }

    const clientName = getClientName(w.client_id);

    const mainLog = {
      workflow_name: w.name,
      client_name: clientName,
      trigger: w.trigger || "Manual",
      time_text: new Date().toISOString(),
      steps: [],
      user_id: user.id,
    };

    (stepsData || []).forEach((s) => {
      let result = "";

      if (s.type === "Task") {
        result = `Task created: ${s.config?.taskName || "Untitled task"}`;
      }

      if (s.type === "Email") {
        result = `Email sent: ${s.config?.subject || "No subject"}`;
      }

      if (s.type === "Notify") {
        result = `Notification sent: ${s.config?.message || "No message"}`;
      }

      if (s.type === "Trigger") {
        result = "Triggered by workflow trigger";
      }

      mainLog.steps.push({
        type: s.type,
        result,
      });
    });

    const { error: logError } = await supabase.from("logs").insert([mainLog]);

    if (logError) {
      setRunningId(null);
      console.error(logError);
      alert(logError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("workflows")
      .update({ run_count: (w.run_count || 0) + 1 })
      .eq("id", w.id)
      .eq("user_id", user.id);

    setRunningId(null);

    if (updateError) {
      console.error(updateError);
      alert(updateError.message);
      return;
    }

    loadAll();
    alert("Workflow executed");
  }

  const filtered = useMemo(() => {
    return workflows.filter((w) => {
      const clientName = getClientName(w.client_id).toLowerCase();
      const workflowName = (w.name || "").toLowerCase();
      const trigger = (w.trigger || "").toLowerCase();
      const q = search.toLowerCase();

      return (
        workflowName.includes(q) ||
        clientName.includes(q) ||
        trigger.includes(q)
      );
    });
  }, [workflows, clients, search]);

  const stats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((w) => w.is_active ?? true).length;
    const totalRuns = workflows.reduce((sum, w) => sum + (w.run_count || 0), 0);

    return { total, active, totalRuns };
  }, [workflows]);

  if (authLoading) {
    return <div className="text-zinc-400">Loading...</div>;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%)] pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 mb-4">
              <Sparkles size={14} />
              Workflow control
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Build, run, copy, and manage your agency workflows.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              This is the core of Flowcore. If this page feels premium, the
              product feels premium.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-[280px]">
            <MiniStat label="Total" value={stats.total} />
            <MiniStat label="Active" value={stats.active} />
            <MiniStat label="Runs" value={stats.totalRuns} />
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
              placeholder="Search workflow, client, or trigger"
              className="w-full rounded-2xl border border-white/5 bg-black/20 pl-10 pr-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-400">
              {filtered.length} shown
            </div>

            <Link
              href="/workflows/builder"
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-4 py-3 text-sm font-medium hover:opacity-90 transition"
            >
              <Plus size={16} />
              Create workflow
            </Link>
          </div>
        </div>
      </section>

      {loading && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-sm text-zinc-400">
          Loading workflows...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-400">
            <FolderKanban size={24} />
          </div>
          <div className="text-lg font-medium">No workflows yet</div>
          <div className="mt-2 text-sm text-zinc-500">
            Create your first workflow and start automating client ops.
          </div>
          <Link
            href="/workflows/builder"
            className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-4 py-3 text-sm font-medium hover:opacity-90 transition mt-6"
          >
            <Plus size={16} />
            Create workflow
          </Link>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((w) => {
          const active = w.is_active ?? true;

          return (
            <div
              key={w.id}
              className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0 flex-1">
                  {renameId === w.id ? (
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm outline-none"
                        placeholder="Workflow name"
                      />

                      <button
                        onClick={() => saveRename(w.id)}
                        className="rounded-2xl bg-white text-black px-4 py-3 text-sm font-medium"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-xl font-semibold tracking-tight">
                        {w.name || "Untitled workflow"}
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          active
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.05] text-zinc-400"
                        }`}
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaChip label={getClientName(w.client_id)} />
                    <MetaChip label={`Trigger: ${w.trigger || "Manual"}`} tone="blue" />
                    <MetaChip label={`${w.run_count || 0} runs`} tone="purple" />
                  </div>
                </div>

                <Link
                  href={`/workflows/builder?id=${w.id}`}
                  className="hidden sm:inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white"
                >
                  Open
                  <ChevronRight size={15} />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <ActionButton
                  onClick={() => runWorkflow(w)}
                  icon={<Play size={15} />}
                  label={runningId === w.id ? "Running..." : "Run"}
                  className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                />

                <LinkButton
                  href={`/workflows/builder?id=${w.id}`}
                  icon={<Pencil size={15} />}
                  label="Edit"
                  className="bg-blue-500/15 text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
                />

                <ActionButton
                  onClick={() => startRename(w)}
                  icon={<Pencil size={15} />}
                  label="Rename"
                />

                <ActionButton
                  onClick={() => toggleWorkflowStatus(w.id, active)}
                  icon={<Power size={15} />}
                  label={active ? "Disable" : "Enable"}
                />

                <ActionButton
                  onClick={() => saveAsTemplate(w)}
                  icon={<Files size={15} />}
                  label="Template"
                />

                <ActionButton
                  onClick={() => duplicateWorkflow(w.id)}
                  icon={<Copy size={15} />}
                  label="Copy"
                />

                <div className="col-span-2 sm:col-span-3">
                  <ActionButton
                    onClick={() => deleteWorkflow(w.id)}
                    icon={<Trash2 size={15} />}
                    label="Delete workflow"
                    className="w-full bg-red-500/12 text-red-300 border-red-500/20 hover:bg-red-500/18"
                  />
                </div>
              </div>
            </div>
          );
        })}
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
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function MetaChip({ label, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/5 bg-black/20 text-zinc-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    purple: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>
      {label}
    </span>
  );
}

function ActionButton({ onClick, icon, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function LinkButton({ href, icon, label, className = "" }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] ${className}`}
    >
      {icon}
      {label}
    </Link>
  );
}