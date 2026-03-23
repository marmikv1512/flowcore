"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadClients();
    }
  }, [authLoading, user]);

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setClients(data || []);
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
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadClients();
  }

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="text-2xl mb-6">Clients</div>

      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          className="bg-zinc-900 border border-zinc-700 px-3 py-2 rounded"
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
        {clients.map((c) => (
          <div
            key={c.id}
            className="bg-zinc-900 border border-zinc-800 p-3 rounded flex justify-between"
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