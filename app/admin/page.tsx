import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import LogoutButton from "@/components/admin/LogoutButton";
import { SvgFilters } from "@/components/TornPaper";
import { staffFromToken } from "@/lib/auth";
import { readAdminState } from "@/lib/event-state";
import { SESSION_COOKIE } from "@/lib/session";
import "@/components/admin/admin.css";

export const metadata: Metadata = {
  title: "Admin | BRAND LAB",
  robots: { index: false, follow: false },
};

/**
 * Everything that depends on who is signed in. It reads the session cookie,
 * so it renders at request time inside the <Suspense> below. No valid session
 * means a server-side redirect to the login page: none of the controls or
 * data below are ever sent to a visitor who is not signed in.
 */
async function AdminContent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const staff = await staffFromToken(token);
  if (!staff) redirect("/admin/login");

  return (
    <>
      <header className="adm-top">
        <h1 className="section-title">
          Event{" "}
          <span className="swipe">
            <span className="swipe-ink" aria-hidden />
            control
          </span>
        </h1>
        <div className="adm-who">
          <p>
            {staff.email}
            <span className="adm-role">{staff.role}</span>
          </p>
          <LogoutButton />
        </div>
      </header>

      {/* Admins get every tab; jury accounts get the scoring view only. */}
      <AdminTabs
        role={staff.role}
        email={staff.email}
        initialState={staff.role === "admin" ? await readAdminState() : null}
      />
    </>
  );
}

export default function AdminPage() {
  return (
    <main>
      {/* Rough edge for the brush button (normally supplied by the hero). */}
      <SvgFilters />
      <section className="sheet adm" aria-label="Admin">
        <div className="hero-paper" aria-hidden />
        <div className="sheet-inner">
          <Suspense fallback={<p className="adm-loading">Checking your session...</p>}>
            <AdminContent />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
