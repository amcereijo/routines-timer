"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDuration, formatDurationInput, parseDuration } from "@/lib/format";
import { fileToDataUrl } from "@/lib/images";
import {
  estimateRoutineSeconds,
  estimateWorkSeconds,
  LIMITS,
  type RoutineStep,
  validateRoutine,
} from "@/lib/routine";
import type { StoredRoutine } from "@/lib/store";

interface Props {
  mode: "create" | "edit";
  initial?: StoredRoutine;
}

interface StepForm {
  key: string;
  name: string;
  /** Free text duration: "45" (seconds) or "1:30" (m:ss). */
  duration: string;
  repeat: string;
  rest: string;
  description: string;
  images: string[];
  links: string[];
}

interface Template {
  id: string;
  label: string;
  steps: Omit<StepForm, "key">[];
}

const TEMPLATES: Template[] = [
  {
    id: "empty",
    label: "Blank",
    steps: [
      { name: "", duration: "30", repeat: "", rest: "", description: "", images: [], links: [] },
    ],
  },
  {
    id: "tabata",
    label: "Tabata 8×20/10",
    steps: [
      { name: "Work", duration: "20", repeat: "8", rest: "10", description: "", images: [], links: [] },
    ],
  },
  {
    id: "hiit",
    label: "HIIT 10×30/15",
    steps: [
      { name: "Work", duration: "30", repeat: "10", rest: "15", description: "", images: [], links: [] },
    ],
  },
  {
    id: "warmup",
    label: "Warm-up / Main / Cool-down",
    steps: [
      { name: "Warm up", duration: "5:00", repeat: "", rest: "", description: "", images: [], links: [] },
      { name: "Main set", duration: "20:00", repeat: "", rest: "", description: "", images: [], links: [] },
      { name: "Cool down", duration: "5:00", repeat: "", rest: "", description: "", images: [], links: [] },
    ],
  },
];

const QUICK_DURATIONS = ["15", "30", "45", "60", "90", "2:00", "5:00"];

const newKey = () => Math.random().toString(36).slice(2, 10);

const emptyStep = (): StepForm => ({
  key: newKey(),
  name: "",
  duration: "30",
  repeat: "",
  rest: "",
  description: "",
  images: [],
  links: [],
});

interface Draft {
  name?: string;
  steps?: StepForm[];
  savedAt?: number;
}

/**
 * Read the unsaved draft of this editor from localStorage. Only a draft
 * newer than the stored routine is restored.
 */
function loadDraft(
  draftKey: string,
  mode: Props["mode"],
  initial?: StoredRoutine
): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (!draft?.steps?.length) return null;
    if (mode === "edit" && (draft.savedAt ?? 0) <= (initial?.updatedAt ?? 0)) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function toForm(step: RoutineStep): StepForm {
  return {
    key: newKey(),
    name: step.name ?? "",
    duration: formatDurationInput(step.seconds ?? 0),
    repeat: step.repeat !== undefined ? String(step.repeat) : "",
    rest: step.rest !== undefined ? String(step.rest) : "",
    description: step.description ?? "",
    images: step.images ? [...step.images] : [],
    links: step.links ? [...step.links] : [],
  };
}

/** Content fingerprint of the editor state (ignores the local step keys). */
function signature(name: string, steps: StepForm[]): string {
  return JSON.stringify({
    name,
    steps: steps.map((s) => ({
      name: s.name,
      duration: s.duration,
      repeat: s.repeat,
      rest: s.rest,
      description: s.description,
      images: s.images,
      links: s.links,
    })),
  });
}

