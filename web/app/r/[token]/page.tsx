import { notFound } from "next/navigation";
import { canAccessOwnedResource } from "@/lib/auth";
import { getServerUser } from "@/lib/currentUser";
import { formatDuration, formatExpiry } from "@/lib/format";
import { estimateRoutineSeconds } from "@/lib/routine";
import { getRoutine, getShare } from "@/lib/store";
import CopyLinkButton from "./CopyLinkButton";
import DiscardShareButton from "./DiscardShareButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shared routine",
  robots: { index: false, follow: false },
};

export default async function SharedRoutinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const share = await getShare(token);
  const routine = share ? await getRoutine(share.routineId) : null;
  if (!share || !routine) notFound();

  const user = await getServerUser();
  const isOwner = canAccessOwnedResource(user, routine.owner);

  return (
    <div className="public">
      <div className="public-inner">
        <header className="share-header">
          <div className="spread">
            <span className="badge">Shared routine</span>
            <CopyLinkButton />
          </div>
          <h1 style={{ margin: "12px 0 8px" }}>{routine.name}</h1>
          <div className="row">
            <span className="badge grey">{routine.steps.length} steps</span>
            <span className="badge grey">
              {formatDuration(estimateRoutineSeconds(routine.steps))} total
            </span>
            <span className="badge grey">
              {share.expiresAt === 0
                ? "Link never expires"
                : `Link expires ${formatExpiry(share.expiresAt)}`}
            </span>
          </div>
        </header>

        {routine.steps.map((step, i) => (
          <section className="step-card" key={i} style={{ marginBottom: 10 }}>
            <div className="spread" style={{ padding: "12px 14px 6px" }}>
              <div className="row">
                <span className="step-index">{i + 1}</span>
                <strong>{step.name.trim() || `Step ${i + 1}`}</strong>
              </div>
              <span className="muted">
                {formatDuration(step.seconds)}
                {step.repeat ? ` × ${step.repeat}` : ""}
                {step.rest ? ` · rest ${step.rest}s` : ""}
              </span>
            </div>

            {step.description && (
              <p className="step-description">{step.description}</p>
            )}

            {step.images && step.images.length > 0 && (
              <div className="public-images" style={{ padding: "0 14px" }}>
                {step.images.map((src, j) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={j} src={src} alt={`Step ${i + 1} illustration`} />
                ))}
              </div>
            )}

            {step.links && step.links.length > 0 && (
              <div className="public-links" style={{ padding: "0 14px 12px" }}>
                {step.links.map((link, j) => (
                  <a key={j} href={link} target="_blank" rel="noreferrer nofollow">
                    ↗ {link}
                  </a>
                ))}
              </div>
            )}
          </section>
        ))}

        {isOwner && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="spread">
              <div>
                <strong>You own this routine</strong>
                <p className="muted">
                  Discarding the link removes the public page immediately.
                </p>
              </div>
              <DiscardShareButton token={token} />
            </div>
          </div>
        )}

        <p className="share-footer">
          Shared with Routines Timer — the watch uses a separate import code.
        </p>
      </div>
    </div>
  );
}
