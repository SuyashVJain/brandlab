"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TornPanel } from "@/components/shared/Paper";
import { useScrollReveal } from "@/components/shared/useScrollReveal";
import type { RegisterResult } from "@/lib/register-schema";
import { siteContent } from "@/lib/site-content";
import LookupPanel from "./LookupPanel";
import RegisterForm from "./RegisterForm";
import SuccessCard from "./SuccessCard";
import "./register.css";

/* ------------------------------------------------------------------------ */
/* Saved registration (localStorage), so a refresh shows the code again     */
/* ------------------------------------------------------------------------ */

const STORAGE_KEY = "brandlab.registration";
const listeners = new Set<() => void>();
// Used when localStorage is blocked (private mode): the code still shows until the tab closes.
let memoryCopy: string | null = null;

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryCopy;
  } catch {
    return memoryCopy;
  }
}

function writeSaved(value: RegisterResult | null) {
  memoryCopy = value ? JSON.stringify(value) : null;
  try {
    if (memoryCopy) window.localStorage.setItem(STORAGE_KEY, memoryCopy);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: memoryCopy above is the fallback.
  }
  listeners.forEach((notify) => notify());
}

function subscribeSaved(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

function parseSaved(raw: string | null): RegisterResult | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RegisterResult>;
    if (
      typeof value.code === "string" &&
      /^BL-\d{4,6}$/.test(value.code) &&
      typeof value.full_name === "string" &&
      (value.mode === "alone" || value.mode === "pair")
    ) {
      return {
        code: value.code,
        full_name: value.full_name,
        mode: value.mode,
        // Missing on codes saved before these fields existed.
        program: typeof value.program === "string" ? value.program : undefined,
        semester: typeof value.semester === "number" ? value.semester : undefined,
      };
    }
  } catch {
    // Corrupt entry: treat it as absent.
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* Section                                                                  */
/* ------------------------------------------------------------------------ */

type Status = "checking" | "open" | "closed" | "error";

export default function Register() {
  const root = useRef<HTMLElement>(null);
  useScrollReveal(root);

  const savedRaw = useSyncExternalStore(subscribeSaved, readSaved, () => null);
  const saved = parseSaved(savedRaw);

  // Ask the server whether registration is open. It only ever answers { open }.
  const [status, setStatus] = useState<Status>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/registration-status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("status check failed"))))
      .then((data: { open?: boolean }) => {
        if (alive) setStatus(data.open ? "open" : "closed");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setStatus("checking");
    setAttempt((count) => count + 1);
  };

  return (
    <section ref={root} id="register" className="sheet reg" aria-labelledby="register-title">
      <div className="hero-paper" aria-hidden />

      <div className="sheet-inner">
        {/* ---------- top bar: this section is its own page (/register) ---------- */}
        <nav className="reg-topbar" aria-label="Page">
          <Link className="eyebrow reg-back" href="/">
            <span aria-hidden>&larr;</span> Back to home
          </Link>
        </nav>

        <div className="reg-grid">
          {/* ---------- heading + who can join ---------- */}
          <header className="reg-intro" data-reveal-batch>
            <h1 id="register-title" className="section-title" data-reveal>
              <span className="swipe">
                <span className="swipe-ink" data-swipe aria-hidden />
                Register
              </span>
            </h1>
            <ul className="reg-points" data-reveal>
              <li>{siteContent.eligibility}</li>
              <li>{siteContent.fee}</li>
            </ul>
          </header>

          <div className="reg-main" data-reveal-batch>
            {/* ---------- form / success / closed ---------- */}
            <div data-reveal>
              <TornPanel seed={117}>
                {saved ? (
                  <SuccessCard registration={saved} onClear={() => writeSaved(null)} />
                ) : status === "open" ? (
                  <RegisterForm onSuccess={writeSaved} onClosed={() => setStatus("closed")} />
                ) : status === "closed" ? (
                  <div className="reg-notice" role="status">
                    <h3 className="reg-heading">Registration is closed</h3>
                    <p>New entries are not being accepted right now. Already registered? Check your entry below.</p>
                  </div>
                ) : status === "error" ? (
                  <div className="reg-notice" role="alert">
                    <h3 className="reg-heading">Could not load the form</h3>
                    <p>We could not check whether registration is open. Check your connection and try again.</p>
                    <button type="button" className="reg-ghost" onClick={retry}>
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="reg-notice" role="status">
                    <p>Checking registration status...</p>
                  </div>
                )}
              </TornPanel>
            </div>

            {/* ---------- check my registration ---------- */}
            <div data-reveal>
              <TornPanel seed={133}>
                <LookupPanel />
              </TornPanel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

