import { Hero } from "@/components/website/hero";
import { IntroStrip } from "@/components/website/intro-strip";
import { Accommodations } from "@/components/website/accommodations";
import { Experience } from "@/components/website/experience";
import { Testimonials } from "@/components/website/testimonials";
import { Programs } from "@/components/website/programs";
import { FindUs } from "@/components/website/find-us";
import { Faq } from "@/components/website/faq";

export default function HomePage() {
  return (
    <>
      <Hero />
      <IntroStrip />
      <Accommodations />
      <Experience />
      <Testimonials />
      <Programs />
      <FindUs />
      <Faq />
    </>
  );
}
