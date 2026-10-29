"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIMITS, RoutineStep, validateRoutine } from "@/lib/routine";
import type { StoredRoutine } from "@/lib/store";

interface Props {
  mode: "create" | "edit";
  initial?: StoredRoutine;
}

interface StepForm {
  name: string;
  seconds: string;
  repeat: string;
  rest: string;
}

const emptyStep = (): StepForm => ({ name: "", seconds: "30", repeat: "", rest: "" });

export default function RoutineEditor({ mode, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [steps, setSteps] = useState<StepForm[]>(
    initial?.steps.map((s) => ({
      name: s.name,
      seconds: String(s.seconds),
      repeat: s.repeat !== undefined ? String(s.repeat) : "",
      rest: s.rest !== undefined ? String(s.rest) : "",
    })) ?? [emptyStep()]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateStep(i: number, patch: Partial<StepForm>) {
    setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  function moveStep(i: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function removeStep(i: number) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));
  }

  function toPayload() {
    return {
      name,
      steps: steps.map((s) => {
        const step: RoutineStep & { repeat?: number | ""; rest?: number | "" } = {
          name: s.name,
          seconds: Number(s.seconds),
        };
        if (s.repeat !== "") step.repeat = Number(s.repeat);
        if (s.rest !== "") step.rest = Number(s.rest);
        return step;
      }),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const payload = toPayload();

    // Client-side check with the shared validator (server re-validates).
    const result = validateRoutine(payload);
    setErrors(result.ok ? {} : result.errors);
    if (!result.ok) return;

    setBusy(true);
    try {
      const url = mode === "create" ? "/api/routines" : `/api/routines/${initial!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else if (res.status === 400) {
        const data = await res.json();
        setErrors(data.errors ?? {});
        setFormError("Please fix the errors below.");
      } else {
        setFormError("Save failed. Try again.");
      }
    } catch {
      setFormError("Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="topbar">
        <h1>{mode === "create" ? "New Routine" : "Edit Routine"}</h1>
        <button onClick={() => router.push("/")}>Cancel</button>
      </div>

      <form onSubmit={onSubmit}>
        <div className="card">
          <label htmlFor="name">Routine name (max {LIMITS.nameMax} chars)</label>
          <input
            id="name"
            value={name}
            maxLength={LIMITS.nameMax}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%" }}
          />
          {errors.name && <p className="error">{errors.name}</p>}
        </div>

        {steps.map((step, i) => (
          <div className="step-card" key={i}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <strong>Step {i + 1}</strong>
              <div className="row">
                <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === steps.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => removeStep(i)}
                  disabled={steps.length === 1}
                >
                  ×
                </button>
              </div>
            </div>
            <label>Name</label>
            <input
              value={step.name}
              maxLength={LIMITS.stepNameMax}
              onChange={(e) => updateStep(i, { name: e.target.value })}
              style={{ width: "100%", marginBottom: 10 }}
            />
            {errors[`steps.${i}.name`] && (
              <p className="error">{errors[`steps.${i}.name`]}</p>
            )}
            <div className="grid3">
              <div>
                <label>Duration (s)</label>
                <input
                  type="number"
                  min={LIMITS.secondsMin}
                  max={LIMITS.secondsMax}
                  value={step.seconds}
                  onChange={(e) => updateStep(i, { seconds: e.target.value })}
                />
                {errors[`steps.${i}.seconds`] && (
                  <p className="error">{errors[`steps.${i}.seconds`]}</p>
                )}
              </div>
              <div>
                <label>Repeat (opt)</label>
                <input
                  type="number"
                  min={LIMITS.repeatMin}
                  max={LIMITS.repeatMax}
                  value={step.repeat}
                  placeholder="1"
                  onChange={(e) => updateStep(i, { repeat: e.target.value })}
                />
                {errors[`steps.${i}.repeat`] && (
                  <p className="error">{errors[`steps.${i}.repeat`]}</p>
                )}
              </div>
              <div>
                <label>Rest (s, opt)</label>
                <input
                  type="number"
                  min={LIMITS.restMin}
                  max={LIMITS.restMax}
                  value={step.rest}
                  placeholder="10"
                  onChange={(e) => updateStep(i, { rest: e.target.value })}
                />
                {errors[`steps.${i}.rest`] && (
                  <p className="error">{errors[`steps.${i}.rest`]}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {errors.steps && <p className="error">{errors.steps}</p>}
        {formError && <p className="error">{formError}</p>}

        <div className="row mt">
          <button
            type="button"
            onClick={() => setSteps((prev) => [...prev, emptyStep()])}
            disabled={steps.length >= LIMITS.stepsMax}
          >
            + Add step
          </button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </main>
  );
}
