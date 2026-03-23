"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

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

  useEffect(() => {
    if (!authLoading && user) {
      loadBuilderData();
    }
  }, [workflowId, authLoading, user]);

  async function loadBuilderData() {
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });

    if (clientsError) {
      console.error("load clients error:", clientsError);
      return;
    }

    setClients(clientsData || []);

    if (!workflowId) return;

    const { data: workflowData, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError) {
      console.error("load workflow error:", workflowError);
      return;
    }

    const { data: stepsData, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("step_order", { ascending: true });

    if (stepsError) {
      console.error("load steps error:", stepsError);
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
        .eq("id", workflowId);

      if (updateError) {
        setSaving(false);
        console.error(updateError);
        alert(updateError.message);
        return;
      }

      const { error: deleteStepsError } = await supabase
        .from("workflow_steps")
        .delete()
        .eq("workflow_id", workflowId);

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

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="text-2xl mb-4">Workflow Builder</div>

      <div className="grid gap-3 max-w-2xl mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name"
          className="bg-zinc-900 border px-3 py-2 rounded"
        />

        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="bg-zinc-900 border px-3 py-2 rounded"
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          className="bg-zinc-900 border px-3 py-2 rounded"
        >
          <option>Manual</option>
          <option>New Lead</option>
          <option>Client Added</option>
          <option>Form Submitted</option>
          <option>Time Schedule</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active workflow
        </label>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5 max-w-2xl">
        <div className="text-sm text-zinc-400 mb-3">Add block</div>

        <div className="flex gap-2 mb-3">
          <select
            value={blockType}
            onChange={(e) => setBlockType(e.target.value)}
            className="bg-zinc-950 border px-3 py-2 rounded"
          >
            <option>Trigger</option>
            <option>Task</option>
            <option>Email</option>
            <option>Notify</option>
          </select>

          <button
            onClick={addStep}
            className="bg-blue-600 px-3 py-2 rounded"
          >
            Add block
          </button>
        </div>

        {blockType === "Task" && (
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Task name"
            className="bg-zinc-950 border px-3 py-2 rounded w-full"
          />
        )}

        {blockType === "Email" && (
          <input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Email subject"
            className="bg-zinc-950 border px-3 py-2 rounded w-full"
          />
        )}

        {blockType === "Notify" && (
          <input
            value={notifyMessage}
            onChange={(e) => setNotifyMessage(e.target.value)}
            placeholder="Notification message"
            className="bg-zinc-950 border px-3 py-2 rounded w-full"
          />
        )}

        {blockType === "Trigger" && (
          <div className="text-sm text-zinc-400">
            Trigger block uses the workflow trigger above.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-6 max-w-2xl">
        {steps.map((s, index) => (
          <div
            key={s.id}
            className="bg-zinc-900 p-3 rounded border border-zinc-800"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="font-medium mb-2">
                  {index + 1}. {s.type}
                </div>

                {editingStepId === s.id ? (
                  <div className="space-y-2">
                    {s.type === "Task" && (
                      <input
                        value={s.config?.taskName || ""}
                        onChange={(e) =>
                          updateStepConfig(s.id, "taskName", e.target.value)
                        }
                        placeholder="Task name"
                        className="bg-zinc-950 border px-3 py-2 rounded w-full"
                      />
                    )}

                    {s.type === "Email" && (
                      <input
                        value={s.config?.subject || ""}
                        onChange={(e) =>
                          updateStepConfig(s.id, "subject", e.target.value)
                        }
                        placeholder="Email subject"
                        className="bg-zinc-950 border px-3 py-2 rounded w-full"
                      />
                    )}

                    {s.type === "Notify" && (
                      <input
                        value={s.config?.message || ""}
                        onChange={(e) =>
                          updateStepConfig(s.id, "message", e.target.value)
                        }
                        placeholder="Notification message"
                        className="bg-zinc-950 border px-3 py-2 rounded w-full"
                      />
                    )}

                    {s.type === "Trigger" && (
                      <div className="text-sm text-zinc-400">
                        Trigger block uses workflow trigger.
                      </div>
                    )}

                    <button
                      onClick={() => setEditingStepId(null)}
                      className="bg-blue-600 px-3 py-1 rounded text-sm"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {s.type === "Task" && (
                      <div className="text-sm text-zinc-400">
                        Task: {s.config?.taskName}
                      </div>
                    )}

                    {s.type === "Email" && (
                      <div className="text-sm text-zinc-400">
                        Subject: {s.config?.subject}
                      </div>
                    )}

                    {s.type === "Notify" && (
                      <div className="text-sm text-zinc-400">
                        Message: {s.config?.message}
                      </div>
                    )}

                    {s.type === "Trigger" && (
                      <div className="text-sm text-zinc-400">
                        Uses workflow trigger
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => moveStepUp(index)}
                  className="bg-zinc-700 px-2 py-1 rounded text-sm"
                >
                  Up
                </button>

                <button
                  onClick={() => moveStepDown(index)}
                  className="bg-zinc-700 px-2 py-1 rounded text-sm"
                >
                  Down
                </button>

                <button
                  onClick={() =>
                    setEditingStepId(editingStepId === s.id ? null : s.id)
                  }
                  className="bg-zinc-700 px-2 py-1 rounded text-sm"
                >
                  {editingStepId === s.id ? "Close" : "Edit"}
                </button>

                <button
                  onClick={() => deleteStep(s.id)}
                  className="bg-red-600 px-2 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={saveWorkflow}
        disabled={saving}
        className="bg-green-600 px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save workflow"}
      </button>
    </div>
  );
}