"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Building2,
  UserCircle2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

export default function Page() {
  const { user, authLoading } = useAuth();

  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
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

    const yes = window.confirm("Delete this client?");
    if (!yes) return;

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

  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      (c.name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">
        Loading clients...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%)] pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 mb-4">
              <Sparkles size={14} />
              Client workspace
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Manage your agency clients in one clean place.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Add, search, and manage client records tied to your Flowcore workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <MiniStat label="Clients" value={clients.length} />
            <MiniStat label="Workspace" value="Private" />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients"
                className="w-full rounded-2xl border border-white/5 bg-black/20 pl-10 pr-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
              />
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New client name"
              className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
            />
          </div>

          <button
            onClick={addClient}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
          >
            <Plus size={16} />
            {loading ? "Adding..." : "Add client"}
          </button>
        </div>
      </section>

      {filteredClients.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-400">
            <Users size={24} />
          </div>
          <div className="text-lg font-medium">No clients found</div>
          <div className="mt-2 text-sm text-zinc-500">
            Add your first client or refine your search.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((c) => (
            <div
              key={c.id}
              className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="h-11 w-11 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300 mb-4">
                    <Building2 size={18} />
                  </div>

                  <div className="text-lg font-semibold tracking-tight truncate">
                    {c.name}
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-500">
                    <UserCircle2 size={14} />
                    Linked to your workspace
                  </div>
                </div>

                <button
                  onClick={() => deleteClient(c.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/15 transition"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold truncate">{value}</div>
    </div>
  );
}