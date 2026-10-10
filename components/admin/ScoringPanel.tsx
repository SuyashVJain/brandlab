"use client";

import { useEffect, useState, type FormEvent } from "react";
import { TornPanel } from "@/components/shared/Paper";
import { CRITERIA, MAX_NOTES, totalOf, type JuryData, type JurySubmission, type ScoreValues } from "@/lib/jury-schema";
import { isImagePoster } from "@/lib/submit-schema";
import { callApi } from "./api";

const EMPTY: ScoreValues = { name_score: 0, keyword_score: 0, design_score: 0, clarity_score: 0, impact_score: 0 };

type ScoreFormProps = {
  submission: JurySubmission;
  locked: boolean;
  onSaved: (id: string, score: NonNullable<JurySubmission["my_score"]>) => void;
};

/** Five sliders (each with its number box and maximum), a live total, notes and Save. */
function ScoreForm({ submission, locked, onSaved }: ScoreFormProps) {
  const [values, setValues] = useState<ScoreValues>(submission.my_score ?? EMPTY);
  const [notes, setNotes] = useState(submission.my_score?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const total = totalOf(values);

  const change = (key: keyof ScoreValues, raw: string, max: number) => {
    const number = Math.round(Number(raw));
    setValues({ ...values, [key]: Number.isFinite(number) ? Math.min(max, Math.max(0, number)) : 0 });
    setMessage(null);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || locked) return;
    setSaving(true);
    const result = await callApi<{ total: number }>("/api/jury/score", "POST", {
      submission_id: submission.id,
      ...values,
      notes,
    });
    setSaving(false);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    setMessage({ ok: true, text: `Saved: ${result.data.total} / 100` });
    onSaved(submission.id, { ...values, notes: notes.trim() || null, total: result.data.total });
  };

  return (
    <form className="adm-score" onSubmit={save}>
      {CRITERIA.map((criterion) => (
        <div key={criterion.key} className="adm-score-row">
          <label htmlFor={`score-${criterion.key}`}>{criterion.label}</label>
          <input
            id={`score-${criterion.key}`}
            className="adm-range"
            type="range"
            min={0}
            max={criterion.max}
            step={1}
            value={values[criterion.key]}
            onChange={(event) => change(criterion.key, event.target.value, criterion.max)}
            disabled={locked}
          />
          <span className="adm-score-number">
            <input
              className="adm-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={criterion.max}
              step={1}
              value={values[criterion.key]}
              onChange={(event) => change(criterion.key, event.target.value, criterion.max)}
              disabled={locked}
              aria-label={`${criterion.short} score, out of ${criterion.max}`}
            />
            <span aria-hidden>/ {criterion.max}</span>
          </span>
        </div>
      ))}

      <p className="adm-total" aria-live="polite">
        <span className="eyebrow">Total</span>
        <b>{total}</b> / 100
      </p>

      <div className="adm-field">
        <label htmlFor="score-notes">Notes (optional)</label>
        <textarea
          id="score-notes"
          className="adm-input adm-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={MAX_NOTES}
          rows={3}
          disabled={locked}
        />
      </div>

      <div className="adm-row">
        <button type="submit" className="adm-button adm-button--solid" disabled={saving || locked}>
          {saving ? "Saving..." : submission.my_score ? "Update score" : "Save score"}
        </button>
        {locked && <span className="adm-note">Results are out: scores are locked.</span>}
        {message && <span className={message.ok ? "adm-ok" : "adm-error"}>{message.text}</span>}
      </div>
    </form>
  );
}

/** Blind gallery for judges: participant codes only, never names. */
export default function ScoringPanel() {
  const [data, setData] = useState<JuryData | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    callApi<JuryData>("/api/jury/submissions").then((result) => {
      if (!alive) return;
      if (!result.ok) return setError(result.error);
      setError("");
      setData(result.data);
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (error) {
    return (
      <div className="adm-row">
        <p className="adm-error">{error}</p>
        <button type="button" className="adm-button adm-button--small" onClick={() => setAttempt((count) => count + 1)}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) return <p className="adm-loading">Loading submissions...</p>;

  const { submissions, keywords, locked } = data;
  const selected = submissions.find((item) => item.id === selectedId) ?? submissions[0] ?? null;
  const scored = submissions.filter((item) => item.my_score).length;

  const saved = (id: string, score: NonNullable<JurySubmission["my_score"]>) => {
    setData({ ...data, submissions: submissions.map((item) => (item.id === id ? { ...item, my_score: score } : item)) });
  };

  return (
    <div className="adm-scoring">
      <div className="adm-status">
        <p className="adm-progress">
          <b>
            {scored} / {submissions.length}
          </b>{" "}
          scored by you
        </p>
        <button type="button" className="adm-button adm-button--small" onClick={() => setAttempt((count) => count + 1)}>
          Refresh
        </button>
      </div>

      <div className="adm-keybar">
        <span className="adm-keybar-label">Keywords</span>
        {keywords ? keywords.map((word) => <span key={word}>{word}</span>) : <span className="adm-keybar-wait">Not revealed yet</span>}
      </div>

      {submissions.length === 0 ? (
        <TornPanel seed={281}>
          <h2 className="adm-heading">No submissions yet</h2>
        </TornPanel>
      ) : (
        <div className="adm-scoring-grid">
          {/* ---------- gallery ---------- */}
          <ul className="adm-gallery" aria-label="Submissions">
            {submissions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="adm-entry"
                  aria-pressed={selected?.id === item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="adm-entry-code">{item.code}</span>
                  <span className="adm-entry-name">{item.event_name}</span>
                  <span className={item.my_score ? "adm-badge adm-badge--done" : "adm-badge"}>
                    {item.my_score ? `Scored ${item.my_score.total}` : "Not scored"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* ---------- the selected submission ---------- */}
          {selected && (
            <TornPanel seed={293} className="adm-entry-detail">
              <p className="eyebrow">{selected.code}</p>
              <h2 className="adm-big adm-entry-title">{selected.event_name}</h2>
              {selected.tagline && <p className="adm-text adm-entry-tagline">{selected.tagline}</p>}

              {/* Poster and score form sit side by side on a wide screen. */}
              <div className="adm-entry-body">
              {isImagePoster(selected.poster_url) ? (
                <a href={selected.poster_url} target="_blank" rel="noreferrer" title="Open the poster in a new tab">
                  {/* eslint-disable-next-line @next/next/no-img-element -- participant upload on Vercel Blob, shown as is */}
                  <img className="adm-poster" src={selected.poster_url} alt={`Poster for ${selected.event_name}`} />
                </a>
              ) : (
                <a className="adm-button adm-poster-link" href={selected.poster_url} target="_blank" rel="noreferrer">
                  Open poster (PDF) in a new tab
                </a>
              )}

              <ScoreForm key={selected.id} submission={selected} locked={locked} onSaved={saved} />
              </div>
            </TornPanel>
          )}
        </div>
      )}
    </div>
  );
}