export default function RoutineEditor({ mode, initial }: Props) {
  const router = useRouter();

  const draftKey = `rt_draft_${mode}_${initial?.id ?? "new"}`;
  // The editor is client-only (see RoutineEditorLoader), so the draft can be
  // read while the first state is built — no flash, no hydration mismatch.
  const [draft] = useState(() => loadDraft(draftKey, mode, initial));

  const [name, setName] = useState(
    () => draft?.name ?? initial?.name ?? ""
  );
  const [steps, setSteps] = useState<StepForm[]>(
    () => draft?.steps ?? initial?.steps.map(toForm) ?? [emptyStep()]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [draftRestored, setDraftRestored] = useState(Boolean(draft));
  const [imageError, setImageError] = useState("");

  /* ---------------------------------------------------------- draft saving */

  // The state the editor started with — a draft is only worth keeping when
  // the author actually changed something.
  const initialSignature = useMemo(
    () => signature(initial?.name ?? "", initial?.steps.map(toForm) ?? [emptyStep()]),
    [initial]
  );

  // Autosave the draft so a refresh does not lose the work.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        if (signature(name, steps) === initialSignature) {
          window.localStorage.removeItem(draftKey);
          return;
        }
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({ name, steps, savedAt: Date.now() })
        );
      } catch {
        // storage full or unavailable — the draft is a convenience only
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [name, steps, draftKey, initialSignature]);

  /* ---------------------------------------------------------------- helpers */

  const updateStep = useCallback((i: number, patch: Partial<StepForm>) => {
    setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }, []);

  const moveStep = useCallback((i: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const removeStep = useCallback((i: number) => {
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));
  }, []);

  const duplicateStep = useCallback((i: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const copy = { ...next[i], key: newKey() };
      next.splice(i + 1, 0, copy);
      return next;
    });
  }, []);

  const addStep = useCallback((after?: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const index = after === undefined ? next.length : after + 1;
      next.splice(index, 0, emptyStep());
      return next;
    });
  }, []);

  const applyTemplate = (template: Template) => {
    setSteps(template.steps.map((step) => ({ ...step, key: newKey() })));
    setErrors({});
  };

  const reorderTo = (from: number, to: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  /* ---------------------------------------------------------------- images */

  async function onPickImages(i: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageError("");
    const current = steps[i]?.images ?? [];
    const room = LIMITS.imagesMax - current.length;
    if (room <= 0) {
      setImageError(`A step can hold ${LIMITS.imagesMax} images.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const added: string[] = [];
    for (const file of picked) {
      try {
        added.push(await fileToDataUrl(file));
      } catch {
        setImageError(`Could not read "${file.name}".`);
      }
    }
    if (added.length) {
      setSteps((prev) =>
        prev.map((s, j) =>
          j === i ? { ...s, images: [...s.images, ...added].slice(0, LIMITS.imagesMax) } : s
        )
      );
    }
  }

  const removeImage = (i: number, j: number) => {
    setSteps((prev) =>
      prev.map((s, k) =>
        k === i ? { ...s, images: s.images.filter((_, x) => x !== j) } : s
      )
    );
  };

  /* ----------------------------------------------------------------- links */

  const addLink = (i: number) => {
    setSteps((prev) =>
      prev.map((s, j) =>
        j === i && s.links.length < LIMITS.linksMax
          ? { ...s, links: [...s.links, ""] }
          : s
      )
    );
  };

  const updateLink = (i: number, j: number, value: string) => {
    setSteps((prev) =>
      prev.map((s, k) =>
        k === i ? { ...s, links: s.links.map((l, x) => (x === j ? value : l)) } : s
      )
    );
  };

  const removeLink = (i: number, j: number) => {
    setSteps((prev) =>
      prev.map((s, k) =>
        k === i ? { ...s, links: s.links.filter((_, x) => x !== j) } : s
      )
    );
  };

  /* ------------------------------------------------------------------ save */

  function toPayload() {
    return {
      name,
      steps: steps.map((s) => {
        const seconds = parseDuration(s.duration);
        const step: RoutineStep & { repeat?: number; rest?: number } = {
          name: s.name,
          seconds: seconds ?? 0,
        };
        if (s.repeat !== "") step.repeat = Number(s.repeat);
        if (s.rest !== "") step.rest = Number(s.rest);
        const description = s.description.trim();
        if (description) step.description = description;
        if (s.images.length) step.images = s.images;
        const links = s.links.map((l) => l.trim()).filter(Boolean);
        if (links.length) step.links = links;
        return step;
      }),
    };
  }

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setFormError("");
    const payload = toPayload();

    // Client-side check with the shared validator (server re-validates).
    const result = validateRoutine(payload);
    setErrors(result.ok ? {} : result.errors);
    if (!result.ok) {
      setFormError("Please fix the errors below.");
      return;
    }

    setBusy(true);
    try {
      const url = mode === "create" ? "/api/routines" : `/api/routines/${initial!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
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

  /* ---------------------------------------------------------------- totals */

  const previewSteps = useMemo(
    () =>
      steps.map((s) => ({
        key: s.key,
        name: s.name,
        seconds: parseDuration(s.duration) ?? 0,
        repeat: s.repeat ? Number(s.repeat) : undefined,
        rest: s.rest ? Number(s.rest) : undefined,
      })),
    [steps]
  );
  const totalSeconds = estimateRoutineSeconds(previewSteps);
  const workSeconds = estimateWorkSeconds(previewSteps);

  return (
    <main>
      <div className="topbar">
        <div className="row">
          <button className="ghost" onClick={() => router.push("/")}>
            ← Back
          </button>
          <div>
            <h1>{mode === "create" ? "New routine" : "Edit routine"}</h1>
            <p className="sub">
              {steps.length} step{steps.length === 1 ? "" : "s"} ·{" "}
              {formatDuration(totalSeconds)} total
            </p>
          </div>
        </div>
        <button className="primary" onClick={() => onSubmit()} disabled={busy}>
          {busy ? "Saving…" : "Save routine"}
        </button>
      </div>

      {draftRestored && (
        <div className="notice spread" style={{ marginBottom: 12 }}>
          <span>An unsaved draft was restored.</span>
          <button
            className="small danger"
            onClick={() => {
              try {
                window.localStorage.removeItem(draftKey);
              } catch {
                // ignore
              }
              setDraftRestored(false);
              setName(initial?.name ?? "");
              setSteps(initial?.steps.map(toForm) ?? [emptyStep()]);
            }}
          >
            Discard draft
          </button>
        </div>
      )}

      <section className="card">
        <label htmlFor="name">Routine name</label>
        <input
          id="name"
          className="title-input"
          value={name}
          maxLength={LIMITS.nameMax}
          onChange={(e) => setName(e.target.value)}
          placeholder="Morning workout"
        />
        <p className="hint">
          Shown on the watch — {name.trim().length}/{LIMITS.nameMax} characters.
        </p>
        {errors.name && <p className="error">{errors.name}</p>}

        <div className="templates">
          <span className="muted">Start from a template:</span>
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              className="chip"
              onClick={() => applyTemplate(template)}
            >
              {template.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card summary">
        <div>
          <div className="value">{steps.length}</div>
          <div className="label">Steps</div>
        </div>
        <div>
          <div className="value">{formatDuration(totalSeconds)}</div>
          <div className="label">Total time</div>
        </div>
        <div>
          <div className="value">{formatDuration(workSeconds)}</div>
          <div className="label">Work time</div>
        </div>
      </section>

      {steps.map((step, i) => {
        const isCollapsed = collapsed[step.key] ?? false;
        const seconds = parseDuration(step.duration) ?? 0;
        return (
          <section
            className={`step-card${dragIndex === i ? " dragging" : ""}${
              dropIndex === i && dragIndex !== null && dragIndex !== i
                ? " drop-target"
                : ""
            }`}
            key={step.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDropIndex(i);
            }}
            onDragLeave={() => setDropIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) reorderTo(dragIndex, i);
              setDragIndex(null);
              setDropIndex(null);
            }}
          >
            <div
              className="step-head"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
            >
              <span className="step-index">{i + 1}</span>
              <div className="step-title">
                <strong>{step.name.trim() || "Untitled step"}</strong>
                <div className="step-meta">
                  {formatDuration(seconds)}
                  {step.repeat ? ` × ${step.repeat}` : ""}
                  {step.description.trim() ? " · has notes" : ""}
                  {step.images.length ? ` · ${step.images.length} image(s)` : ""}
                  {step.links.filter((l) => l.trim()).length
                    ? ` · ${step.links.filter((l) => l.trim()).length} link(s)`
                    : ""}
                </div>
              </div>
              <div className="row">
                <button
                  className="small ghost"
                  title="Move up"
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  className="small ghost"
                  title="Move down"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === steps.length - 1}
                >
                  ↓
                </button>
                <button
                  className="small ghost"
                  title="Duplicate step"
                  onClick={() => duplicateStep(i)}
                >
                  Duplicate
                </button>
                <button
                  className="small danger"
                  title="Delete step"
                  onClick={() => removeStep(i)}
                  disabled={steps.length === 1}
                >
                  Delete
                </button>
                <button
                  className="small ghost"
                  title={isCollapsed ? "Expand" : "Collapse"}
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [step.key]: !isCollapsed }))
                  }
                >
                  {isCollapsed ? "▾" : "▸"}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="step-body">
                <div className="field">
                  <label htmlFor={`step-name-${step.key}`}>Step name</label>
                  <input
                    id={`step-name-${step.key}`}
                    value={step.name}
                    maxLength={LIMITS.stepNameMax}
                    onChange={(e) => updateStep(i, { name: e.target.value })}
                    placeholder="Work, Rest, Stretch…"
                  />
                  {errors[`steps.${i}.name`] && (
                    <p className="error">{errors[`steps.${i}.name`]}</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor={`step-description-${step.key}`}>
                    Description (optional)
                  </label>
                  <textarea
                    id={`step-description-${step.key}`}
                    rows={3}
                    value={step.description}
                    maxLength={LIMITS.descriptionMax}
                    onChange={(e) => updateStep(i, { description: e.target.value })}
                    placeholder="How to do it, what to watch out for…"
                  />
                  <p className="hint">
                    Notes for whoever follows the routine —{" "}
                    {step.description.length}/{LIMITS.descriptionMax} characters.
                    Shown on the public page, not on the watch.
                  </p>
                  {errors[`steps.${i}.description`] && (
                    <p className="error">{errors[`steps.${i}.description`]}</p>
                  )}
                </div>

                <div className="grid3" style={{ marginTop: 12 }}>
                  <div>
                    <label htmlFor={`step-duration-${step.key}`}>Duration</label>
                    <input
                      id={`step-duration-${step.key}`}
                      value={step.duration}
                      onChange={(e) => updateStep(i, { duration: e.target.value })}
                      placeholder="45 or 1:30"
                      inputMode="numeric"
                    />
                    {errors[`steps.${i}.seconds`] && (
                      <p className="error">{errors[`steps.${i}.seconds`]}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`step-repeat-${step.key}`}>Repeat</label>
                    <input
                      id={`step-repeat-${step.key}`}
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
                    <label htmlFor={`step-rest-${step.key}`}>Rest (s)</label>
                    <input
                      id={`step-rest-${step.key}`}
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

                <div className="row" style={{ marginTop: 8 }}>
                  <span className="muted">Quick:</span>
                  {QUICK_DURATIONS.map((value) => (
                    <button
                      key={value}
                      className="chip"
                      onClick={() => updateStep(i, { duration: value })}
                    >
                      {value}
                    </button>
                  ))}
                </div>

                <div className="field">
                  <label>
                    Images ({step.images.length}/{LIMITS.imagesMax})
                  </label>
                  <div className="thumbs">
                    {step.images.map((src, j) => (
                      <div className="thumb" key={j}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Illustration for step ${i + 1}`} />
                        <button
                          className="remove"
                          onClick={() => removeImage(i, j)}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {step.images.length < LIMITS.imagesMax && (
                      <label className="thumb add">
                        + Add
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            onPickImages(i, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="hint">
                    Up to {LIMITS.imagesMax} pictures per step. They are shrunk
                    in your browser and shown on the public page.
                  </p>
                  {errors[`steps.${i}.images`] && (
                    <p className="error">{errors[`steps.${i}.images`]}</p>
                  )}
                </div>

                <div className="field">
                  <label>
                    Links ({step.links.length}/{LIMITS.linksMax})
                  </label>
                  {step.links.map((link, j) => (
                    <div className="row" key={j} style={{ marginBottom: 6 }}>
                      <input
                        value={link}
                        onChange={(e) => updateLink(i, j, e.target.value)}
                        placeholder="https://example.com/moves"
                        inputMode="url"
                      />
                      <button
                        className="small danger"
                        onClick={() => removeLink(i, j)}
                        title="Remove link"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {step.links.length < LIMITS.linksMax && (
                    <button className="small" onClick={() => addLink(i)}>
                      + Add link
                    </button>
                  )}
                  {errors[`steps.${i}.links`] && (
                    <p className="error">{errors[`steps.${i}.links`]}</p>
                  )}
                </div>

                <div className="row" style={{ marginTop: 12 }}>
                  <button className="small" onClick={() => addStep(i)}>
                    + Add step below
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {errors.steps && <p className="error">{errors.steps}</p>}
      {imageError && <p className="error">{imageError}</p>}
      {formError && (
        <p className="notice error" style={{ marginBottom: 12 }}>
          {formError}
        </p>
      )}

      <div className="row">
        <button
          onClick={() => addStep()}
          disabled={steps.length >= LIMITS.stepsMax}
        >
          + Add step
        </button>
        <button
          className="ghost"
          onClick={() => setShowPreview((prev) => !prev)}
        >
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        <button className="primary" onClick={() => onSubmit()} disabled={busy}>
          {busy ? "Saving…" : "Save routine"}
        </button>
      </div>

      {showPreview && (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="panel-title">Preview on the watch</div>
          {previewSteps.map((step, i) => (
            <div className="spread" key={step.key} style={{ padding: "6px 0" }}>
              <span>
                {i + 1}. {step.name.trim() || `Step ${i + 1}`}
              </span>
              <span className="muted">
                {formatDuration(step.seconds)}
                {step.repeat ? ` × ${step.repeat}` : ""}
                {step.rest ? ` · rest ${step.rest}s` : ""}
              </span>
            </div>
          ))}
          <div className="divider" />
          <div className="spread">
            <span className="muted">Total</span>
            <strong>{formatDuration(totalSeconds)}</strong>
          </div>
        </section>
      )}
    </main>
  );
}
