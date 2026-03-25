import { supabase } from "@/lib/supabase";
import { runWorkflowEngine } from "@/lib/runWorkflow";

export async function executeWorkflow({
  workflow,
  steps,
  user,
  clientName,
  trigger,
}) {
  if (!workflow || !steps || !user) {
    throw new Error("Missing required execution data");
  }

  if (!steps.length) {
    throw new Error("This workflow has no steps");
  }

  const results = await runWorkflowEngine(workflow, steps, user);

  const { error: logError } = await supabase.from("logs").insert([
    {
      workflow_name: workflow.name,
      client_name: clientName || "Unknown client",
      trigger: trigger || workflow.trigger || "Manual",
      time_text: new Date().toISOString(),
      steps: results,
      user_id: user.id,
    },
  ]);

  if (logError) throw logError;

  const newRunCount = (workflow.run_count || 0) + 1;

  const { error: updateError } = await supabase
    .from("workflows")
    .update({ run_count: newRunCount })
    .eq("id", workflow.id)
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  return {
    results,
    newRunCount,
  };
}