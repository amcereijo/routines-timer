"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else if (res.status === 429) {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Login failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Routines Timer Builder</h1>
      <div className="card">
        <form onSubmit={onSubmit}>
          <label htmlFor="password">Operator password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{ width: "100%" }}
          />
          {error && <p className="error">{error}</p>}
          <div className="mt">
            <button className="primary" type="submit" disabled={busy || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
