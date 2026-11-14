"use client";

import { useCallback, useEffect, useState } from "react";
import { formatExpiry } from "@/lib/format";
import type { CodeTtlKey } from "@/lib/routine";
import type { StoredRoutine } from "@/lib/store";
import RoutineEditorLoader from "../routines/RoutineEditorLoader";
import type { GuestSavedRoutine } from "../routines/RoutineEditor";

interface GuestCode {
  code: string;
  createdAt: number;
  expiresAt: number;
}

const TTL_OPTIONS: { key: CodeTtlKey; label: string }[] = [
  { key: "15m", label: "15 minutes" },
  { key: "1h", label: "1 hour" },
  { key: "24h", label: "24 hours" },
];

/**
 * Anonymous, ephemeral routine builder (spec: web-guest-routines).
 *
 * The guest authors one routine, sends it to the watch with an import code
 * and leaves: the routine is deleted when the page is left and expires after
 * 24 hours. There is no public link and nothing to come back to.
 */
export default function GuestBuilder() {
  const [routine, setRoutine] = useState<GuestSavedRoutine | null>(null);
  const [codes, setCodes] = useState<GuestCode[]>([]);
  const [freshCode, setFreshCode] = useState<GuestCode | null>(null);
  const [ttl, setTtl] = useState<CodeTtlKey>("1h");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  /** Bumped to reset the editor after the guest discards the routine. */
  const [editorKey, setEditorKey] = useState(0);

  /* ------------------------------------------------------------- workspace */

  const loadRoutine = useCallback(async (): Promise<GuestSavedRoutine | null> => {
    let res = await fetch("/api/guest/routine");
    if (res.status === 401) {
      // Direct visit without a workspace: start one.
      const session = await fetch("/api/guest/session", { method: "POST" });
      if (!session.ok) return null;
      res = await fetch("/api/guest/routine");
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data.routine ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRoutine()
      .then((routine) => {
        if (!cancelled) setRoutine(routine);
      })
      .catch(() => {
        if (!cancelled) setError("Could not start the guest session.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadRoutine]);

  // Leaving the page deletes the routine: the guest cannot come back to it.
  useEffect(() => {
    const leave = () => {
      try {
        navigator.sendBeacon("/api/guest/routine/leave");
      } catch {
        // The 24 h expiration is the fallback.
      }
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, []);

  /* ----------------------------------------------------------------- codes */

  const loadCodes = useCallback(async () => {
    const res = await fetch("/api/guest/routine/codes");
    if (!res.ok) return;
    const data = await res.json();
    setCodes(data.codes ?? []);
  }, []);

  async function onSaved(saved: GuestSavedRoutine) {
    setRoutine(saved);
    setFreshCode(null);
    // Saving replaces the previous routine, so its codes are gone.
    await loadCodes();
  }

  async function generateCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/guest/routine/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttl }),
      });
      if (res.ok) {
        const { code } = await res.json();
        setFreshCode(code);
        setCodes((prev) => [...prev, code]);
      } else if (res.status === 429) {
        setError("Too many codes. Try again later.");
      } else {
        setError("Could not generate the code.");
      }
    } catch {
      setError("Could not generate the code.");
    } finally {
      setBusy(false);
    }
  }

  /* --------------------------------------------------------------- discard */

  async function discard() {
    if (!window.confirm("Discard this routine? It cannot be recovered.")) return;
    setBusy(true);
    try {
      await fetch("/api/guest/routine/leave", { method: "POST" });
      setRoutine(null);
      setCodes([]);
      setFreshCode(null);
      // Start from a blank routine again.
      setEditorKey((key) => key + 1);
      const next = await loadRoutine();
      setRoutine(next);
    } catch {
      setError("Could not discard the routine.");
    } finally {
      setBusy(false);
    }
  }

  const editorInitial: StoredRoutine | undefined = routine
    ? {
        id: routine.id,
        owner: "",
        name: routine.name,
        steps: routine.steps,
        createdAt: routine.createdAt,
        updatedAt: routine.createdAt,
      }
    : undefined;

  return (
    <main>
      <div className="topbar">
        <div>
          <h1>Guest routine</h1>
          <p className="sub">
            {routine
              ? `Temporary routine — disappears ${formatExpiry(routine.expiresAt)}`
              : "Temporary routine — no account needed"}
          </p>
        </div>
        <div className="row">
          {routine && (
            <button className="danger" onClick={discard} disabled={busy}>
              Discard
            </button>
          )}
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 12 }}>
        This routine is temporary: it is deleted when you leave this page and
        disappears for good after 24 hours. It can only be sent to your watch
        with an import code — there is no public link to share.
      </div>

      {loading ? (
        <section className="card">
          <p className="muted center">Loading…</p>
        </section>
      ) : (
        <RoutineEditorLoader
          key={editorKey}
          mode={routine ? "edit" : "create"}
          initial={editorInitial}
          guest
          onSaved={onSaved}
        />
      )}

      {routine && (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="panel-title">Send to your watch</div>
          <p className="muted">
            Type the code on the watch. It stops working when you leave this
            page, and it never lasts longer than the routine itself.
          </p>

          {freshCode && (
            <p>
              <span className="code">{freshCode.code}</span>
              <br />
              <span className="muted">
                Valid {formatExpiry(freshCode.expiresAt)} — enter it on the
                watch.
              </span>
            </p>
          )}

          {codes.length > 0 && (
            <ul className="muted" style={{ paddingLeft: 18 }}>
              {codes.map((code) => (
                <li key={code.code}>
                  <span style={{ fontFamily: "var(--mono)" }}>{code.code}</span>
                  {" — expires "}
                  {formatExpiry(code.expiresAt)}
                </li>
              ))}
            </ul>
          )}

          {codes.length === 0 && !freshCode && (
            <p className="muted">No active codes.</p>
          )}

          <div className="row mt">
            <select
              value={ttl}
              onChange={(e) => setTtl(e.target.value as CodeTtlKey)}
              style={{ width: "auto" }}
            >
              {TTL_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="primary" onClick={generateCode} disabled={busy}>
              {busy ? "Generating…" : "Generate code"}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </section>
      )}
    </main>
  );
}
