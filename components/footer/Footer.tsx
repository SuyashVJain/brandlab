import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import TornEdge from "@/components/how-it-works/TornEdge";
import { siteContent } from "@/lib/site-content";
import "@/components/shared/shared.css";
import "@/components/how-it-works/how-it-works.css"; // styles for the torn strip
import "./footer.css";

// All text comes from lib/site-content.ts.
const { footer, logos, contact, credits } = siteContent;

/** Web addresses inside a sentence, without the full stop, comma or bracket that follows them. */
const URL_PATTERN = /https?:\/\/[^\s)]*[^\s).,]/g;

/** A credit line with every web address in it turned into a real link (new tab). */
function withLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0];
    const start = match.index;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <a key={start} href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>,
    );
    last = start + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Footer() {
  return (
    <footer id="footer" className="sheet foot">
      <div className="hero-paper" aria-hidden />
      <TornEdge />

      <div className="sheet-inner">
        <div className="foot-cta">
          <Link className="register" href="/register">
            <span>{footer.register}</span>
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="16" cy="16" r="14" />
              <path d="M10 16h12M17 11l5 5-5 5" />
            </svg>
          </Link>
        </div>

        <ul className="foot-logos">
          {logos.map((logo) => (
            <li key={logo.src}>
              <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} />
            </li>
          ))}
        </ul>

        <div className="foot-grid">
          <div>
            <h2 className="eyebrow">{footer.contactHeading}</h2>
            <p className="foot-contact">
              {contact.name}, <a href={`tel:${contact.phone}`}>{contact.phone}</a>
            </p>
          </div>
          <div>
            <h2 className="eyebrow">{footer.creditsHeading}</h2>
            {credits.map((line) => (
              <p key={line} className="foot-credit">
                {withLinks(line)}
              </p>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
