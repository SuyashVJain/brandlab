import "@/components/shared/shared.css";
import "./register.css";

/**
 * Placeholder only. The real form (docs/SPEC.md, "Registration") replaces the
 * box later; the REGISTER NOW buttons already scroll to #register.
 */
export default function RegisterPlaceholder() {
  return (
    <section id="register" className="sheet register-soon" aria-label="Register">
      <div className="hero-paper" aria-hidden />
      <div className="sheet-inner">
        <div className="register-box">
          <p>Registration opens soon</p>
        </div>
      </div>
    </section>
  );
}
