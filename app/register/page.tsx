import type { Metadata } from "next";
import Register from "@/components/register/Register";
import { SvgFilters } from "@/components/TornPaper";

export const metadata: Metadata = {
  title: "Register | BRAND LAB",
};

export default function RegisterPage() {
  return (
    <main>
      {/* The brush button's rough edge is an SVG filter that normally comes with the hero. */}
      <SvgFilters />
      <Register />
    </main>
  );
}
