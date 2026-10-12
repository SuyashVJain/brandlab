import Image from "next/image";
import EventCta from "@/components/shared/EventCta";
import TornEdge from "@/components/how-it-works/TornEdge";
import { siteContent } from "@/lib/site-content";
import "@/components/shared/shared.css";
import "@/components/how-it-works/how-it-works.css"; // styles for the torn strip
import "./footer.css";

// All text comes from lib/site-content.ts.
const { footer, logos, contacts, credit } = siteContent;

export default function Footer() {
  return (
    <footer id="footer" className="sheet foot">
      <div className="hero-paper" aria-hidden />
      <TornEdge />

      <div className="sheet-inner">
        <div className="foot-cta">
          <EventCta />
        </div>

        <ul className="foot-logos">
          {logos.map((logo) => (
            <li key={logo.src}>
              <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} />
            </li>
          ))}
        </ul>

        {/* Statue credit (required by its CC BY 4.0 licence): one quiet line under the logos. */}
        <p className="foot-credit">
          {credit.map((piece) =>
            piece.href ? (
              <a key={piece.text} href={piece.href} target="_blank" rel="noopener noreferrer">
                {piece.text}
              </a>
            ) : (
              piece.text
            ),
          )}
        </p>

        <div className="foot-grid">
          <div>
            <h2 className="eyebrow">{footer.contactHeading}</h2>
            {/* One row on desktop, two columns on a phone. */}
            <ul className="foot-contacts">
              {contacts.map((person) => (
                <li key={person.name}>
                  <span className="foot-contact-name">{person.name}</span>
                  <span className="foot-contact-comma">, </span>
                  {/* The link dials the number without its spaces. */}
                  <a href={`tel:${person.phone.replace(/\s/g, "")}`}>{person.phone}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
