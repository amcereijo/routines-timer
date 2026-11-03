"use client";

import { useState } from "react";

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions) — the URL stays selectable.
    }
  }

  return (
    <button className="small" onClick={copy}>
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
