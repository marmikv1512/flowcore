import { supabase } from "@/lib/supabase";
import { executeWorkflow } from "@/lib/executeWorkflow";

export async function GET() {
  const now = new Date();

  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
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
    return Response.json({ success: false });
  }

  for (const w of workflows || []) {
    try {
      if (!w.schedule_time) continue;

      // match time
      if (w.schedule_time !== currentTime) continue;

      // weekly check
      if (w.schedule_type === "weekly") {
        if (!w.schedule_days?.includes(currentDay)) continue;
      }

      // prevent double run within same minute
      if (w.last_run_at) {
        const lastRun = new Date(w.last_run_at);
        const diff = now - lastRun;

        if (diff < 60000) continue; // 60 sec
      }

      const { data: steps } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("workflow_id", w.id);

      if (!steps || steps.length === 0) continue;

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
        .eq("id", w.id);

      console.log("Ran scheduled workflow:", w.id);
    } catch (err) {
      console.error("schedule error:", err);
    }
  }

  return Response.json({ success: true });
}