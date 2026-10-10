"use client";

import { useRef, type MouseEvent } from "react";
import { Crosshair, SectionTitle, TornPanel } from "@/components/shared/Paper";
import { useScrollReveal } from "@/components/shared/useScrollReveal";
import { detailFacts, siteContent } from "@/lib/site-content";
import "./details.css";

// All text comes from lib/site-content.ts.
const { timeline, rules, judging, prizes } = siteContent;
const HEAVIEST = Math.max(...judging.map((criterion) => criterion.weight));

export default function Details() {
  const root = useRef<HTMLElement>(null);
  useScrollReveal(root);

  // Smooth scroll to the register placeholder (instant with reduced motion).
  const goToRegister = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("register");
    if (!target) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <section ref={root} id="details" className="sheet details" aria-labelledby="details-title">
      <div className="hero-paper" aria-hidden />

      <div className="sheet-inner">
        <header className="details-head" data-reveal-batch>
          <div id="details-title">
            <SectionTitle before="The" highlight="Details" />
          </div>
          <Crosshair className="details-cross" />
        </header>

        <div className="details-grid">
          {/* ---------- date / venue / participation ---------- */}
          <dl className="details-facts" data-reveal-batch>
            {detailFacts.map((fact) => (
              <div key={fact.label} className="fact" data-reveal>
                <dt className="eyebrow">{fact.label}</dt>
                <dd>{fact.value}</dd>
                {fact.notes?.map((note) => (
                  <dd key={note} className="fact-note">
                    {note}
                  </dd>
                ))}
              </div>
            ))}
          </dl>

          {/* ---------- day timeline ---------- */}
          <div className="details-timeline" data-reveal-batch>
            <h3 className="details-sub" data-reveal>
              The day
            </h3>
            <ol className="timeline">
              {timeline.map((step, index) => (
                <li key={step.title} data-reveal>
                  <span className="stamp" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    {step.note && <span className="timeline-time">{step.note}</span>}
                    <span className="timeline-item">{step.title}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* ---------- rules ---------- */}
          <div className="details-rules" data-reveal-batch>
            <div data-reveal>
              <TornPanel seed={71}>
                <h3 className="details-sub">Rules</h3>
                <ol className="rules">
                  {rules.map((rule, index) => (
                    <li key={rule}>
                      <span className="rules-num" aria-hidden>
                        {index + 1}
                      </span>
                      <p>{rule}</p>
                    </li>
                  ))}
                </ol>
              </TornPanel>
            </div>
          </div>

          {/* ---------- judging criteria ---------- */}
          <div className="details-judging" data-reveal-batch>
            <h3 className="details-sub" data-reveal>
              Judging
            </h3>
            <ul className="bars">
              {judging.map((criterion) => (
                <li key={criterion.name} data-reveal>
                  <div className="bar-head">
                    <span>{criterion.name}</span>
                    <b>{criterion.weight}</b>
                  </div>
                  {/* Bars are drawn relative to the heaviest criterion. */}
                  <div className="bar-track">
                    <span
                      className="bar-fill"
                      data-fill
                      style={{ width: `${(criterion.weight / HEAVIEST) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="eyebrow bars-total" data-reveal>
              Total: 100 points
            </p>
          </div>

          {/* ---------- prizes ---------- */}
          <div className="details-prizes" data-reveal-batch>
            <div data-reveal>
              <TornPanel seed={93}>
                <div className="prizes">
                  <h3 className="details-sub">Prizes</h3>
                  <p className="details-sub">{prizes}</p>
                </div>
              </TornPanel>
            </div>
          </div>
        </div>

        {/* ---------- call to action ---------- */}
        <div className="details-cta" data-reveal-batch>
          <div data-reveal>
            <a className="register" href="#register" onClick={goToRegister}>
              <span>Register now</span>
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="16" cy="16" r="14" />
                <path d="M10 16h12M17 11l5 5-5 5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
