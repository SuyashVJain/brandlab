"use client";

import { useId, useState, type FormEvent } from "react";
import { fieldErrors } from "@/lib/register-schema";
import { verifySchema } from "@/lib/submit-schema";

export type Pair = { email: string; code: string };

type VerifyFormProps = {
  /** Checks the pair with the server. Returns an error message, or null when it matched. */
  onVerify: (pair: Pair) => Promise<string | null>;
  /** Message carried over from a failed automatic check of the saved pair. */
  notice?: string;
};

/** Step 1: the email and participant code from registration. */
export default function VerifyForm({ onVerify, notice }: VerifyFormProps) {
  const emailId = useId();
  const codeId = useId();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setMessage("");

    const parsed = verifySchema.safeParse({ email, code });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});

    setSending(true);
    const problem = await onVerify(parsed.data);
    // On success the parent swaps this form out; only failures come back here.
    if (problem) {
      setMessage(problem);
      setSending(false);
    }
  };

  return (
    <form className="reg-form" onSubmit={submit} noValidate>
      <h2 className="reg-heading">Your code</h2>
      <p className="sub-text">Enter the email and code you registered with.</p>

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

      {(message || notice) && (
        <p className="reg-error" role="alert">
          {message || notice}
        </p>
      )}

      <div className="reg-actions">
        <button type="submit" className="reg-ghost" disabled={sending}>
          {sending ? "Checking..." : "Continue"}
        </button>
      </div>
    </form>
  );
}
