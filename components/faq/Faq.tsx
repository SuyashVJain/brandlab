"use client";

import { useRef, useState } from "react";
import { TornPanel } from "@/components/shared/Paper";
import { useScrollReveal } from "@/components/shared/useScrollReveal";
import { siteContent } from "@/lib/site-content";
import "@/components/shared/shared.css";
import "./faq.css";

// All text comes from lib/site-content.ts.
const { faq, faqHeading } = siteContent;

/** FAQ accordion: one answer open at a time. Each question is a real button, so it works from the keyboard. */
export default function Faq() {
  const root = useRef<HTMLElement>(null);
  useScrollReveal(root);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section ref={root} id="faq" className="sheet faq" aria-labelledby="faq-title">
      <div className="hero-paper" aria-hidden />

      <div className="sheet-inner">
        <header className="faq-head" data-reveal-batch>
          <h2 id="faq-title" className="section-title" data-reveal>
            <span className="swipe">
              <span className="swipe-ink" data-swipe aria-hidden />
              {faqHeading}
            </span>
          </h2>
        </header>

        <ul className="faq-list" data-reveal-batch>
          {faq.map((item, index) => {
            const isOpen = open === index;
            return (
              <li key={item.question} data-reveal>
                <TornPanel seed={index * 17 + 401} className="faq-item">
                  <h3 className="faq-question">
                    <button
                      type="button"
                      id={`faq-q-${index}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${index}`}
                      onClick={() => setOpen(isOpen ? null : index)}
                    >
                      <span>{item.question}</span>
                      <span className="faq-mark" aria-hidden />
                    </button>
                  </h3>
                  {/* Collapsed answers stay in the page but are hidden from sight and from screen readers. */}
                  <div
                    id={`faq-a-${index}`}
                    className="faq-answer"
                    role="region"
                    aria-labelledby={`faq-q-${index}`}
                    aria-hidden={!isOpen}
                    data-open={isOpen}
                  >
                    <div>
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </TornPanel>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
