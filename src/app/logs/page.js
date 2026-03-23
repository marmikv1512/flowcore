"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      load();
    }
  }, [authLoading, user]);

  async function load() {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      console.error("load logs error:", error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  async function deleteLog(id) {
    if (!user) return;

    const { error } = await supabase
      .from("logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("delete log error:", error);
      alert(error.message);
      return;
    }

    load();
  }

  async function clearLogs() {
    if (!user) return;

    const yes = window.confirm("Clear all your logs?");
    if (!yes) return;

    const { error } = await supabase
      .from("logs")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("clear logs error:", error);
      alert(error.message);
      return;
    }

    load();
  }

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between mb-6 items-center gap-3">
        <div>
          <div className="text-2xl">Activity Logs</div>
          <div className="text-sm text-zinc-400">{user?.email}</div>
        </div>

        <button
          onClick={clearLogs}
          className="bg-red-600 px-3 py-2 rounded"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {logs.length === 0 && (
          <div className="text-zinc-400 text-sm">No logs yet.</div>
        )}

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