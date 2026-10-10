import type { Metadata } from "next";
import Submit from "@/components/submit/Submit";
import { SvgFilters } from "@/components/TornPaper";

export const metadata: Metadata = {
  title: "Submit | BRAND LAB",
  robots: { index: false, follow: false },
};

export default function SubmitPage() {
  return (
    <main>
      {/* Rough edge for the brush button (normally supplied by the hero). */}
      <SvgFilters />
      <Submit />
    </main>
  );
}
