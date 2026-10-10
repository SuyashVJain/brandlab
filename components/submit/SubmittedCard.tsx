import { formatIst } from "@/lib/ist";
import { isImagePoster, type SubmissionInfo } from "@/lib/submit-schema";

type SubmittedCardProps = {
  submission: SubmissionInfo;
  /** Replacing is allowed only while submissions are open. */
  canReplace: boolean;
  onReplace: () => void;
};

/** What the participant has on record: event name, tagline, poster and time. */
export default function SubmittedCard({ submission, canReplace, onReplace }: SubmittedCardProps) {
  return (
    <div className="sub-done" role="status">
      <p className="eyebrow">Submitted</p>
      <h2 className="sub-done-name">
        <span className="swipe">
          <span className="swipe-ink" aria-hidden />
          {submission.event_name}
        </span>
      </h2>
      {submission.tagline && <p className="sub-done-tagline">{submission.tagline}</p>}

      {isImagePoster(submission.poster_url) ? (
        // eslint-disable-next-line @next/next/no-img-element -- participant upload on Vercel Blob, shown as is
        <img className="sub-preview" src={submission.poster_url} alt={`Poster for ${submission.event_name}`} />
      ) : (
        <a className="reg-link" href={submission.poster_url} target="_blank" rel="noreferrer">
          Open your poster (PDF)
        </a>
      )}

      <dl className="reg-summary">
        <div>
          <dt className="eyebrow">Submitted at</dt>
          <dd>{formatIst(submission.submitted_at)}</dd>
        </div>
      </dl>

      <div className="reg-actions">
        <button type="button" className="reg-ghost" onClick={onReplace} disabled={!canReplace}>
          Replace my submission
        </button>
        {!canReplace && <span className="reg-hint">Submissions are closed, so this can no longer be changed.</span>}
      </div>
    </div>
  );
}
