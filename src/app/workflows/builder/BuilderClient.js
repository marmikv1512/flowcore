"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Save,
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  Check,
  Zap,
  Mail,
  Bell,
  PlayCircle,
  Workflow,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

const blockOptions = [
  { value: "Trigger", label: "Trigger", icon: PlayCircle },
  { value: "Task", label: "Task", icon: Workflow },
  { value: "Email", label: "Email", icon: Mail },
  { value: "Notify", label: "Notify", icon: Bell },
];

export default function Page() {
  const { user, authLoading } = useAuth();

  const router = useRouter();
  const params = useSearchParams();
  const workflowId = params.get("id");

  const [name, setName] = useState("");
  const [steps, setSteps] = useState([]);
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState([]);
  const [trigger, setTrigger] = useState("Manual");
  const [blockType, setBlockType] = useState("Task");
  const [isActive, setIsActive] = useState(true);
  const [taskName, setTaskName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [editingStepId, setEditingStepId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      loadBuilderData();
    }
  }, [workflowId, authLoading, user]);

  async function loadBuilderData() {
    if (!user) return;

    setPageLoading(true);

    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (clientsError) {
      console.error("load clients error:", clientsError);
      setPageLoading(false);
      return;
    }

    setClients(clientsData || []);

    if (!workflowId) {
      setPageLoading(false);
      return;
    }

    const { data: workflowData, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (workflowError) {
      console.error("load workflow error:", workflowError);
      setPageLoading(false);
      return;
    }

    const { data: stepsData, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("user_id", user.id)
      .order("step_order", { ascending: true });

    if (stepsError) {
      console.error("load steps error:", stepsError);
      setPageLoading(false);
      return;
    }

    setName(workflowData.name || "");
    setClientId(workflowData.client_id ? String(workflowData.client_id) : "");
    setTrigger(workflowData.trigger || "Manual");
    setIsActive(workflowData.is_active ?? true);

    const mappedSteps = (stepsData || []).map((s) => ({
      id: s.id,
      type: s.type,
      config: s.config || {},
    }));

    setSteps(mappedSteps);
    setPageLoading(false);
  }

  function addStep() {
    let config = {};

    if (blockType === "Task") config = { taskName: taskName || "Untitled task" };
    if (blockType === "Email") config = { subject: emailSubject || "No subject" };
    if (blockType === "Notify") config = { message: notifyMessage || "No message" };
    if (blockType === "Trigger") config = { label: "Workflow trigger" };

    const newStep = {
      id: Date.now(),
      type: blockType,
      config,
    };

    setSteps([...steps, newStep]);
    setTaskName("");
    setEmailSubject("");
    setNotifyMessage("");
  }

  function deleteStep(id) {
    setSteps(steps.filter((s) => s.id !== id));
    if (editingStepId === id) setEditingStepId(null);
  }

  function updateStepConfig(stepId, key, value) {
    setSteps(
      steps.map((s) =>
        s.id === stepId
          ? { ...s, config: { ...s.config, [key]: value } }
          : s
      )
    );
  }

  function moveStepUp(index) {
    if (index === 0) return;
    const updated = [...steps];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setSteps(updated);
  }

  function moveStepDown(index) {
    if (index === steps.length - 1) return;
    const updated = [...steps];
    [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
    setSteps(updated);
  }

  async function saveWorkflow() {
    if (!user) return;

    setSaving(true);

    let finalWorkflowId = workflowId;

    if (workflowId) {
      const { error: updateError } = await supabase
        .from("workflows")
        .update({
          name: name || "Untitled workflow",
          client_id: clientId || null,
          trigger,
          is_active: isActive,
        })
        .eq("id", workflowId)
        .eq("user_id", user.id);

      if (updateError) {
        setSaving(false);
        console.error(updateError);
        alert(updateError.message);
        return;
      }

      const { error: deleteStepsError } = await supabase
        .from("workflow_steps")
        .delete()
        .eq("workflow_id", workflowId)
        .eq("user_id", user.id);

      if (deleteStepsError) {
        setSaving(false);
        console.error(deleteStepsError);
        alert(deleteStepsError.message);
        return;
      }
    } else {
      const { data: newWorkflow, error: insertError } = await supabase
        .from("workflows")
        .insert([
          {
            name: name || "Untitled workflow",
            client_id: clientId || null,
            trigger,
            is_active: isActive,
            run_count: 0,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (insertError) {
        setSaving(false);
        console.error(insertError);
        alert(insertError.message);
        return;
      }

      finalWorkflowId = newWorkflow.id;
    }

    if (steps.length > 0) {
      const stepRows = steps.map((s, index) => ({
        workflow_id: finalWorkflowId,
        type: s.type,
        step_order: index,
        config: s.config || {},
        user_id: user.id,
      }));

      const { error: stepsInsertError } = await supabase
        .from("workflow_steps")
        .insert(stepRows);

      if (stepsInsertError) {
        setSaving(false);
        console.error(stepsInsertError);
        alert(stepsInsertError.message);
        return;
      }
    }

    setSaving(false);
    router.push("/workflows");
  }

  const selectedBlockMeta = useMemo(() => {
    return blockOptions.find((b) => b.value === blockType) || blockOptions[1];
  }, [blockType]);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">
        Loading builder...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <button
              onClick={() => router.push("/workflows")}
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4"
            >
              <ChevronLeft size={16} />
              Back to workflows
            </button>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 mb-4">
              <Zap size={14} />
              Workflow builder
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {workflowId ? "Edit workflow" : "Build a new workflow"}
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Define the workflow name, assign a client, set the trigger, and
              shape the execution steps.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-[280px]">
            <MiniStat label="Mode" value={workflowId ? "Edit" : "Create"} />
            <MiniStat label="Steps" value={steps.length} />
            <MiniStat label="Status" value={isActive ? "Active" : "Inactive"} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="mb-5">
            <div className="text-lg font-semibold">Workflow setup</div>
            <div className="text-sm text-zinc-500">
              Configure the base details before saving.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Workflow name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lead onboarding flow"
                className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 outline-none placeholder:text-zinc-500"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 outline-none"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Trigger
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 outline-none"
              >
                <option>Manual</option>
                <option>New Lead</option>
                <option>Client Added</option>
                <option>Form Submitted</option>
                <option>Time Schedule</option>
              </select>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Workflow status</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Keep it enabled if it should be available for execution.
                </div>
              </div>

              <button
                onClick={() => setIsActive((prev) => !prev)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  isActive
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.05] text-zinc-400"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Add block</div>
              <div className="text-sm text-zinc-500">
                Stack blocks in order to shape the flow.
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-zinc-400">
              {steps.length} blocks
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  Block type
                </label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 outline-none"
                >
                  {blockOptions.map((option) => (
                    <option key={option.value}>{option.value}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <selectedBlockMeta.icon size={16} className="text-zinc-300" />
                  <div className="text-sm font-medium">
                    {selectedBlockMeta.label} block config
                  </div>
                </div>

                {blockType === "Task" && (
                  <input
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="Task name"
                    className="w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 outline-none"
                  />
                )}

                {blockType === "Email" && (
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject"
                    className="w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 outline-none"
                  />
                )}

                {blockType === "Notify" && (
                  <input
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Notification message"
                    className="w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 outline-none"
                  />
                )}

                {blockType === "Trigger" && (
                  <div className="text-sm text-zinc-500">
                    Trigger block uses the workflow trigger selected on the left.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={addStep}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-4 py-3 text-sm font-medium hover:opacity-90 transition"
            >
              <Plus size={16} />
              Add block
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Workflow steps</div>
            <div className="text-sm text-zinc-500">
              Arrange and edit the blocks in execution order.
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-zinc-400">
            {steps.length} total
          </div>
        </div>

        {steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
            <div className="text-sm text-zinc-500">
              No blocks added yet. Start by adding the first block above.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((s, index) => (
              <div
                key={s.id}
                className="rounded-[24px] border border-white/5 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1 text-zinc-500">
                      <GripVertical size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="text-sm font-medium">
                          Step {index + 1}
                        </div>
                        <TypeBadge type={s.type} />
                      </div>

                      {editingStepId === s.id ? (
                        <div className="space-y-3">
                          {s.type === "Task" && (
                            <input
                              value={s.config?.taskName || ""}
                              onChange={(e) =>
                                updateStepConfig(s.id, "taskName", e.target.value)
                              }
                              placeholder="Task name"
                              className="w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 outline-none"
                            />
                          )}

                          {s.type === "Email" && (
                            <input
                              value={s.config?.subject || ""}
                              onChange={(e) =>
                                updateStepConfig(s.id, "subject", e.target.value)
                              }
                              placeholder="Email subject"
                              className="w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 outline-none"
                            />
                          )}

                          {s.type === "Notify" && (
                            <input
                              value={s.config?.message || ""}
                              onChange={(e) =>
                                updateStepConfig(s.id, "message", e.target.value)
                              }
                              placeholder="Notification message"
                              className="w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 outline-none"
                            />
                          )}

                          {s.type === "Trigger" && (
                            <div className="text-sm text-zinc-500">
                              Trigger block uses workflow trigger.
                            </div>
                          )}

                          <button
                            onClick={() => setEditingStepId(null)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-4 py-2 text-sm font-medium"
                          >
                            <Check size={15} />
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-400">
                          {s.type === "Task" && `Task: ${s.config?.taskName || "-"}`}
                          {s.type === "Email" && `Subject: ${s.config?.subject || "-"}`}
                          {s.type === "Notify" && `Message: ${s.config?.message || "-"}`}
                          {s.type === "Trigger" && "Uses workflow trigger"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 max-w-xs">
                    <SmallButton
                      onClick={() => moveStepUp(index)}
                      label="Up"
                    />
                    <SmallButton
                      onClick={() => moveStepDown(index)}
                      label="Down"
                    />
                    <SmallButton
                      onClick={() =>
                        setEditingStepId(editingStepId === s.id ? null : s.id)
                      }
                      icon={<Pencil size={14} />}
                      label={editingStepId === s.id ? "Close" : "Edit"}
                    />
                    <SmallButton
                      onClick={() => deleteStep(s.id)}
                      icon={<Trash2 size={14} />}
                      label="Delete"
                      danger
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-20">
        <div className="rounded-[24px] border border-white/10 bg-[#0f0f13]/90 backdrop-blur-xl p-4 shadow-2xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium">
              {name || "Untitled workflow"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {steps.length} blocks • {isActive ? "Active" : "Inactive"} • Trigger: {trigger}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/workflows")}
              className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300"
            >
              Cancel
            </button>

            <button
              onClick={saveWorkflow}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save workflow"}
            </button>
          </div>
        </div>
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

function TypeBadge({ type }) {
  const styles = {
    Trigger: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    Task: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    Email: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    Notify: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] ${
        styles[type] || "border-white/10 bg-white/[0.05] text-zinc-300"
      }`}
    >
      {type}
    </span>
  );
}

function SmallButton({ onClick, icon, label, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition ${
        danger
          ? "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
          : "border-white/5 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}