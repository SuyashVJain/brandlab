"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { TornPanel } from "@/components/shared/Paper";
import { formatIst } from "@/lib/ist";
import { saveParticipant } from "@/lib/participant-storage";
import type { SubmissionInfo, VerifyResult } from "@/lib/submit-schema";
import SubmitForm from "./SubmitForm";
import SubmittedCard from "./SubmittedCard";
import { formatCountdown, useSubmitStatus } from "./useSubmitStatus";
import VerifyForm, { type Pair } from "./VerifyForm";
import "@/components/shared/shared.css";
import "@/components/register/register.css"; // same form, panel and button styles as Register
import "./submit.css";

/* ------------------------------------------------------------------------ */
/* The verified email + code, kept for this tab (sessionStorage)            */
/* ------------------------------------------------------------------------ */

const STORAGE_KEY = "brandlab.submit";
const listeners = new Set<() => void>();
let memoryCopy: string | null = null; // used when sessionStorage is blocked

function readSaved(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? memoryCopy;
  } catch {
    return memoryCopy;
  }
}
function writeSaved(pair: Pair | null) {
  memoryCopy = pair ? JSON.stringify(pair) : null;
  try {
    if (memoryCopy) window.sessionStorage.setItem(STORAGE_KEY, memoryCopy);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: memoryCopy above is the fallback.
  }
  listeners.forEach((notify) => notify());
}
function subscribeSaved(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}
function parsePair(raw: string | null): Pair | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Pair>;
    return typeof value.email === "string" && typeof value.code === "string"
      ? { email: value.email, code: value.code }
      : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------ */

type Verified = { pair: Pair; full_name: string; submission: SubmissionInfo | null };

/** Asks the server about a pair. Returns the participant, or a message saying why not. */
async function verifyPair(pair: Pair): Promise<Verified | string> {
  try {
    const response = await fetch("/api/submit/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pair),
    });
    const data = (await response.json().catch(() => ({}))) as VerifyResult & { error?: string };
    if (response.status === 429) return data.error ?? "Too many attempts. Please try again in a few minutes.";
    if (!response.ok) return data.error ?? "Something went wrong. Please try again.";
    if (!data.ok) return "That email and code do not match a registration. Check both and try again.";
    return { pair, full_name: data.full_name, submission: data.submission };
  } catch {
    return "Could not reach the server. Check your connection and try again.";
  }
}

export default function Submit() {
  const { gate, closesAt, secondsLeft, reconnecting } = useSubmitStatus();

  const savedRaw = useSyncExternalStore(subscribeSaved, readSaved, () => null);
  const [verified, setVerified] = useState<Verified | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [notice, setNotice] = useState("");

  // After a refresh: check the saved pair again instead of asking for it.
  useEffect(() => {
    const pair = parsePair(readSaved());
    if (!pair) return;
    let alive = true;
    verifyPair(pair).then((result) => {
      if (!alive) return;
      if (typeof result === "string") {
        writeSaved(null);
        setNotice(result);
      } else {
        setVerified(result);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const verify = useCallback(async (pair: Pair) => {
    const result = await verifyPair(pair);
    if (typeof result === "string") return result;
    setNotice("");
    setVerified(result);
    writeSaved(pair);
    // Remember the pair in this browser, so the fields are pre-filled next time.
    saveParticipant(pair);
    return null;
  }, []);

  const forget = () => {
    writeSaved(null);
    setVerified(null);
    setReplacing(false);
    setNotice("");
  };

  const saved = (submission: SubmissionInfo) => {
    setVerified((existing) => (existing ? { ...existing, submission } : existing));
    setReplacing(false);
  };

  const open = gate === "open";
  const restoring = !verified && savedRaw !== null;

  let panel;
  if (restoring) {
    panel = (
      <div className="reg-notice" role="status">
        <p>Checking your code...</p>
      </div>
    );
  } else if (!verified) {
    panel = <VerifyForm onVerify={verify} notice={notice} />;
  } else {
    const { submission } = verified;
    panel = (
      <div className="sub-step">
        <div className="sub-who">
          <p>
            <span className="eyebrow">Submitting as</span>
            <b>{verified.full_name}</b> <span className="sub-code">{verified.pair.code}</span>
          </p>
          <button type="button" className="reg-link" onClick={forget}>
            Use a different code
          </button>
        </div>

        {submission && !replacing ? (
          <SubmittedCard submission={submission} canReplace={open} onReplace={() => setReplacing(true)} />
        ) : open || replacing ? (
          <SubmitForm
            pair={verified.pair}
            current={submission}
            closed={!open}
            onSaved={saved}
            onCancel={submission ? () => setReplacing(false) : undefined}
          />
        ) : (
          <div className="reg-notice" role="status">
            <h2 className="reg-heading">
              {gate === "not-open" ? "Submissions are not open yet" : gate === "closed" ? "Submissions are closed" : "One moment..."}
            </h2>
            {gate === "not-open" && <p>This page opens for uploads once the keywords are out. Keep it handy.</p>}
            {gate === "closed" && <p>The deadline has passed and nothing was submitted with this code.</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="sheet reg sub" aria-labelledby="submit-title">
      <div className="hero-paper" aria-hidden />

      <div className="sheet-inner">
        <div className="reg-grid">
          {/* ---------- heading + deadline ---------- */}
          <header className="reg-intro">
            <h1 id="submit-title" className="section-title">
              <span className="swipe">
                <span className="swipe-ink" aria-hidden />
                Submit
              </span>
            </h1>

            <div className="sub-status" aria-live="polite">
              {gate === "loading" && <p className="eyebrow">Checking the deadline...</p>}
              {gate === "not-open" && <p className="sub-flag">Submissions are not open yet</p>}
              {gate === "closed" && <p className="sub-flag">Submissions are closed</p>}
              {open && closesAt && secondsLeft !== null && (
                <>
                  <p className="eyebrow">Submissions close in</p>
                  <p className="sub-count" role="timer">
                    {formatCountdown(secondsLeft)}
                  </p>
                  <p className="sub-text">Deadline: {formatIst(closesAt)}</p>
                </>
              )}
              {open && !closesAt && (
                <>
                  <p className="eyebrow">Submissions are open</p>
                  <p className="sub-text">No deadline set</p>
                </>
              )}
              {reconnecting && <p className="reg-hint">Reconnecting...</p>}
            </div>
          </header>

          {/* ---------- step 1 / step 2 / submitted ---------- */}
          <div className="reg-main">
            <TornPanel seed={409}>{panel}</TornPanel>
          </div>
        </div>
      </div>
    </section>
  );
}
