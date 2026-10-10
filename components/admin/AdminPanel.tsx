"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TornPanel } from "@/components/shared/Paper";
import { PHASES, PHASE_LABEL, REVEAL_DELAY_SECONDS, type AdminState, type Phase } from "@/lib/admin-schema";
import { formatIst, fromIstInput, toIstInput } from "@/lib/ist";

const MAX_KEYWORDS = 8;
const MAX_KEYWORD_LENGTH = 40;

type Notice = { kind: "ok" | "error"; text: string };

/** Event control for admins: phase, keywords, reveal and submission deadline. */
export default function AdminPanel({ initialState }: { initialState: AdminState }) {
  const router = useRouter();

  // `state` is always what the server last confirmed. Drafts live separately.
  const [state, setState] = useState(initialState);
  const [draft, setDraft] = useState(initialState.keywords);
  const [newWord, setNewWord] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [deadline, setDeadline] = useState(toIstInput(initialState.submissions_close_at));
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  /** Calls an admin route. Every route answers with the fresh AdminState. */
  const call = async (
    action: string,
    url: string,
    method: "GET" | "POST" | "PUT",
    body: unknown,
    done: string,
  ): Promise<AdminState | null> => {
    setBusy(action);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.status === 401) {
        router.replace("/admin/login");
        return null;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "That did not work. Please try again." });
        return null;
      }
      setState(data as AdminState);
      setNotice({ kind: "ok", text: done });
      return data as AdminState;
    } catch {
      setNotice({ kind: "error", text: "Could not reach the server. Check your connection." });
      return null;
    } finally {
      setBusy(null);
    }
  };

  /* ---------- phase ---------- */

  const changePhase = (phase: Phase) => {
    if (phase === state.phase || busy) return;
    const question = `Move the event from "${PHASE_LABEL[state.phase]}" to "${PHASE_LABEL[phase]}"?`;
    if (!window.confirm(question)) return;
    void call("phase", "/api/admin/phase", "POST", { phase }, `Phase is now "${PHASE_LABEL[phase]}".`);
  };

  /* ---------- keywords ---------- */

  const dirty = JSON.stringify(draft) !== JSON.stringify(state.keywords);

  const addKeyword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const word = newWord.trim();
    if (!word) return setKeywordError("Type a keyword first.");
    if (word.length > MAX_KEYWORD_LENGTH) return setKeywordError(`Keep it to ${MAX_KEYWORD_LENGTH} characters.`);
    if (draft.length >= MAX_KEYWORDS) return setKeywordError(`${MAX_KEYWORDS} keywords is the maximum.`);
    if (draft.some((existing) => existing.toLowerCase() === word.toLowerCase())) {
      return setKeywordError("That keyword is already in the list.");
    }
    setDraft([...draft, word]);
    setNewWord("");
    setKeywordError("");
  };

  const moveKeyword = (index: number, step: -1 | 1) => {
    const target = index + step;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  };

  const saveKeywords = async () => {
    if (draft.length === 0) return setKeywordError("Add at least one keyword before saving.");
    setKeywordError("");
    const saved = await call("keywords", "/api/admin/keywords", "PUT", { keywords: draft }, "Keywords saved.");
    if (saved) setDraft(saved.keywords);
  };

  /* ---------- reveal ---------- */

  const canReveal = state.keywords.length > 0;

  const reveal = () => {
    if (!canReveal || busy) return;
    if (!window.confirm(`Everyone will see the keywords in ${REVEAL_DELAY_SECONDS} seconds. Continue?`)) return;
    void call("reveal", "/api/admin/reveal", "POST", undefined, `Reveal started. Keywords show in ${REVEAL_DELAY_SECONDS} seconds.`);
  };

  /* ---------- deadline ---------- */

  const saveDeadline = () => {
    if (!deadline) return setNotice({ kind: "error", text: "Pick a date and time first, or use Clear." });
    void call("deadline", "/api/admin/deadline", "POST", { submissions_close_at: fromIstInput(deadline) }, "Deadline saved.");
  };

  const clearDeadline = async () => {
    const cleared = await call("deadline", "/api/admin/deadline", "POST", { submissions_close_at: null }, "Deadline cleared.");
    if (cleared) setDeadline("");
  };

  const refresh = async () => {
    const fresh = await call("refresh", "/api/admin/state", "GET", undefined, "Refreshed.");
    if (fresh && !dirty) setDraft(fresh.keywords);
  };

  return (
    <div className="adm-panel">
      <div className="adm-status" aria-live="polite">
        {notice && <p className={notice.kind === "error" ? "adm-error" : "adm-ok"}>{notice.text}</p>}
        <button type="button" className="adm-button adm-button--small" onClick={refresh} disabled={busy !== null}>
          {busy === "refresh" ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="adm-grid">
        {/* ---------- a) phase ---------- */}
        <TornPanel seed={211} className="adm-phase">
          <p className="eyebrow">Current phase</p>
          <p className="adm-big">{PHASE_LABEL[state.phase]}</p>
          <ol className="adm-phases">
            {PHASES.map((phase, index) => (
              <li key={phase}>
                <button
                  type="button"
                  className="adm-phase-button"
                  aria-pressed={phase === state.phase}
                  disabled={busy !== null}
                  onClick={() => changePhase(phase)}
                >
                  <span aria-hidden>{index + 1}</span>
                  {PHASE_LABEL[phase]}
                </button>
              </li>
            ))}
          </ol>
        </TornPanel>

        {/* ---------- c) reveal ---------- */}
        <TornPanel seed={223} className="adm-reveal">
          <h2 className="adm-heading">Reveal keywords</h2>
          <p className="adm-text">
            Sets the phase to &quot;{PHASE_LABEL.keywords_revealed}&quot; and shows the keywords to everyone{" "}
            {REVEAL_DELAY_SECONDS} seconds later.
          </p>
          <button type="button" className="register adm-brush adm-brush--big" onClick={reveal} disabled={!canReveal || busy !== null}>
            <span>{busy === "reveal" ? "Starting..." : "Reveal keywords"}</span>
          </button>
          {!canReveal && <p className="adm-note">Disabled: save at least one keyword first.</p>}
          <dl className="adm-facts">
            <div>
              <dt className="eyebrow">Reveal time</dt>
              <dd>{formatIst(state.reveal_at, true)}</dd>
            </div>
          </dl>
        </TornPanel>

        {/* ---------- b) keywords ---------- */}
        <TornPanel seed={239} className="adm-keywords">
          <h2 className="adm-heading">Keywords</h2>

          <form className="adm-add" onSubmit={addKeyword}>
            <input
              className="adm-input"
              type="text"
              value={newWord}
              onChange={(event) => setNewWord(event.target.value)}
              maxLength={MAX_KEYWORD_LENGTH}
              placeholder="New keyword"
              aria-label="New keyword"
              autoComplete="off"
            />
            <button type="submit" className="adm-button" disabled={draft.length >= MAX_KEYWORDS}>
              Add
            </button>
          </form>
          {keywordError && (
            <p className="adm-error" role="alert">
              {keywordError}
            </p>
          )}

          {draft.length === 0 ? (
            <p className="adm-note">No keywords in the list yet.</p>
          ) : (
            <ol className="adm-words">
              {draft.map((word, index) => (
                <li key={word}>
                  <span className="adm-word-number" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="adm-word">{word}</span>
                  <button type="button" className="adm-icon" onClick={() => moveKeyword(index, -1)} disabled={index === 0} aria-label={`Move ${word} up`}>
                    Up
                  </button>
                  <button type="button" className="adm-icon" onClick={() => moveKeyword(index, 1)} disabled={index === draft.length - 1} aria-label={`Move ${word} down`}>
                    Down
                  </button>
                  <button type="button" className="adm-icon" onClick={() => setDraft(draft.filter((_, at) => at !== index))} aria-label={`Remove ${word}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div className="adm-row">
            <button type="button" className="adm-button adm-button--solid" onClick={saveKeywords} disabled={!dirty || busy !== null}>
              {busy === "keywords" ? "Saving..." : "Save keywords"}
            </button>
            {dirty && <span className="adm-note">Unsaved changes.</span>}
          </div>

          <dl className="adm-facts">
            <div>
              <dt className="eyebrow">Saved list ({state.keywords.length})</dt>
              <dd>{state.keywords.length ? state.keywords.join(", ") : "Nothing saved yet"}</dd>
            </div>
          </dl>
        </TornPanel>

        {/* ---------- d) submission deadline ---------- */}
        <TornPanel seed={251} className="adm-deadline">
          <h2 className="adm-heading">Submission deadline</h2>
          <div className="adm-field">
            <label htmlFor="adm-deadline-input">Date and time (IST)</label>
            <input
              id="adm-deadline-input"
              className="adm-input"
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
          <div className="adm-row">
            <button type="button" className="adm-button adm-button--solid" onClick={saveDeadline} disabled={busy !== null}>
              {busy === "deadline" ? "Saving..." : "Save"}
            </button>
            <button type="button" className="adm-button" onClick={clearDeadline} disabled={busy !== null || !state.submissions_close_at}>
              Clear
            </button>
          </div>
          <dl className="adm-facts">
            <div>
              <dt className="eyebrow">Saved deadline</dt>
              <dd>{formatIst(state.submissions_close_at)}</dd>
            </div>
          </dl>
        </TornPanel>
      </div>
    </div>
  );
}
