"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Page() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function signIn() {
    setMessage("Sending magic link...");

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setMessage(error.message);
        console.error(error);
        return;
      }

      setMessage("Check your email for login link.");
    } catch (err) {
      console.error("signIn failed:", err);
      setMessage("Failed to fetch");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <div className="text-2xl mb-4">Login to Flowcore</div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 rounded mb-3"
        />

        <button
          onClick={signIn}
          className="w-full bg-blue-600 px-4 py-2 rounded"
        >
          Send Magic Link
        </button>

        {message && (
          <div className="text-sm text-zinc-400 mt-3">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}