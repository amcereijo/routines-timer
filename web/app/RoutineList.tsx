"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StoredCode, StoredRoutine } from "@/lib/store";
import type { CodeTtlKey, RoutineStep } from "@/lib/routine";

function totalSeconds(steps: RoutineStep[]): number {
  return steps.reduce((acc, s) => acc + (s.seconds || 0), 0);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function expiresIn(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export default function RoutineList({ routines }: { routines: StoredRoutine[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(routine: StoredRoutine) {
    if (!window.confirm(`Delete "${routine.name}" and its active codes?`)) return;
    setBusyId(routine.id);
    try {
      await fetch(`/api/routines/${routine.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {routines.map((r) => (
        <div className="card" key={r.id}>
          <div className="spread">
            <div>
              <h2>{r.name}</h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {r.steps.length} steps · {formatDuration(totalSeconds(r.steps))}
              </p>
            </div>
            <div className="row">
              <Link href={`/routines/${r.id}/edit`}>
                <button>Edit</button>
              </Link>
              <button
                className="danger"
                onClick={() => remove(r)}
                disabled={busyId === r.id}
              >
                Delete
              </button>
            </div>
          </div>
          <CodePanel routineId={r.id} />
        </div>
      ))}
    </div>
  );
}

function CodePanel({ routineId }: { routineId: string }) {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<StoredCode[] | null>(null);
  const [ttl, setTtl] = useState<CodeTtlKey>("1h");
  const [freshCode, setFreshCode] = useState<StoredCode | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    const res = await fetch(`/api/routines/${routineId}/codes`);
    if (res.ok) {
      setCodes((await res.json()).codes);
    } else {
      setError("Could not load codes");
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && codes === null) await load();
  }

  async function generate() {
    setBusy(true);
    setError("");
    setFreshCode(null);
    try {
      const res = await fetch(`/api/routines/${routineId}/codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttl }),
      });
      if (res.ok) {
        const { code } = await res.json();
        setFreshCode(code);
        setCodes((prev) => [...(prev ?? []), code]);
      } else {
        setError("Could not generate code");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt">
      <button onClick={toggle}>{open ? "Hide codes" : "Import codes"}</button>
      {open && (
        <div className="mt">
          {freshCode && (
            <p>
              <span className="code">{freshCode.code}</span>
              <br />
              <span className="muted">
                Valid for {expiresIn(freshCode.expiresAt)} — enter it on the watch.
              </span>
            </p>
          )}
          {codes && codes.length > 0 && (
            <ul className="muted" style={{ paddingLeft: 18 }}>
              {codes.map((c) => (
                <li key={c.code}>
                  <span style={{ fontFamily: "var(--mono)" }}>{c.code}</span>
                  {" — expires in "}
                  {expiresIn(c.expiresAt)}
                </li>
              ))}
            </ul>
          )}
          {codes && codes.length === 0 && !freshCode && (
            <p className="muted">No active codes.</p>
          )}
          <div className="row mt">
            <select value={ttl} onChange={(e) => setTtl(e.target.value as CodeTtlKey)}>
              <option value="15m">15 minutes</option>
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
            </select>
            <button className="primary" onClick={generate} disabled={busy}>
              {busy ? "Generating…" : "Generate code"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
