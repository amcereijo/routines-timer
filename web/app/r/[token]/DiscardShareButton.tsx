"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Discards the public share link. Only rendered for the owner of the routine,
 * and the API rejects anyone else.
 */
export default function DiscardShareButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function discard() {
    if (
      !window.confirm(
        "Discard this public link? The page stops being available right away."
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/shares/${token}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        router.refresh();
      } else {
        setError("Could not discard the link.");
      }
    } catch {
      setError("Could not discard the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <button className="danger" onClick={discard} disabled={busy}>
        {busy ? "Discarding…" : "Discard link"}
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}
