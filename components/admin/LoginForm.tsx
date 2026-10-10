"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { loginSchema } from "@/lib/admin-schema";

/** Staff login: email + password -> /api/staff/login, then on to /admin. */
export default function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as "email" | "password";
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    setSending(true);
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.ok) {
        router.replace("/admin");
        router.refresh();
        return; // keep the button disabled while the admin page loads
      }
      const data = await response.json().catch(() => ({}));
      setErrors({ form: data.error ?? "Something went wrong. Please try again." });
      setPassword("");
    } catch {
      setErrors({ form: "Could not reach the server. Check your connection and try again." });
    }
    setSending(false);
  };

  return (
    <form className="adm-form" onSubmit={submit} noValidate>
      <div className="adm-field">
        <label htmlFor={emailId}>Email</label>
        <input
          id={emailId}
          className="adm-input"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
        />
        {errors.email && (
          <p id={`${emailId}-error`} className="adm-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="adm-field">
        <label htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          className="adm-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? `${passwordId}-error` : undefined}
        />
        {errors.password && (
          <p id={`${passwordId}-error`} className="adm-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      {errors.form && (
        <p className="adm-error" role="alert">
          {errors.form}
        </p>
      )}

      <button type="submit" className="register adm-brush" disabled={sending}>
        <span>{sending ? "Signing in..." : "Sign in"}</span>
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="16" cy="16" r="14" />
          <path d="M10 16h12M17 11l5 5-5 5" />
        </svg>
      </button>
    </form>
  );
}
