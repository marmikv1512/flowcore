"use client";

import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmModal";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Building2,
  UserCircle2,
  Sparkles,
  Pencil,
  Check,
  X,
  Mail,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { runWorkflowEngine } from "../../lib/runWorkflow";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();
  const confirm = useConfirm();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      loadClients();
    }
  }, [authLoading, user]);

  async function loadClients() {
    if (!user) return;

    setPageLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      toast.error(error.message || "Failed to load clients");
      setPageLoading(false);
      return;
    }

    setClients(data || []);
    setPageLoading(false);
  }

  function isValidEmail(value) {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function runClientAddedWorkflows(newClient) {
    if (!user || !newClient?.id) {
      return { triggered: 0, successCount: 0, failedCount: 0, skippedCount: 0 };
    }

    const { data: workflowsData, error: workflowsError } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", user.id)
      .eq("trigger", "Client Added")
      .eq("is_active", true)
      .order("id", { ascending: false });

    if (workflowsError) {
      throw new Error(workflowsError.message || "Failed to load auto-run workflows");
    }

    const workflows = workflowsData || [];

    if (workflows.length === 0) {
      return { triggered: 0, successCount: 0, failedCount: 0, skippedCount: 0 };
    }

    const workflowIds = workflows.map((w) => w.id);

    const { data: stepsData, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .in("workflow_id", workflowIds)
      .eq("user_id", user.id)
      .order("step_order", { ascending: true });

    if (stepsError) {
      throw new Error(stepsError.message || "Failed to load workflow steps");
    }

    const stepsByWorkflowId = {};
    for (const step of stepsData || []) {
      if (!stepsByWorkflowId[step.workflow_id]) {
        stepsByWorkflowId[step.workflow_id] = [];
      }
      stepsByWorkflowId[step.workflow_id].push(step);
    }

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const workflow of workflows) {
      const steps = stepsByWorkflowId[workflow.id] || [];

      if (steps.length === 0) {
        skippedCount += 1;
        continue;
      }

      try {
        const workflowToRun = {
          ...workflow,
          client_id: newClient.id,
        };

        const results = await runWorkflowEngine(workflowToRun, steps, user);

        const { error: logError } = await supabase.from("logs").insert([
          {
            workflow_name: workflow.name,
            client_name: newClient.name || "Unnamed client",
            trigger: "Client Added",
            time_text: new Date().toISOString(),
            steps: results,
            user_id: user.id,
          },
        ]);

        if (logError) {
          throw logError;
        }

        const newRunCount = (workflow.run_count || 0) + 1;

        const { error: updateError } = await supabase
          .from("workflows")
          .update({ run_count: newRunCount })
          .eq("id", workflow.id)
          .eq("user_id", user.id);

        if (updateError) {
          throw updateError;
        }

        successCount += 1;
      } catch (error) {
        console.error(`auto-run failed for workflow ${workflow.id}:`, error);
        failedCount += 1;
      }
    }

    return {
      triggered: workflows.length,
      successCount,
      failedCount,
      skippedCount,
    };
  }

  async function addClient() {
    if (!user) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      toast.error("Enter a client name");
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      toast.error("Enter a valid email");
      return;
    }

    setLoading(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticClient = {
      id: tempId,
      name: trimmedName,
      email: trimmedEmail || null,
      user_id: user.id,
    };

    setClients((prev) => [optimisticClient, ...prev]);
    setName("");
    setEmail("");

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert([
          {
            name: trimmedName,
            email: trimmedEmail || null,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setClients((prev) => prev.map((c) => (c.id === tempId ? data : c)));

      const autoRunSummary = await runClientAddedWorkflows(data);

      if (autoRunSummary.triggered === 0) {
        toast.success("Client added");
        return;
      }

      if (autoRunSummary.failedCount > 0) {
        toast.warning(
          `Client added. ${autoRunSummary.successCount}/${autoRunSummary.triggered} Client Added workflow(s) ran successfully.`
        );
        return;
      }

      toast.success(
        `Client added. ${autoRunSummary.successCount} Client Added workflow(s) auto-ran.`
      );
    } catch (error) {
      setClients((prev) => prev.filter((c) => c.id !== tempId));
      setName(trimmedName);
      setEmail(trimmedEmail);
      toast.error(error.message || "Failed to add client");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(client) {
    setEditId(client.id);
    setEditName(client.name || "");
    setEditEmail(client.email || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditEmail("");
  }

  async function saveEdit(id) {
    if (!user) return;

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();

    if (!trimmedName) {
      toast.error("Client name cannot be empty");
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      toast.error("Enter a valid email");
      return;
    }

    const previousClients = clients;

    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, name: trimmedName, email: trimmedEmail || null }
          : c
      )
    );
    setEditId(null);
    setEditName("");
    setEditEmail("");

    const { error } = await supabase
      .from("clients")
      .update({
        name: trimmedName,
        email: trimmedEmail || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setClients(previousClients);
      toast.error(error.message || "Failed to update client");
      return;
    }

    toast.success("Client updated");
  }

  async function deleteClient(id) {
    if (!user) return;

    const ok = await confirm({
      title: "Delete client",
      description: "Are you sure you want to delete this client?",
    });

    if (!ok) return;

    const previousClients = clients;

    setClients((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setClients(previousClients);
      toast.error(error.message || "Failed to delete client");
      return;
    }

    toast.success("Client deleted");
  }

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) => {
      const clientName = (c.name || "").toLowerCase();
      const clientEmail = (c.email || "").toLowerCase();
      return clientName.includes(q) || clientEmail.includes(q);
    });
  }, [clients, search]);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">
        Loading clients...
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
              Client workspace
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Manage your agency clients in one clean place.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Add, search, edit, and manage client records tied to your Flowcore
              workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <MiniStat label="Clients" value={clients.length} />
            <MiniStat label="Workspace" value="Private" />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients or email"
                className="w-full rounded-2xl border border-white/5 bg-black/20 pl-10 pr-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
              />
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New client name"
              className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addClient();
              }}
              placeholder="Client email"
              className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
            />
          </div>

          <button
            onClick={addClient}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
          >
            <Plus size={16} />
            {loading ? "Adding..." : "Add client"}
          </button>
        </div>
      </section>

      {filteredClients.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-400">
            <Users size={24} />
          </div>
          <div className="text-lg font-medium">No clients found</div>
          <div className="mt-2 text-sm text-zinc-500">
            Add your first client or refine your search.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((c) => (
            <div
              key={c.id}
              className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="h-11 w-11 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300 mb-4">
                    <Building2 size={18} />
                  </div>

                  {editId === c.id ? (
                    <div className="space-y-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm outline-none"
                        placeholder="Client name"
                        autoFocus
                      />

                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                        />
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(c.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full rounded-2xl border border-white/5 bg-black/20 pl-10 pr-4 py-3 text-sm outline-none"
                          placeholder="Client email"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(c.id)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-3 py-2 text-sm font-medium"
                        >
                          <Check size={14} />
                          Save
                        </button>

                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-semibold tracking-tight truncate">
                        {c.name}
                      </div>

                      <div className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-500">
                        <UserCircle2 size={14} />
                        Linked to your workspace
                      </div>

                      <div className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400 break-all">
                        <Mail size={14} />
                        {c.email || "No email added"}
                      </div>
                    </>
                  )}
                </div>

                {editId !== c.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/15 transition"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      onClick={() => deleteClient(c.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/15 transition"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
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