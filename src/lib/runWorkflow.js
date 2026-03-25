import { supabase } from "@/lib/supabase";

/**
 * Core workflow execution engine
 * Executes steps sequentially with failure handling
 */
export async function runWorkflowEngine(workflow, steps, user) {
  const results = [];

  for (const step of steps) {
    try {
      let result = "";

      // ----------------------
      // TASK STEP (REAL DB WRITE)
      // ----------------------
      if (step.type === "Task") {
        const { error } = await supabase.from("tasks").insert([
          {
            name: step.config?.taskName || "Untitled task",
            workflow_id: workflow.id,
            user_id: user.id,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;

        result = `Task created: ${step.config?.taskName || "Untitled task"}`;
      }

      // ----------------------
      // EMAIL STEP (REAL EMAIL)
      // ----------------------
      else if (step.type === "Email") {
        // fetch client email
        const { data: client, error } = await supabase
          .from("clients")
          .select("email")
          .eq("id", workflow.client_id)
          .single();

        if (error) throw error;

        if (!client?.email) {
          throw new Error("Client has no email");
        }

        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: client.email,
            subject: step.config?.subject || "No subject",
            text: "This is an automated email from Flowcore",
          }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Email failed");
        }

        result = `Email sent to ${client.email}`;
      }

      // ----------------------
      // NOTIFY STEP (SIMULATED)
      // ----------------------
      else if (step.type === "Notify") {
        await delay(200);

        result = `Notification sent: ${step.config?.message || "No message"}`;
      }

      // ----------------------
      // TRIGGER STEP (NO ACTION)
      // ----------------------
      else if (step.type === "Trigger") {
        result = "Triggered by workflow trigger";
      }

      // ----------------------
      // UNKNOWN STEP
      // ----------------------
      else {
        result = `Unknown step type: ${step.type}`;
      }

      results.push({
        type: step.type,
        status: "success",
        result,
      });
    } catch (err) {
      console.error("Step failed:", err);

      results.push({
        type: step.type,
        status: "error",
        result: err.message || "Unknown error",
      });

      // STOP execution on failure
      break;
    }
  }

  return results;
}

/**
 * Small utility to simulate async delays
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}