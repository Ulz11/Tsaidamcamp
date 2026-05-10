import { Playfair_Display, Outfit } from "next/font/google";
import { SiteNavbar } from "@/components/website/site-navbar";
import { SiteFooter } from "@/components/website/site-footer";
import { FloatCta } from "@/components/website/float-cta";

// Load brand fonts only on the public site — admin keeps its compact Geist UI.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`tsaidam-site min-h-screen ${playfair.variable} ${outfit.variable}`}
    >
      <SiteNavbar />
      <main>{children}</main>
      <SiteFooter />
      <FloatCta />
    </div>
  );
}
