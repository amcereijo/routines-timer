"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDuration, formatExpiry } from "@/lib/format";
import {
  CodeTtlKey,
  estimateRoutineSeconds,
  SHARE_TTL_PRESETS,
  ShareTtlKey,
} from "@/lib/routine";
import type { StoredCode, StoredRoutine, StoredShare } from "@/lib/store";

const SHARE_TTL_LABELS: Record<ShareTtlKey, string> = {
  "1h": "Expires in 1 hour",
  "24h": "Expires in 24 hours",
  "7d": "Expires in 7 days",
  "30d": "Expires in 30 days",
  never: "Never expires",
};

interface ShareWithUrl extends StoredShare {
  url: string;
}

export default function RoutineList({
  routines,
  viewer,
}: {
  routines: StoredRoutine[];
  /** Username of the signed-in account, to hide redundant owner labels. */
  viewer?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Record<string, "share" | "code">>({});

  async function remove(routine: StoredRoutine) {
    if (
      !window.confirm(
        `Delete "${routine.name}"? Its public links and import codes stop working.`
      )
    )
      return;
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
      {routines.map((routine) => {
        const activeTab = tab[routine.id] ?? "share";
        return (
          <article className="card" key={routine.id}>
            <div className="spread">
              <div className="grow">
                <h2>{routine.name}</h2>
                <p className="muted" style={{ marginTop: 4 }}>
                  {routine.steps.length} steps ·{" "}
                  {formatDuration(estimateRoutineSeconds(routine.steps))} total
                  {routine.owner && routine.owner !== viewer
                    ? ` · ${routine.owner}`
                    : ""}
                </p>
              </div>
              <div className="row">
                <Link href={`/routines/${routine.id}/edit`}>
                  <button className="small">Edit</button>
                </Link>
                <button
                  className="small danger"
                  onClick={() => remove(routine)}
                  disabled={busyId === routine.id}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="tabs" style={{ marginTop: 14 }}>
              <button
                className={activeTab === "share" ? "active" : ""}
                onClick={() => setTab((p) => ({ ...p, [routine.id]: "share" }))}
              >
                Public link
              </button>
              <button
                className={activeTab === "code" ? "active" : ""}
                onClick={() => setTab((p) => ({ ...p, [routine.id]: "code" }))}
              >
                Watch code
              </button>
            </div>

            {activeTab === "share" ? (
              <SharePanel routineId={routine.id} />
            ) : (
              <CodePanel routineId={routine.id} />
            )}
          </article>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- sharing */

function SharePanel({ routineId }: { routineId: string }) {
  const [shares, setShares] = useState<ShareWithUrl[] | null>(null);
  const [ttl, setTtl] = useState<ShareTtlKey>("7d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Load the links straight away — the panel is the default tab.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/routines/${routineId}/shares`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (cancelled) return;
        setShares(data.shares ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load the links");
        setShares([]);
      });
    return () => {
      cancelled = true;
    };
  }, [routineId]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/routines/${routineId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttl }),
      });
      if (!res.ok) throw new Error("failed");
      const { share } = await res.json();
      setShares((prev) => [share, ...(prev ?? [])]);
    } catch {
      setError("Could not create the link");
    } finally {
      setBusy(false);
    }
  }

  async function discard(token: string) {
    if (!window.confirm("Discard this public link? It stops working right away."))
      return;
    setError("");
    try {
      const res = await fetch(`/api/shares/${token}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        setShares((prev) => (prev ?? []).filter((s) => s.token !== token));
      } else {
        setError("Could not discard the link");
      }
    } catch {
      setError("Could not discard the link");
    }
  }

  async function copy(share: ShareWithUrl) {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(share.token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy to the clipboard");
    }
  }

  return (
    <div>
      <p className="muted">
        Anyone with the link can view the routine — no account needed.
      </p>

      {shares === null ? (
        <p className="muted mt-sm">Loading links…</p>
      ) : (
        <>
          {shares.length === 0 && (
            <p className="muted mt-sm">No public links yet.</p>
          )}
          {shares.map((share) => (
            <div className="share-item" key={share.token}>
              <div className="link-box">
                <code>{share.url}</code>
                <button
                  className="small"
                  onClick={() => copy(share)}
                  title="Copy link"
                >
                  {copied === share.token ? "Copied" : "Copy"}
                </button>
                <a
                  className="btn-link"
                  href={`/r/${share.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
                <button
                  className="small danger"
                  onClick={() => discard(share.token)}
                  title="Discard link"
                >
                  Discard
                </button>
              </div>
              <p className="hint">
                {share.expiresAt === 0
                  ? "Never expires"
                  : `Expires ${formatExpiry(share.expiresAt)}`}
              </p>
            </div>
          ))}

          <div className="row mt">
            <select
              value={ttl}
              onChange={(e) => setTtl(e.target.value as ShareTtlKey)}
              style={{ width: "auto" }}
            >
              {Object.keys(SHARE_TTL_PRESETS).map((key) => (
                <option key={key} value={key}>
                  {SHARE_TTL_LABELS[key as ShareTtlKey]}
                </option>
              ))}
            </select>
            <button className="primary" onClick={create} disabled={busy}>
              {busy ? "Creating…" : "Create public link"}
            </button>
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ watch codes */

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
    <div>
      <p className="muted">
        Short codes to type on the watch. The watch needs the phone app to
        fetch the routine.
      </p>
      <div className="row mt-sm">
        <button className="small" onClick={toggle}>
          {open ? "Hide codes" : "Show codes"}
        </button>
      </div>
      {open && (
        <div className="mt">
          {freshCode && (
            <p>
              <span className="code">{freshCode.code}</span>
              <br />
              <span className="muted">
                Valid for {formatExpiry(freshCode.expiresAt)} — enter it on the
                watch.
              </span>
            </p>
          )}
          {codes && codes.length > 0 && (
            <ul className="muted" style={{ paddingLeft: 18 }}>
              {codes.map((c) => (
                <li key={c.code}>
                  <span style={{ fontFamily: "var(--mono)" }}>{c.code}</span>
                  {" — expires "}
                  {formatExpiry(c.expiresAt)}
                </li>
              ))}
            </ul>
          )}
          {codes && codes.length === 0 && !freshCode && (
            <p className="muted">No active codes.</p>
          )}
          <div className="row mt">
            <select
              value={ttl}
              onChange={(e) => setTtl(e.target.value as CodeTtlKey)}
              style={{ width: "auto" }}
            >
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
