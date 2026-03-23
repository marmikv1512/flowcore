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

    // 🔒 FIXED: user scoped clients
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (clientsError) {
      console.error("load clients error:", clientsError);
      return;
    }

    setClients(clientsData || []);

    if (!workflowId) return;

    // 🔒 FIXED: user scoped workflow
    const { data: workflowData, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (workflowError) {
      console.error("load workflow error:", workflowError);
      return;
    }

    // 🔒 FIXED: user scoped steps
    const { data: stepsData, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("user_id", user.id)
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
      // 🔒 FIXED: user scoped update
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

      // 🔒 FIXED: only delete YOUR steps
      await supabase
        .from("workflow_steps")
        .delete()
        .eq("workflow_id", workflowId)
        .eq("user_id", user.id);
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
        user_id: user.id, // 🔒 CRITICAL
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

  if (authLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="text-2xl mb-4">Workflow Builder</div>

      {/* rest of your UI stays SAME */}
    </div>
  );
}