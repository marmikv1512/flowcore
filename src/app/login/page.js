"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      window.location.href = "/dashboard";
    }
  }

  async function login() {
    if (!email || !password) {
      setMessage("Enter email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(error);
        setMessage(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("login failed:", err);
      setMessage("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <div className="text-2xl mb-2">LOGIN V2 PASSWORD TEST</div>
        <div className="text-sm text-zinc-400 mb-4">
          Login only. No signup. No magic link.
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 rounded mb-3 outline-none"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 rounded mb-3 outline-none"
        />

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 rounded"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {message ? (
          <div className="text-sm text-zinc-400 mt-3">{message}</div>
        ) : null}
      </div>
    </div>
  );
}