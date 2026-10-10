import type { Metadata } from "next";
import Live from "@/components/live/Live";

export const metadata: Metadata = {
  title: "Live | BRAND LAB",
};

export default function LivePage() {
  return (
    <main>
      <Live />
    </main>
  );
}
