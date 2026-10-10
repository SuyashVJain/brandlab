import Hero from "@/components/Hero";
import HowItWorks from "@/components/how-it-works/HowItWorks";
import Details from "@/components/details/Details";
import Faq from "@/components/faq/Faq";
import Footer from "@/components/footer/Footer";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <HowItWorks />
        <Details />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
