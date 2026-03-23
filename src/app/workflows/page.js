"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    setRenameValue(w.name);
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
      console.error(logError);
      alert(logError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("workflows")
      .update({ run_count: (w.run_count || 0) + 1 })
      .eq("id", w.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error(updateError);
      alert(updateError.message);
      return;
    }

    loadAll();
    alert("Workflow executed");
  }

  const filtered = useMemo(() => {
    return workflows.filter((w) =>
      (w.name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [workflows, search]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between mb-6 gap-3">
        <div className="text-2xl font-semibold">Workflows</div>

        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows"
            className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded"
          />

          <Link
            href="/workflows/builder"
            className="bg-zinc-800 px-4 py-2 rounded"
          >
            + Create
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-zinc-400 mb-4">Loading workflows...</div>
      )}

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && !loading && (
          <div className="text-sm text-zinc-400">No workflows yet.</div>
        )}

        {filtered.map((w) => (
          <div
            key={w.id}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {renameId === w.id ? (
                  <div className="flex gap-2 mb-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="bg-zinc-950 border px-3 py-2 rounded"
                    />

                    <button
                      onClick={() => saveRename(w.id)}
                      className="bg-blue-600 px-3 py-2 rounded text-sm"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="text-lg">{w.name}</div>
                )}

                <div className="text-xs text-zinc-400">
                  {getClientName(w.client_id)}
                </div>

                <div className="text-xs text-blue-400">
                  Trigger: {w.trigger || "Manual"}
                </div>

                <div className="text-xs text-zinc-500">
                  Runs: {w.run_count || 0}
                </div>

                <div className="mt-1">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      (w.is_active ?? true) ? "bg-green-700" : "bg-zinc-700"
                    }`}
                  >
                    {(w.is_active ?? true) ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-sm max-w-md justify-end">
                <button
                  onClick={() => runWorkflow(w)}
                  className="bg-green-600 px-2 py-1 rounded"
                >
                  Run
                </button>

                <Link
                  href={`/workflows/builder?id=${w.id}`}
                  className="bg-blue-600 px-2 py-1 rounded"
                >
                  Edit
                </Link>

                <button
                  onClick={() => startRename(w)}
                  className="bg-zinc-800 px-2 py-1 rounded"
                >
                  Rename
                </button>

                <button
                  onClick={() => toggleWorkflowStatus(w.id, w.is_active ?? true)}
                  className="bg-zinc-800 px-2 py-1 rounded"
                >
                  {(w.is_active ?? true) ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={() => saveAsTemplate(w)}
                  className="bg-zinc-800 px-2 py-1 rounded"
                >
                  Template
                </button>

                <button
                  onClick={() => duplicateWorkflow(w.id)}
                  className="bg-zinc-800 px-2 py-1 rounded"
                >
                  Copy
                </button>

                <button
                  onClick={() => deleteWorkflow(w.id)}
                  className="bg-red-600 px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}