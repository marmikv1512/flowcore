"use client";

import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmModal";
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
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/lib/useAuth";

const defaultTemplates = [
  {
    id: "default-1",
    is_default: true,
    name: "Client onboarding",
    trigger: "Client Added",
    steps: [
      {
        id: "default-1-step-1",
        type: "Task",
        config: { taskName: "Create onboarding checklist" },
      },
      {
        id: "default-1-step-2",
        type: "Email",
        config: { subject: "Welcome client" },
      },
    ],
  },
  {
    id: "default-2",
    is_default: true,
    name: "Content approval",
    trigger: "Manual",
    steps: [
      {
        id: "default-2-step-1",
        type: "Task",
        config: { taskName: "Review content" },
      },
      {
        id: "default-2-step-2",
        type: "Notify",
        config: { message: "Approval needed" },
      },
    ],
  },
];

export default function Page() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const confirm = useConfirm();

  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [creatingId, setCreatingId] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
      return;
    }

    if (!authLoading && user) {
      loadTemplates();
    }
  }, [authLoading, user]);

  async function loadTemplates() {
    if (!user) return;

    setPageLoading(true);

    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      toast.error(error.message || "Failed to load templates");
      setPageLoading(false);
      return;
    }

    const customTemplates = (data || []).map((t) => ({
      ...t,
      is_default: false,
      steps: Array.isArray(t.steps) ? t.steps : [],
    }));

    setTemplates([...defaultTemplates, ...customTemplates]);
    setPageLoading(false);
  }

  async function useTemplate(t) {
    if (!user) return;

    setCreatingId(t.id);

    try {
      const newWorkflow = await toast.promise(
        (async () => {
          const { data: newWorkflow, error: workflowError } = await supabase
            .from("workflows")
            .insert([
              {
                name: t.name || "Untitled workflow",
                client_id: null,
                trigger: t.trigger || "Manual",
                is_active: true,
                run_count: 0,
                user_id: user.id,
              },
            ])
            .select()
            .single();

          if (workflowError) throw workflowError;

          const steps = Array.isArray(t.steps) ? t.steps : [];

          if (steps.length > 0) {
            const stepRows = steps.map((step, index) => ({
              workflow_id: newWorkflow.id,
              type: step.type,
              step_order: index,
              config: step.config || {},
              user_id: user.id,
            }));

            const { error: stepsError } = await supabase
              .from("workflow_steps")
              .insert(stepRows);

            if (stepsError) throw stepsError;
          }

          return newWorkflow;
        })(),
        {
          loading: "Creating workflow from template...",
          success: "Workflow created from template",
          error: (err) =>
            err.message || "Failed to create workflow from template",
        }
      );

      router.push(`/workflows/builder?id=${newWorkflow.id}`);
    } finally {
      setCreatingId(null);
    }
  }

  async function deleteTemplate(id) {
    if (!user) return;

    const ok = await confirm({
      title: "Delete template",
      description: "Are you sure you want to delete this template?",
    });

    if (!ok) return;

    const previousTemplates = templates;

    setTemplates((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setTemplates(previousTemplates);
      toast.error(error.message || "Failed to delete template");
      return;
    }

    toast.success("Template deleted");
  }

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase();

    return templates.filter((t) => {
      const name = (t.name || "").toLowerCase();
      const trigger = (t.trigger || "").toLowerCase();
      return name.includes(q) || trigger.includes(q);
    });
  }, [templates, search]);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">
        Loading templates...
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
              Workflow templates
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Start faster with reusable workflow templates.
            </h1>

            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
              Use a ready-made flow as the starting point, then finish it in the
              builder.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <MiniStat label="Templates" value={templates.length} />
            <MiniStat label="Source" value="Supabase" />
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
            Try a different search or create templates from your workflows.
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      label={`Trigger: ${t.trigger || "Manual"}`}
                      tone="blue"
                    />
                    <Badge
                      label={t.is_default ? "Default" : "Custom"}
                      tone={t.is_default ? "neutral" : "purple"}
                    />
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

              <div className="flex gap-3">
                <button
                  onClick={() => useTemplate(t)}
                  disabled={creatingId === t.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-4 py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
                >
                  <Copy size={15} />
                  {creatingId === t.id ? "Creating..." : "Use template"}
                </button>

                {!t.is_default && (
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 hover:bg-red-500/15 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
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

function Badge({ label, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.05] text-zinc-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    purple: "border-violet-500/20 bg-violet-500/10 text-violet-300",
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