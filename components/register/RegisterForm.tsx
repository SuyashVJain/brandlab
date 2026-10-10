"use client";

import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type HTMLInputTypeAttribute,
} from "react";
import {
  fieldErrors,
  registerSchema,
  type RegisterFieldName,
  type RegisterFields,
  type RegisterResult,
} from "@/lib/register-schema";
import { siteContent } from "@/lib/site-content";

const PROGRAMS = siteContent.registration.programs;
const SEMESTERS = siteContent.registration.semesters.map(String);

const EMPTY: Required<RegisterFields> = {
  full_name: "",
  email: "",
  phone: "",
  enrollment_no: "",
  program: "",
  semester: "",
  mode: "alone",
  partner_name: "",
  partner_enrollment_no: "",
  partner_phone: "",
  partner_program: "",
  partner_semester: "",
};

/** What is validated and sent: an individual entry carries no partner details, even if some were typed. */
function entryOf(values: Required<RegisterFields>): Required<RegisterFields> {
  if (values.mode === "pair") return values;
  return {
    ...values,
    partner_name: "",
    partner_enrollment_no: "",
    partner_phone: "",
    partner_program: "",
    partner_semester: "",
  };
}

type FieldProps = {
  name: RegisterFieldName;
  label: string;
  value: string;
  error?: string;
  onChange: (name: RegisterFieldName, value: string) => void;
  type?: HTMLInputTypeAttribute;
  optional?: boolean;
  hint?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
  maxLength?: number;
  autoCapitalize?: "characters" | "words" | "none";
};

/** Label + input + inline error. The error is tied to the input for screen readers. */
function Field({
  name,
  label,
  value,
  error,
  onChange,
  type = "text",
  optional,
  hint,
  ...input
}: FieldProps) {
  const id = useId();
  return (
    <div className="reg-field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="reg-optional"> (optional)</span>}
      </label>
      <input
        id={id}
        className="reg-input"
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        {...input}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="reg-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="reg-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type SelectFieldProps = {
  name: RegisterFieldName;
  label: string;
  value: string;
  options: readonly string[];
  /** Text put before each option, for example "Semester ". */
  prefix?: string;
  error?: string;
  onChange: (name: RegisterFieldName, value: string) => void;
};

/** Label + native select + inline error. */
function SelectField({
  name,
  label,
  value,
  options,
  prefix = "",
  error,
  onChange,
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className="reg-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="reg-input reg-select"
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {prefix}
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="reg-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type RegisterFormProps = {
  onSuccess: (result: RegisterResult) => void;
  /** The server said registration has closed since the form was shown. */
  onClosed: () => void;
};

export default function RegisterForm({
  onSuccess,
  onClosed,
}: RegisterFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  // Errors appear on the first submit, then update live as the fields are fixed.
  const [attempted, setAttempted] = useState(false);

  const change = (name: RegisterFieldName, raw: string) => {
    const value =
      name === "phone" || name === "partner_phone"
        ? raw.replace(/\D/g, "").slice(0, 10)
        : raw;
    const next = { ...values, [name]: value };
    setValues(next);
    if (attempted) {
      const result = registerSchema.safeParse(entryOf(next));
      setErrors(result.success ? {} : fieldErrors(result.error));
    }
  };

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setAttempted(true);
    setFormError("");

    // Same zod schema the server uses.
    const entry = entryOf(values);
    const parsed = registerSchema.safeParse(entry);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      focusFirstError();
      return;
    }
    setErrors({});

    setSending(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 201) {
        onSuccess(data as RegisterResult);
      } else if (response.status === 400 && data.fields) {
        setErrors(data.fields);
        focusFirstError();
      } else if (response.status === 409 && data.field) {
        setErrors({ [data.field]: data.error });
        focusFirstError();
      } else if (response.status === 403) {
        onClosed();
      } else {
        setFormError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const pair = values.mode === "pair";

  return (
    <form ref={form} className="reg-form" onSubmit={submit} noValidate>
      <h3 className="reg-heading">Your details</h3>

      <Field
        name="full_name"
        label="Full name"
        value={values.full_name}
        error={errors.full_name}
        onChange={change}
        autoComplete="name"
        autoCapitalize="words"
        maxLength={80}
      />
      <Field
        name="email"
        label="Email"
        type="email"
        value={values.email}
        error={errors.email}
        onChange={change}
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        maxLength={254}
      />

      <div className="reg-row">
        <Field
          name="phone"
          label="Phone"
          type="tel"
          value={values.phone}
          error={errors.phone}
          onChange={change}
          autoComplete="tel-national"
          inputMode="numeric"
          maxLength={10}
          hint="10 digits, no +91"
        />
        <Field
          name="enrollment_no"
          label="Enrollment number"
          value={values.enrollment_no}
          error={errors.enrollment_no}
          onChange={change}
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={20}
        />
      </div>

      <div className="reg-row">
        <SelectField
          name="program"
          label="Programme"
          value={values.program}
          options={PROGRAMS}
          error={errors.program}
          onChange={change}
        />
        <SelectField
          name="semester"
          label="Semester"
          value={values.semester}
          options={SEMESTERS}
          prefix="Semester "
          error={errors.semester}
          onChange={change}
        />
      </div>


      <fieldset className="reg-choices">
        <legend>How are you joining?</legend>
        <label className="reg-choice">
          <input
            type="radio"
            name="mode"
            value="alone"
            checked={!pair}
            onChange={() => change("mode", "alone")}
          />
          <span>I&apos;m joining alone</span>
        </label>
        <label className="reg-choice">
          <input
            type="radio"
            name="mode"
            value="pair"
            checked={pair}
            onChange={() => change("mode", "pair")}
          />
          <span>I&apos;m joining with a partner</span>
        </label>
      </fieldset>

      {pair && (
        <div className="reg-partner">
          <h3 className="reg-heading">Your partner</h3>
          <div className="reg-row">
            <Field
              name="partner_name"
              label="Partner's full name"
              value={values.partner_name}
              error={errors.partner_name}
              onChange={change}
              autoComplete="off"
              autoCapitalize="words"
              maxLength={80}
            />
            <Field
              name="partner_enrollment_no"
              label="Partner's enrollment number"
              value={values.partner_enrollment_no}
              error={errors.partner_enrollment_no}
              onChange={change}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={20}
            />
          </div>
          <Field
            name="partner_phone"
            label="Partner's phone"
            type="tel"
            value={values.partner_phone}
            error={errors.partner_phone}
            onChange={change}
            autoComplete="off"
            inputMode="numeric"
            maxLength={10}
            hint="10 digits, no +91"
          />
          <div className="reg-row">
            <SelectField
              name="partner_program"
              label="Partner's programme"
              value={values.partner_program}
              options={PROGRAMS}
              error={errors.partner_program}
              onChange={change}
            />
            <SelectField
              name="partner_semester"
              label="Partner's semester"
              value={values.partner_semester}
              options={SEMESTERS}
              prefix="Semester "
              error={errors.partner_semester}
              onChange={change}
            />
          </div>
        </div>
      )}

      {formError && (
        <p className="reg-error" role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="register reg-submit" disabled={sending}>
        <span>{sending ? "Sending..." : "Register"}</span>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="16" cy="16" r="14" />
          <path d="M10 16h12M17 11l5 5-5 5" />
        </svg>
      </button>
    </form>
  );
}
