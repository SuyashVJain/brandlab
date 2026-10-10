import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { TornPanel } from "@/components/shared/Paper";
import { SvgFilters } from "@/components/TornPaper";
import "@/components/admin/admin.css";

export const metadata: Metadata = {
  title: "Staff login | BRAND LAB",
  robots: { index: false, follow: false },
};

export default function StaffLoginPage() {
  return (
    <main>
      {/* Rough edge for the brush button (normally supplied by the hero). */}
      <SvgFilters />
      <section className="sheet adm adm-login" aria-labelledby="login-title">
        <div className="hero-paper" aria-hidden />
        <div className="sheet-inner">
          <TornPanel seed={197}>
            <h1 id="login-title" className="section-title">
              Staff{" "}
              <span className="swipe">
                <span className="swipe-ink" aria-hidden />
                login
              </span>
            </h1>
            <LoginForm />
          </TornPanel>
        </div>
      </section>
    </main>
  );
}
