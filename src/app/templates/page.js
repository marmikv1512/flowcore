"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Sparkles,
  Copy,
  Workflow,
  Zap,
  Bell,
  Mail,
  Layers3,
} from "lucide-react";

export default function Page() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const custom = JSON.parse(localStorage.getItem("templates")) || [];

    const defaults = [
      {
        id: 1,
        name: "Client onboarding",
        trigger: "Client Added",
        steps: [
          {
            id: 11,
            type: "Task",
            config: { taskName: "Create onboarding checklist" },
          },
          {
            id: 12,
            type: "Email",
            config: { subject: "Welcome client" },
          },
        ],
      },
      {
        id: 2,
        name: "Content approval",
        trigger: "Manual",
        steps: [
          {
            id: 21,
            type: "Task",
            config: { taskName: "Review content" },
          },
          {
            id: 22,
            type: "Notify",
            config: { message: "Approval needed" },
          },
        ],
      },
    ];

    setTemplates([...defaults, ...custom]);
  }, []);

  function useTemplate(t) {
    const old = JSON.parse(localStorage.getItem("workflows")) || [];

    const workflow = {
      id: Date.now(),
      name: t.name,
      steps: t.steps || [],
      clientId: "",
      trigger: t.trigger || "Manual",
      isActive: true,
      runCount: 0,
    };

    localStorage.setItem("workflows", JSON.stringify([...old, workflow]));
    router.push("/workflows");
  }

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase();

    return templates.filter((t) => {
      const name = (t.name || "").toLowerCase();
      const trigger = (t.trigger || "").toLowerCase();
      return name.includes(q) || trigger.includes(q);
    });
  }, [templates, search]);

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%)] pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 mb-4">
              <Sparkles size={14} />
              Workflow templates
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Start faster with reusable workflow templates.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Pick a base template, clone it into your workflow list, and adapt it
              for your agency.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <MiniStat label="Templates" value={templates.length} />
            <MiniStat label="Ready" value="Instant use" />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates or trigger"
              className="w-full rounded-2xl border border-white/5 bg-black/20 pl-10 pr-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/10"
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-zinc-400">
            {filteredTemplates.length} shown
          </div>
        </div>
      </section>

      {filteredTemplates.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-400">
            <FileText size={24} />
          </div>
          <div className="text-lg font-medium">No templates found</div>
          <div className="mt-2 text-sm text-zinc-500">
            Try a different search or add custom templates later.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((t, i) => (
            <div
              key={t.id || i}
              className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <div className="h-11 w-11 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-center text-zinc-300 mb-4">
                    <Layers3 size={18} />
                  </div>

                  <div className="text-lg font-semibold tracking-tight">
                    {t.name}
                  </div>

                  <div className="mt-3">
                    <Badge label={`Trigger: ${t.trigger || "Manual"}`} tone="blue" />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                  {(t.steps || []).length} steps
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {(t.steps || []).slice(0, 3).map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 flex items-start gap-3"
                  >
                    <div className="mt-0.5 text-zinc-400">
                      {getStepIcon(step.type)}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm text-zinc-200">
                        {step.type || "Step"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 break-words">
                        {getStepText(step)}
                      </div>
                    </div>
                  </div>
                ))}

                {(t.steps || []).length > 3 && (
                  <div className="text-xs text-zinc-500 px-1">
                    + {(t.steps || []).length - 3} more steps
                  </div>
                )}
              </div>

              <button
                onClick={() => useTemplate(t)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-4 py-3 text-sm font-medium hover:opacity-90 transition"
              >
                <Copy size={15} />
                Use template
              </button>
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

function Badge({ label, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.05] text-zinc-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>
      {label}
    </span>
  );
}

function getStepIcon(type) {
  if (type === "Email") return <Mail size={15} />;
  if (type === "Notify") return <Bell size={15} />;
  if (type === "Trigger") return <Zap size={15} />;
  return <Workflow size={15} />;
}

function getStepText(step) {
  if (step.type === "Task") return step.config?.taskName || "Untitled task";
  if (step.type === "Email") return step.config?.subject || "No subject";
  if (step.type === "Notify") return step.config?.message || "No message";
  if (step.type === "Trigger") return "Uses workflow trigger";
  return "No details";
}