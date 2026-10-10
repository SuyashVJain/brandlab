"use client";

import { Fragment, useRef } from "react";
import { Crosshair, SectionTitle, TornPanel } from "@/components/shared/Paper";
import { useScrollReveal } from "@/components/shared/useScrollReveal";
import { siteContent } from "@/lib/site-content";
import { StepArrow, StepIcon, StepNumber, type IconName } from "./StepArt";
import TornEdge from "./TornEdge";
import "./how-it-works.css";

// Text comes from lib/site-content.ts.
const { steps, sideText } = siteContent.howItWorks;

export default function HowItWorks() {
  const root = useRef<HTMLElement>(null);
  useScrollReveal(root);

  return (
    <section ref={root} id="how-it-works" className="sheet how" aria-labelledby="how-title">
      <div className="hero-paper" aria-hidden />
      <TornEdge />

      <div className="sheet-inner">
        <header className="how-head" data-reveal-batch>
          <div id="how-title">
            <SectionTitle before="How it" highlight="works" />
          </div>
          <p className="eyebrow how-side" data-reveal>
            {sideText[0]}
            <br />
            {sideText[1]}
          </p>
          <Crosshair className="how-cross" />
        </header>

        <ol className="how-steps" data-reveal-batch>
          {steps.map((step, index) => (
            <Fragment key={step.number}>
              {index > 0 && (
                <li className="how-arrow" aria-hidden>
                  <StepArrow flip={index === 2} />
                </li>
              )}
              {/* The <li> is what the scroll reveal moves; the tilt wrapper inside handles hover. */}
              <li className="how-step" data-reveal>
                <div className="how-tilt">
                  <TornPanel seed={index * 13 + 5} className="how-card">
                    <StepNumber value={step.number} />
                    <StepIcon name={step.icon as IconName} />
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </TornPanel>
                </div>
              </li>
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  );
}
