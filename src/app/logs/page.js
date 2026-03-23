"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { authLoading } = useAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!authLoading) {
      load();
    }
  }, [authLoading]);

  async function load() {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("load logs error:", error);
      return;
    }

    setLogs(data || []);
  }

  async function deleteLog(id) {
    const { error } = await supabase.from("logs").delete().eq("id", id);

    if (error) {
      console.error("delete log error:", error);
      alert(error.message);
      return;
    }

    load();
  }

  async function clearLogs() {
    const { error } = await supabase.from("logs").delete().gt("id", 0);

    if (error) {
      console.error("clear logs error:", error);
      alert(error.message);
      return;
    }

    load();
  }

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between mb-6">
        <div className="text-2xl">Activity Logs</div>

        <button
          onClick={clearLogs}
          className="bg-red-600 px-3 py-2 rounded"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-zinc-900 border border-zinc-800 p-3 rounded"
          >
            <div className="flex justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm">Workflow: {log.workflow_name}</div>

                <div className="text-xs text-zinc-400">
                  Client: {log.client_name}
                </div>

                <div className="text-xs text-blue-400">
                  Trigger: {log.trigger}
                </div>

                <div className="text-xs text-zinc-500">
                  {log.time_text}
                </div>

                {log.steps && (
                  <div className="mt-2 text-xs space-y-1">
                    {log.steps.map((s, idx) => (
                      <div key={idx} className="text-zinc-300">
                        {s.type} → {s.result}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => deleteLog(log.id)}
                className="bg-red-600 px-2 py-1 rounded text-sm h-fit"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}