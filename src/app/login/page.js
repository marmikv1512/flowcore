"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Page() {
  const [mode, setMode] = useState("login"); // login | signup
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
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("session error:", error);
      return;
    }

    if (session) {
      window.location.href = "/";
    }
  }

  async function handleAuth() {
    if (!email || !password) {
      setMessage("Enter email and password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("login error:", error);
          setMessage(error.message);
          setLoading(false);
          return;
        }

        window.location.href = "/";
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("signup error:", error);
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage(
        "Signup successful. If email confirmation is enabled, check your inbox. Then log in."
      );
      setMode("login");
    } catch (err) {
      console.error("auth failed:", err);
      setMessage("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <div className="text-2xl mb-2">
          {mode === "login" ? "Login to Flowcore" : "Create your Flowcore account"}
        </div>

        <div className="text-sm text-zinc-400 mb-4">
          {mode === "login"
            ? "Use your email and password to log in."
            : "Create an account with email and password."}
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
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 rounded"
        >
          {loading
            ? mode === "login"
              ? "Logging in..."
              : "Creating account..."
            : mode === "login"
            ? "Login"
            : "Sign Up"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
          className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded"
        >
          {mode === "login"
            ? "Need an account? Sign Up"
            : "Already have an account? Login"}
        </button>

        {message ? (
          <div className="text-sm text-zinc-400 mt-3">{message}</div>
        ) : null}
      </div>
    </div>
  );
}