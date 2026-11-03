"use client";

import dynamic from "next/dynamic";
import type { StoredRoutine } from "@/lib/store";

/**
 * The editor reads the unsaved draft from localStorage, so it only makes
 * sense in the browser: it is loaded client-side to keep the server render
 * and the first client render in sync.
 */
const RoutineEditor = dynamic(() => import("./RoutineEditor"), {
  ssr: false,
  loading: () => (
    <main>
      <p className="muted center">Loading editor…</p>
    </main>
  ),
});

export default function RoutineEditorLoader(props: {
  mode: "create" | "edit";
  initial?: StoredRoutine;
}) {
  return <RoutineEditor {...props} />;
}
