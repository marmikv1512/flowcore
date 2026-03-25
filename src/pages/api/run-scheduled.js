import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runWorkflowEngine } from "@/lib/runWorkflow";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const now = new Date();
    const serverTime = now.toTimeString().slice(0, 5);
    const serverDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const { data: workflows, error } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("trigger", "Time Schedule")
      .eq("is_active", true);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    let ranCount = 0;
    const debug = [];

    for (const w of workflows || []) {
      const row = {
        workflowId: w.id,
        workflowName: w.name,
        trigger: w.trigger,
        isActive: w.is_active,
        scheduleType: w.schedule_type,
        scheduleTime: w.schedule_time,
        scheduleDays: w.schedule_days,
        lastRunAt: w.last_run_at,
        stepCount: 0,
        status: "skipped",
        reason: "",
      };

      try {
        if (!w.schedule_time) {
          row.reason = "Missing schedule_time";
          debug.push(row);
          continue;
        }

        if (w.schedule_time !== serverTime) {
          row.reason = `Time mismatch: workflow=${w.schedule_time}, server=${serverTime}`;
          debug.push(row);
          continue;
        }

        if (w.schedule_type === "weekly") {
          if (!Array.isArray(w.schedule_days) || !w.schedule_days.includes(serverDay)) {
            row.reason = `Day mismatch: today=${serverDay}`;
            debug.push(row);
            continue;
          }
        }

        if (w.last_run_at) {
          const lastRun = new Date(w.last_run_at);
          const diffMs = now.getTime() - lastRun.getTime();

          if (diffMs < 60000) {
            row.reason = "Already ran in last 60 seconds";
            debug.push(row);
            continue;
          }
        }

        const { data: steps, error: stepsError } = await supabaseAdmin
          .from("workflow_steps")
          .select("*")
          .eq("workflow_id", w.id)
          .eq("user_id", w.user_id)
          .order("step_order", { ascending: true });

        if (stepsError) {
          row.reason = `Steps fetch error: ${stepsError.message}`;
          debug.push(row);
          continue;
        }

        row.stepCount = steps?.length || 0;

        if (!steps || steps.length === 0) {
          row.reason = "No steps found";
          debug.push(row);
          continue;
        }

        const results = await runWorkflowEngine(w, steps, { id: w.user_id });

        const { error: logError } = await supabaseAdmin.from("logs").insert([
          {
            workflow_name: w.name,
            client_name: "Scheduled",
            trigger: "Time Schedule",
            time_text: new Date().toISOString(),
            steps: results,
            user_id: w.user_id,
          },
        ]);

        if (logError) {
          row.status = "error";
          row.reason = `Log insert error: ${logError.message}`;
          debug.push(row);
          continue;
        }

        const newRunCount = (w.run_count || 0) + 1;

        const { error: updateError } = await supabaseAdmin
          .from("workflows")
          .update({
            run_count: newRunCount,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", w.id)
          .eq("user_id", w.user_id);

        if (updateError) {
          row.status = "error";
          row.reason = `Workflow update error: ${updateError.message}`;
          debug.push(row);
          continue;
        }

        row.status = "ran";
        row.reason = "Workflow executed";
        debug.push(row);
        ranCount += 1;
      } catch (err) {
        row.status = "error";
        row.reason = err.message || "Unknown execution error";
        debug.push(row);
      }
    }

    return res.status(200).json({
      success: true,
      ranCount,
      serverTime,
      serverDay,
      checkedAt: now.toISOString(),
      totalScheduledWorkflows: workflows?.length || 0,
      debug,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown error",
    });
  }
}