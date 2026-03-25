import { supabase } from "@/lib/supabase";
import { executeWorkflow } from "@/lib/executeWorkflow";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const { data: workflows, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("trigger", "Time Schedule")
      .eq("is_active", true);

    if (error) {
      console.error("fetch workflows error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    let ranCount = 0;
    const debug = [];

    for (const w of workflows || []) {
      const item = {
        workflowId: w.id,
        workflowName: w.name,
        trigger: w.trigger,
        is_active: w.is_active,
        schedule_type: w.schedule_type,
        schedule_time: w.schedule_time,
        schedule_days: w.schedule_days,
        last_run_at: w.last_run_at,
        matched: false,
        skippedBecause: null,
      };

      try {
        if (!w.schedule_time) {
          item.skippedBecause = "Missing schedule_time";
          debug.push(item);
          continue;
        }

        if (w.schedule_time !== currentTime) {
          item.skippedBecause = `Time mismatch. workflow=${w.schedule_time}, server=${currentTime}`;
          debug.push(item);
          continue;
        }

        if (w.schedule_type === "weekly") {
          if (!Array.isArray(w.schedule_days) || !w.schedule_days.includes(currentDay)) {
            item.skippedBecause = `Day mismatch. today=${currentDay}`;
            debug.push(item);
            continue;
          }
        }

        if (w.last_run_at) {
          const lastRun = new Date(w.last_run_at);
          const diff = now.getTime() - lastRun.getTime();

          if (diff < 60000) {
            item.skippedBecause = "Already ran within last 60 seconds";
            debug.push(item);
            continue;
          }
        }

        const { data: steps, error: stepsError } = await supabase
          .from("workflow_steps")
          .select("*")
          .eq("workflow_id", w.id)
          .eq("user_id", w.user_id)
          .order("step_order", { ascending: true });

        if (stepsError) {
          item.skippedBecause = `Steps fetch error: ${stepsError.message}`;
          debug.push(item);
          continue;
        }

        if (!steps || steps.length === 0) {
          item.skippedBecause = "No steps found";
          debug.push(item);
          continue;
        }

        await executeWorkflow({
          workflow: w,
          steps,
          user: { id: w.user_id },
          clientName: "Scheduled",
          trigger: "Time Schedule",
        });

        await supabase
          .from("workflows")
          .update({
            last_run_at: new Date().toISOString(),
          })
          .eq("id", w.id)
          .eq("user_id", w.user_id);

        item.matched = true;
        item.skippedBecause = null;
        debug.push(item);
        ranCount += 1;
      } catch (err) {
        item.skippedBecause = `Execution error: ${err.message}`;
        debug.push(item);
      }
    }

    return res.status(200).json({
      success: true,
      ranCount,
      serverTime: currentTime,
      serverDay: currentDay,
      checkedAt: now.toISOString(),
      totalScheduledWorkflows: workflows?.length || 0,
      debug,
    });
  } catch (err) {
    console.error("run-scheduled fatal error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown error",
    });
  }
}