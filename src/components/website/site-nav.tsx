"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/**
 * Public-site navbar.
 *
 * - Transparent over the hero (overlays the slideshow).
 * - Becomes a solid forest-toned bar once the user scrolls past the
 *   hero edge (~80px). Background swap is animated via Tailwind
 *   transitions, so the change feels filmic, not abrupt.
 * - Links and "Book Now" CTA are content-only — restyle by changing
 *   tokens or this file; no logic to redo.
 */
export function SiteNav() {
  const t = useTranslations("website.nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Same anchor list everywhere — change once, ripples through.
  const links: { href: string; label: string }[] = [
    { href: "/#stay", label: t("gers") },
    { href: "/#story", label: t("story") },
    { href: "/#gallery", label: t("gallery") },
    { href: "/#contact", label: t("contact") },
  ];

  return (
    <header
      data-scrolled={scrolled}
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-tsaidam-forest-deep/95 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.06)]"
          : "bg-transparent",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-serif text-2xl font-medium tracking-[0.18em] text-tsaidam-cream uppercase"
        >
          Tsaidam
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium uppercase tracking-[0.18em] text-tsaidam-cream/85 transition-colors hover:text-tsaidam-cream"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="/#book"
          className={[
            "inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-medium uppercase tracking-[0.22em] transition-all duration-300",
            scrolled
              ? "bg-tsaidam-sand text-tsaidam-forest-deep hover:bg-tsaidam-cream"
              : "border border-tsaidam-cream/60 text-tsaidam-cream hover:border-tsaidam-cream hover:bg-tsaidam-cream hover:text-tsaidam-forest-deep",
          ].join(" ")}
        >
          {t("booking")}
        </a>
      </nav>
    </header>
  );
}
