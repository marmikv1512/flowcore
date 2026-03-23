"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      loadClients();
    }
  }, [authLoading, user]);

  async function loadClients() {
    if (!user) return;

    setPageLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message);
      setPageLoading(false);
      return;
    }

    setClients(data || []);
    setPageLoading(false);
  }

  async function addClient() {
    if (!name.trim() || !user) return;

    setLoading(true);

    const { error } = await supabase.from("clients").insert([
      {
        name: name.trim(),
        user_id: user.id,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setName("");
    loadClients();
  }

  async function deleteClient(id) {
    if (!user) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadClients();
  }

  if (authLoading || pageLoading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div>
      <div className="text-2xl mb-2">Clients</div>
      <div className="text-sm text-zinc-400 mb-6">{user?.email}</div>

      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          className="bg-zinc-900 border border-zinc-700 px-3 py-2 rounded outline-none"
        />

        <button
          onClick={addClient}
          disabled={loading}
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {clients.length === 0 && (
          <div className="text-zinc-400 text-sm">No clients yet.</div>
        )}

        {clients.map((c) => (
          <div
            key={c.id}
            className="bg-zinc-900 border border-zinc-800 p-3 rounded flex justify-between items-center"
          >
            <div>{c.name}</div>

            <button
              onClick={() => deleteClient(c.id)}
              className="bg-red-600 px-2 py-1 rounded text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}