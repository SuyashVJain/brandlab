"use client";

import { useState } from "react";
import type { RegisterResult } from "@/lib/register-schema";
import { siteContent } from "@/lib/site-content";

type SuccessCardProps = {
  registration: RegisterResult;
  /** Forget the saved code on this device and show the form again. */
  onClear: () => void;
};

/** Shown instead of the form after registering (and after a refresh, from localStorage). */
export default function SuccessCard({ registration, onClear }: SuccessCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(registration.code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const reporting = siteContent.timeline[0].note;

  return (
    <div className="reg-success" role="status">
      <p className="eyebrow">You are registered</p>

      <p className="reg-code">
        <span className="swipe">
          <span className="swipe-ink" aria-hidden />
          {registration.code}
        </span>
      </p>

      <p className="reg-save">Save this code. You will need it on event day.</p>

      <div className="reg-actions">
        <button type="button" className="reg-ghost" onClick={copy}>
          {copyState === "copied" ? "Copied" : "Copy code"}
        </button>
        {copyState === "failed" && <span className="reg-hint">Copy did not work here. Please write the code down.</span>}
      </div>

      <dl className="reg-summary">
        <div>
          <dt className="eyebrow">Name</dt>
          <dd>{registration.full_name}</dd>
        </div>
        <div>
          <dt className="eyebrow">Entry</dt>
          <dd>{registration.mode === "pair" ? "With a partner" : "Alone"}</dd>
        </div>
        {reporting && (
          <div>
            <dt className="eyebrow">On the day</dt>
            <dd>Reporting {reporting}</dd>
          </div>
        )}
      </dl>

      <button type="button" className="reg-link" onClick={onClear}>
        Not you? Clear this code from this device
      </button>
    </div>
  );
}
