"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Crosshair, SectionTitle, TornPanel } from "@/components/shared/Paper";
import { useScrollReveal } from "@/components/shared/useScrollReveal";
import { detailFacts, siteContent } from "@/lib/site-content";
import { tornClip } from "@/lib/torn";
import "./details.css";

// All text comes from lib/site-content.ts.
const { timeline, rules, judging, prizes } = siteContent;

type JudgingCriterion = { label: string; max_points: number; description: string | null };

/** Shown until the live criteria arrive, and kept if they cannot be loaded. */
const FALLBACK_CRITERIA: JudgingCriterion[] = judging.map((criterion) => ({
  label: criterion.name,
  max_points: criterion.weight,
  description: null,
}));

/**
 * Segment fills, cycled in this order (palette colours only):
 * ink, brush blue, yellow, ink at 60%, ink at 35%. See .seg--0 ... .seg--4 in details.css.
 */
const FILLS = 5;

/** Font size (px) of the numbers printed under the bar; matches .stack-under b in details.css. */
const UNDER_FONT = 22;

/** Ragged top and bottom for the stacked bar, like a strip cut out with a brush knife. */
const BAR_CUT = tornClip(431, 5);

export default function Details() {
  const root = useRef<HTMLElement>(null);

  // Judging criteria are edited in /admin, so they are loaded from the public
  // API. The list in lib/site-content.ts is only the fallback.
  const [criteria, setCriteria] = useState(FALLBACK_CRITERIA);
  useEffect(() => {
    let alive = true;
    fetch("/api/criteria")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bad status"))))
      .then((list: unknown) => {
        if (!alive || !Array.isArray(list) || list.length === 0) return;
        const valid = list.every(
          (item) => typeof item?.label === "string" && Number.isFinite(item?.max_points) && item.max_points > 0,
        );
        if (valid) {
          setCriteria(
            list.map((item) => ({
              label: item.label,
              max_points: item.max_points,
              description: typeof item.description === "string" && item.description.trim() ? item.description : null,
            })),
          );
        }
      })
      .catch(() => {
        // Keep the fallback.
      });
    return () => {
      alive = false;
    };
  }, []);
  const totalPoints = criteria.reduce((sum, criterion) => sum + criterion.max_points, 0);

  // The bar's width and number size, measured so a number that does not fit
  // inside its segment can be printed under the bar instead.
  const bar = useRef<HTMLDivElement>(null);
  const [barBox, setBarBox] = useState<{ width: number; font: number } | null>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setBarBox({ width: entry.contentRect.width, font: parseFloat(getComputedStyle(element).fontSize) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const segments = criteria.map((criterion, index) => {
    const before = criteria.slice(0, index).reduce((sum, item) => sum + item.max_points, 0);
    const share = totalPoints > 0 ? criterion.max_points / totalPoints : 0;
    // Room the number needs: the condensed display digits are about 0.44 of the
    // font size wide each, plus a little air on both sides.
    const fits = barBox
      ? barBox.width * share - 2 >= String(criterion.max_points).length * barBox.font * 0.44 + 6
      : share >= 0.09;
    return {
      ...criterion,
      fill: index % FILLS,
      fits,
      /** Centre of the segment along the bar, in percent. */
      centre: totalPoints > 0 ? ((before + criterion.max_points / 2) / totalPoints) * 100 : 0,
    };
  });
  // Numbers that do not fit are printed under the bar, centred on their segment
  // and nudged apart so neighbours never run together.
  const outside = segments.filter((segment) => !segment.fits).map((segment) => ({ ...segment, at: segment.centre }));
  if (barBox && barBox.width > 0) {
    const room = (points: number) => String(points).length * UNDER_FONT * 0.44 + 8; // px each label needs
    const xs = outside.map((segment) => (segment.centre / 100) * barBox.width);
    for (let i = 1; i < xs.length; i++) {
      xs[i] = Math.max(xs[i], xs[i - 1] + (room(outside[i - 1].max_points) + room(outside[i].max_points)) / 2);
    }
    let limit = barBox.width - (outside.length ? room(outside[outside.length - 1].max_points) / 2 : 0);
    for (let i = xs.length - 1; i >= 0; i--) {
      xs[i] = Math.min(xs[i], limit);
      if (i > 0) limit = xs[i] - (room(outside[i].max_points) + room(outside[i - 1].max_points)) / 2;
    }
    outside.forEach((segment, i) => {
      segment.at = (xs[i] / barBox.width) * 100;
    });
  }
  useScrollReveal(root);

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
            {/* One stacked bar: a segment per criterion, as wide as its share of the points. */}
            <div data-reveal>
              <div
                ref={bar}
                className="stack"
                style={{ clipPath: BAR_CUT }}
                role="img"
                aria-label={`Judging is out of ${totalPoints} points: ${criteria
                  .map((criterion) => `${criterion.label} ${criterion.max_points}`)
                  .join(", ")}.`}
              >
                {/* Keyed by position so the segments (and their scroll animation) survive the live list arriving. */}
                {segments.map((segment, index) => (
                  <span
                    key={index}
                    className={`seg seg--${segment.fill}`}
                    data-fill
                    style={{ flexGrow: segment.max_points }}
                  >
                    {segment.fits && <b>{segment.max_points}</b>}
                  </span>
                ))}
              </div>
              {/* Numbers that did not fit inside their segment, centred under it. */}
              {outside.length > 0 && (
                <div className="stack-under" aria-hidden>
                  {outside.map((segment) => (
                    <b key={segment.centre} style={{ left: `${segment.at}%` }}>
                      {segment.max_points}
                    </b>
                  ))}
                </div>
              )}
            </div>

            <ul className="stack-key">
              {segments.map((segment, index) => (
                <li key={index} data-reveal>
                  <span className={`stack-swatch seg--${segment.fill}`} aria-hidden />
                  <div>
                    <span className="stack-name">{segment.label}</span>
                    {/* The criterion's description; without one, its share of the points. */}
                    <span className="stack-line">
                      {segment.description ?? `${segment.max_points} of ${totalPoints} points`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="eyebrow bars-total" data-reveal>
              Total: {totalPoints} points
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
            <Link className="register" href="/register">
              <span>Register now</span>
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="16" cy="16" r="14" />
                <path d="M10 16h12M17 11l5 5-5 5" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
