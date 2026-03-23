"use client";

import "./globals.css";
import Link from "next/link";
import {
  LayoutDashboard,
  Workflow,
  Users,
  FileText,
  Activity,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function RootLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (pathname === "/login") {
    return (
      <html lang="en">
        <body className="bg-zinc-950 text-white">{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white">
        <div className="flex h-screen">
          <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col">
            <div className="text-xl font-semibold mb-6">Flowcore</div>

            <nav className="flex flex-col gap-1 text-sm">
              <SidebarLink href="/" icon={<LayoutDashboard size={18} />} text="Dashboard" />
              <SidebarLink href="/workflows" icon={<Workflow size={18} />} text="Workflows" />
              <SidebarLink href="/templates" icon={<FileText size={18} />} text="Templates" />
              <SidebarLink href="/clients" icon={<Users size={18} />} text="Clients" />
              <SidebarLink href="/logs" icon={<Activity size={18} />} text="Logs" />
              <SidebarLink href="/settings" icon={<Settings size={18} />} text="Settings" />
            </nav>
          </aside>

          <div className="flex-1 flex flex-col">
            <div className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-6">
              <div className="text-zinc-400">Flowcore Dashboard</div>

              <button
                onClick={logout}
                className="bg-zinc-800 px-3 py-1 rounded"
              >
                Logout
              </button>
            </div>

            <main className="flex-1 p-8 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

function SidebarLink({ href, icon, text }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white"
    >
      {icon}
      {text}
    </Link>
  );
}