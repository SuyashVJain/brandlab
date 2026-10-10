import Hero from "@/components/Hero";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import Details from "@/components/details/Details";
import Register from "@/components/register/Register";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Details />
      <Register />
    </main>
  );
}
