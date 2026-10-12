"use client";

import Link from "next/link";
import { siteContent } from "@/lib/site-content";
import { usePhase } from "./usePhase";

const { cta } = siteContent;
const CHOICES = [cta.register, cta.submit];

function Arrow() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="16" cy="16" r="14" />
      <path d="M10 16h12M17 11l5 5-5 5" />
    </svg>
  );
}

/**
 * The home page's brush-stroke button, chosen by the event phase:
 *   submissions_open                -> "Submit your entry" (/submit)
 *   submissions_closed and results  -> nothing
 *   every other phase               -> "Register now" (/register)
 * Before the first answer from the server it shows "Register now".
 *
 * The slot always reserves the room of the widest label (two invisible
 * copies sit in the same grid cell), so swapping or hiding the button never
 * moves anything around it. `className` goes on the slot.
 */
export default function EventCta({ className = "" }: { className?: string }) {
  const phase = usePhase();
  const active = phase === "submissions_open" ? cta.submit : phase === "submissions_closed" || phase === "results" ? null : cta.register;

  return (
    <span className={`cta-slot ${className}`.trim()}>
      {CHOICES.map((choice) => (
        <span key={choice.href} className="register cta-ghost" aria-hidden>
          <span>{choice.label}</span>
          <Arrow />
        </span>
      ))}
      {active && (
        <Link key={active.href} className="register" href={active.href}>
          <span>{active.label}</span>
          <Arrow />
        </Link>
      )}
    </span>
  );
}
