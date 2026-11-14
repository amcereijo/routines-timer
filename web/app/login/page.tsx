"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PublicUser {
  username: string;
  name: string;
}

/**
 * Where account requests go. Accounts are created by hand for now, so the
 * login page points visitors at this address instead of a sign-up form.
 */
const REQUEST_ACCOUNT_MAILTO =
  "mailto:amcereijo+routinestimer@gmail.com" +
  "?subject=Routines%20Timer%20account%20request" +
  "&body=Hi!%20I%20would%20like%20an%20account%20for%20the%20Routines%20Timer%20web%20builder.";

/**
 * Path the user was heading to before being asked to sign in (the proxy
 * keeps it in the `next` query parameter). Only same-site paths are
 * accepted, so the parameter cannot be used to redirect somewhere else.
 */
function nextPath(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next") || "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [mode, setMode] = useState<string>("users");
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState("");

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
        router.push(nextPath());
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

  /** Start the anonymous, ephemeral guest flow (no account, no credentials). */
  async function continueAsGuest() {
    setGuestBusy(true);
    setGuestError("");
    try {
      const res = await fetch("/api/guest/session", { method: "POST" });
      if (res.ok) {
        router.push("/guest");
        router.refresh();
      } else if (res.status === 429) {
        setGuestError("Too many requests. Try again later.");
      } else {
        setGuestError("Could not start the guest session.");
      }
    } catch {
      setGuestError("Could not start the guest session.");
    } finally {
      setGuestBusy(false);
    }
  }

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

          <div className="divider" />
          <p className="muted">
            No account yet? For now, accounts are created on personal request
            only —{" "}
            <a href={REQUEST_ACCOUNT_MAILTO}>send an email to request one</a>.
          </p>
        </form>
      </div>

      <div className="card">
        <h2>Just sending one routine to your watch?</h2>
        <p className="muted" style={{ margin: "5px 0 12px" }}>
          Skip the sign-in and build a single routine — no account needed.
        </p>
        <button
          className="cta"
          type="button"
          onClick={continueAsGuest}
          disabled={guestBusy}
        >
          {guestBusy ? "Starting…" : "Continue as guest"}
        </button>
        {guestError && <p className="error">{guestError}</p>}
        <p className="hint">
          The routine is temporary: it is deleted when you leave the page and
          disappears after 24 hours. It can only be sent to your watch with an
          import code.
        </p>
      </div>

      <div className="card app-promo">
        <Image
          className="app-promo-icon"
          src="/watch-app-icon.png"
          alt="Routines Timer watch app icon"
          width={64}
          height={64}
        />
        <div className="grow">
          <h2>Routines Timer is also on your wrist</h2>
          <p className="muted" style={{ marginTop: 5 }}>
            The companion Zepp OS app for the Amazfit Balance runs your
            routines on the watch — look for this icon. Anything you build
            here comes back to the watch with an 8-character import code: in
            the app, go to Add Routine → In the web app → Enter code.
          </p>
        </div>
      </div>
    </main>
  );
}
