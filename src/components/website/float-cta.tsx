"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";

/**
 * Sticky "Book Now" pill that fades in once the user scrolls past the hero.
 * Hidden on /booking to avoid pointing at the same page the user is on.
 */
export function FloatCta() {
  const t = useTranslations("website");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  const onBookingPage = pathname.endsWith("/booking");

  useEffect(() => {
    if (onBookingPage) return;
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.7);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onBookingPage]);

  const visible = scrolled && !onBookingPage;

  return (
    <Link
      href="/booking"
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--color-tsaidam-forest)] px-7 py-3 text-xs font-medium uppercase tracking-[0.1em] text-white shadow-[0_8px_32px_oklch(0.1_0.06_155_/_0.35)] transition-all duration-500 hover:-translate-y-0.5 hover:bg-[var(--color-tsaidam-forest-md)] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-20 opacity-0"
      }`}
    >
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-tsaidam-clay-lt)] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-tsaidam-clay-lt)]" />
      </span>
      {t("nav.booking")}
    </Link>
  );
}
