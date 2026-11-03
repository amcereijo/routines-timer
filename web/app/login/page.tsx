"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PublicUser {
  username: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [mode, setMode] = useState<string>("users");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const list: PublicUser[] = data.users ?? [];
        setUsers(list);
        setMode(data.mode ?? "users");
        // With a single account the field is still shown, but pre-filled, so
        // signing in is just "type the password".
        if (list.length === 1) {
          setUsername(list[0].username);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else if (res.status === 429) {
        setError("Too many attempts. Try again later.");
      } else if (res.status === 500) {
        setError("Login is not configured on this deployment.");
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setError("Login failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const singleUser = users.length === 1;

  return (
    <main>
      <div className="center" style={{ marginBottom: 22 }}>
        <h1>Routines Timer Builder</h1>
        <p className="muted">Sign in to build and share routines</p>
      </div>

      <div className="card">
        <form onSubmit={onSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            list="known-users"
            autoFocus={!singleUser}
            style={{ marginBottom: 12 }}
          />
          <datalist id="known-users">
            {users.map((u) => (
              <option key={u.username} value={u.username}>
                {u.name}
              </option>
            ))}
          </datalist>

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus={singleUser}
          />
          {error && <p className="error">{error}</p>}

          <div className="mt">
            <button
              className="primary"
              type="submit"
              disabled={busy || !password}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>

          {mode === "legacy" && (
            <p className="hint">
              Single-operator mode — the user name is fixed. Set{" "}
              <code>AUTH_USERS</code> to allow several accounts.
            </p>
          )}
          {mode === "users" && users.length > 1 && (
            <p className="hint">
              Pick your name from the list, or type it in.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
