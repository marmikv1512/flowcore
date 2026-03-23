"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const custom = JSON.parse(localStorage.getItem("templates")) || [];

    const defaults = [
      {
        id: 1,
        name: "Client onboarding",
        trigger: "Client Added",
        steps: [
          { id: 11, type: "Task", config: { taskName: "Create onboarding checklist" } },
          { id: 12, type: "Email", config: { subject: "Welcome client" } },
        ],
      },
      {
        id: 2,
        name: "Content approval",
        trigger: "Manual",
        steps: [
          { id: 21, type: "Task", config: { taskName: "Review content" } },
          { id: 22, type: "Notify", config: { message: "Approval needed" } },
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

  return (
    <div>
      <div className="text-2xl mb-6">Templates</div>

      <div className="grid grid-cols-2 gap-4">
        {templates.map((t, i) => (
          <div
            key={t.id || i}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"
          >
            <div className="text-lg mb-1">{t.name}</div>

            <div className="text-xs text-blue-400 mb-3">
              Trigger: {t.trigger || "Manual"}
            </div>

            <button
              onClick={() => useTemplate(t)}
              className="bg-blue-600 px-3 py-1 rounded"
            >
              Use template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}