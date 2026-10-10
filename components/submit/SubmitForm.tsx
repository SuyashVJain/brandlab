"use client";

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { put } from "@vercel/blob/client";
import { fieldErrors } from "@/lib/register-schema";
import {
  isImagePoster,
  MAX_EVENT_NAME,
  MAX_TAGLINE,
  POSTER_ACCEPT,
  posterFileError,
  submissionFieldsSchema,
  type SubmissionInfo,
} from "@/lib/submit-schema";
import type { Pair } from "./VerifyForm";

type SubmitFormProps = {
  pair: Pair;
  /** The current submission when replacing; the form starts filled in with it. */
  current: SubmissionInfo | null;
  /** Submissions have closed: everything is disabled. */
  closed: boolean;
  onSaved: (submission: SubmissionInfo) => void;
  onCancel?: () => void;
};

/** "340 KB" or "4.2 MB". */
const fileSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

/** Step 2: event name, tagline and poster. Uploads straight to Vercel Blob, then saves. */
export default function SubmitForm({ pair, current, closed, onSaved, onCancel }: SubmitFormProps) {
  const nameId = useId();
  const taglineId = useId();
  const fileId = useId();

  const [eventName, setEventName] = useState(current?.event_name ?? "");
  const [tagline, setTagline] = useState(current?.tagline ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "saving">("idle");
  const [progress, setProgress] = useState(0);
  // A file that is already on Vercel Blob. If saving fails, Submit reuses it instead of uploading again.
  const uploaded = useRef<{ file: File; url: string } | null>(null);

  const busy = stage !== "idle";
  const disabled = busy || closed;

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
    setErrors((existing) => ({ ...existing, poster: next ? (posterFileError(next) ?? "") : "" }));
    setFormError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    setFormError("");

    // Same zod schema and file rules as the server.
    const parsed = submissionFieldsSchema.safeParse({ event_name: eventName, tagline });
    const problems: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
    if (file) {
      const fileProblem = posterFileError(file);
      if (fileProblem) problems.poster = fileProblem;
    } else if (!current) {
      problems.poster = "Choose your poster file.";
    }
    setErrors(problems);
    if (!parsed.success || Object.values(problems).some(Boolean)) return;

    let posterUrl = current?.poster_url ?? "";
    let justUploaded = false;

    try {
      if (file) {
        if (uploaded.current?.file === file) {
          posterUrl = uploaded.current.url; // already uploaded on an earlier attempt
        } else {
          setStage("uploading");
          setProgress(0);
          const token = await postJson("/api/submit/token", {
            ...pair,
            filename: file.name,
            contentType: file.type,
            size: file.size,
          });
          if (!token.ok) {
            setFormError(token.data.error ?? "Could not start the upload. Please try again.");
            setStage("idle");
            return;
          }
          try {
            const blob = await put(token.data.pathname, file, {
              access: "public",
              token: token.data.token,
              contentType: file.type,
              onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
            });
            posterUrl = blob.url;
            uploaded.current = { file, url: blob.url };
            justUploaded = true;
          } catch {
            setFormError("The upload did not finish. Check your connection and press Submit again.");
            setStage("idle");
            return;
          }
        }
      }

      setStage("saving");
      const saved = await postJson("/api/submit", {
        ...pair,
        event_name: parsed.data.event_name,
        tagline: parsed.data.tagline ?? "",
        poster_url: posterUrl,
      });
      if (saved.ok) {
        onSaved({
          event_name: parsed.data.event_name,
          tagline: parsed.data.tagline || null,
          poster_url: posterUrl,
          submitted_at: saved.data.submitted_at,
        });
        return;
      }
      if (saved.status === 400 && saved.data.fields) setErrors(saved.data.fields);
      const reason = saved.data.error ?? "Saving failed.";
      setFormError(
        file && saved.status >= 500
          ? `${reason} Your poster is already uploaded: press Submit again and it will not upload twice.`
          : reason,
      );
    } catch {
      setFormError(
        file && (justUploaded || uploaded.current?.file === file)
          ? "Your poster uploaded, but saving did not go through. Press Submit again; the file will not upload twice."
          : "Could not reach the server. Check your connection and try again.",
      );
    }
    setStage("idle");
  };

  return (
    <form className="reg-form" onSubmit={submit} noValidate>
      <h2 className="reg-heading">{current ? "Replace your submission" : "Your submission"}</h2>

      <div className="reg-field">
        <label htmlFor={nameId}>Event name</label>
        <input
          id={nameId}
          className="reg-input"
          type="text"
          value={eventName}
          onChange={(event) => setEventName(event.target.value)}
          maxLength={MAX_EVENT_NAME}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={errors.event_name ? true : undefined}
          aria-describedby={errors.event_name ? `${nameId}-error` : `${nameId}-count`}
        />
        <p id={`${nameId}-count`} className="reg-hint sub-counter">
          {eventName.length} / {MAX_EVENT_NAME}
        </p>
        {errors.event_name && (
          <p id={`${nameId}-error`} className="reg-error" role="alert">
            {errors.event_name}
          </p>
        )}
      </div>

      <div className="reg-field">
        <label htmlFor={taglineId}>
          Tagline<span className="reg-optional"> (optional)</span>
        </label>
        <input
          id={taglineId}
          className="reg-input"
          type="text"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          maxLength={MAX_TAGLINE}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={errors.tagline ? true : undefined}
          aria-describedby={errors.tagline ? `${taglineId}-error` : undefined}
        />
        {errors.tagline && (
          <p id={`${taglineId}-error`} className="reg-error" role="alert">
            {errors.tagline}
          </p>
        )}
      </div>

      <div className="reg-field">
        <label htmlFor={fileId}>Poster</label>
        <input
          id={fileId}
          className="sub-file"
          type="file"
          accept={POSTER_ACCEPT}
          onChange={chooseFile}
          disabled={disabled}
          aria-invalid={errors.poster ? true : undefined}
          aria-describedby={errors.poster ? `${fileId}-error` : `${fileId}-hint`}
        />
        <p id={`${fileId}-hint`} className="reg-hint">
          PNG, JPG or PDF, up to 15 MB.
          {current && !file && " Leave empty to keep your current poster."}
        </p>
        {file && (
          <p className="sub-file-info">
            <b>{file.name}</b> <span>{fileSize(file.size)}</span>
          </p>
        )}
        {errors.poster && (
          <p id={`${fileId}-error`} className="reg-error" role="alert">
            {errors.poster}
          </p>
        )}
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file (object URL)
          <img className="sub-preview" src={preview} alt="Preview of the chosen poster" />
        ) : (
          !file &&
          current &&
          isImagePoster(current.poster_url) && (
            // eslint-disable-next-line @next/next/no-img-element -- participant upload on Vercel Blob, shown as is
            <img className="sub-preview" src={current.poster_url} alt="Your current poster" />
          )
        )}
      </div>

      {stage === "uploading" && (
        <div className="sub-progress" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span className="sub-progress-fill" style={{ width: `${progress}%` }} />
          <span className="sub-progress-label">Uploading {progress}%</span>
        </div>
      )}

      {formError && (
        <p className="reg-error" role="alert">
          {formError}
        </p>
      )}

      <div className="reg-actions sub-actions">
        <button type="submit" className="register reg-submit" disabled={disabled}>
          <span>{stage === "uploading" ? "Uploading..." : stage === "saving" ? "Saving..." : "Submit"}</span>
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="16" cy="16" r="14" />
            <path d="M10 16h12M17 11l5 5-5 5" />
          </svg>
        </button>
        {onCancel && (
          <button type="button" className="reg-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
