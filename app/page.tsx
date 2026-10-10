import Hero from "@/components/Hero";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import Details from "@/components/details/Details";
import RegisterPlaceholder from "@/components/register/RegisterPlaceholder";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Details />
      <RegisterPlaceholder />
    </main>
  );
}
