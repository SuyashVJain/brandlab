"use client";

import { useId, useState, type FormEvent } from "react";
import { fieldErrors, lookupSchema, type LookupResult } from "@/lib/register-schema";

/** "Check my registration": email + code -> /api/lookup. */
export default function LookupPanel() {
  const emailId = useId();
  const codeId = useId();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setResult(null);
    setMessage("");

    const parsed = lookupSchema.safeParse({ email, code });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});

    setSending(true);
    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setResult(data as LookupResult);
      else setMessage(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setMessage("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="reg-lookup">
      <h3 className="reg-heading reg-heading--small">Check my registration</h3>

      <form className="reg-form" onSubmit={submit} noValidate>
        <div className="reg-row">
          <div className="reg-field">
            <label htmlFor={emailId}>Email</label>
            <input
              id={emailId}
              className="reg-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
            />
            {errors.email && (
              <p id={`${emailId}-error`} className="reg-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>
          <div className="reg-field">
            <label htmlFor={codeId}>Participant code</label>
            <input
              id={codeId}
              className="reg-input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="BL-0000"
              maxLength={9}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={errors.code ? `${codeId}-error` : undefined}
            />
            {errors.code && (
              <p id={`${codeId}-error`} className="reg-error" role="alert">
                {errors.code}
              </p>
            )}
          </div>
        </div>

        <div className="reg-actions">
          <button type="submit" className="reg-ghost" disabled={sending}>
            {sending ? "Checking..." : "Check"}
          </button>
        </div>
      </form>

      <div className="reg-lookup-result" aria-live="polite">
        {message && <p className="reg-error">{message}</p>}
        {result?.found === false && (
          <p className="reg-error">No registration matches that email and code.</p>
        )}
        {result?.found && (
          <dl className="reg-summary">
            <div>
              <dt className="eyebrow">Code</dt>
              <dd>{result.code}</dd>
            </div>
            <div>
              <dt className="eyebrow">Name</dt>
              <dd>{result.full_name}</dd>
            </div>
            <div>
              <dt className="eyebrow">Entry</dt>
              <dd>{result.mode === "pair" ? "With a partner" : "Alone"}</dd>
            </div>
            <div>
              <dt className="eyebrow">Checked in</dt>
              <dd>{result.checked_in ? "Yes" : "Not yet"}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
