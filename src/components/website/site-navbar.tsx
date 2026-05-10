"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { Menu, X, Languages } from "lucide-react";

const NAV_LINKS = [
  { hash: "#accommodations", labelKey: "nav.gers" },
  { hash: "#experience", labelKey: "nav.experience" },
  { hash: "#programs", labelKey: "nav.programs" },
  { hash: "#findus", labelKey: "nav.contact" },
] as const;

export function SiteNavbar() {
  const t = useTranslations("website");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const toggleLocale = () => {
    router.replace(pathname, { locale: locale === "mn" ? "en" : "mn" });
  };

  const linkBaseColor = scrolled
    ? "text-[var(--color-tsaidam-ink-mid)] hover:text-[var(--color-tsaidam-ink)]"
    : "text-white/85 hover:text-white";

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between px-6 transition-all duration-300 sm:px-10 lg:px-16 ${
          scrolled
            ? "bg-[oklch(0.975_0.018_225_/_0.96)] shadow-[0_1px_0_oklch(0.86_0.03_222_/_0.7)] backdrop-blur-xl"
            : ""
        }`}
      >
        <Link
          href="/"
          className={`font-serif-display text-2xl font-semibold tracking-wide transition-colors ${
            scrolled ? "text-[var(--color-tsaidam-forest)]" : "text-white"
          }`}
        >
          Tsaidam
        </Link>

        <div className="hidden items-center gap-6 md:flex lg:gap-10">
          {NAV_LINKS.map((l) => (
            <a
              key={l.hash}
              href={l.hash}
              className={`text-xs font-medium uppercase tracking-[0.04em] transition-colors ${linkBaseColor}`}
            >
              {t(l.labelKey)}
            </a>
          ))}
          <button
            type="button"
            onClick={toggleLocale}
            aria-label="Switch language"
            className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] transition-colors ${linkBaseColor}`}
          >
            <Languages className="h-3.5 w-3.5" />
            {locale === "mn" ? "EN" : "MN"}
          </button>
          <a
            href="#accommodations"
            className={`rounded-sm border px-5 py-2 text-xs font-medium uppercase tracking-[0.08em] transition-all ${
              scrolled
                ? "border-[var(--color-tsaidam-forest)] bg-[var(--color-tsaidam-forest)] text-white hover:bg-[var(--color-tsaidam-forest-md)]"
                : "border-white/60 text-white hover:border-white hover:bg-white/15"
            }`}
          >
            {t("nav.booking")}
          </a>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setDrawerOpen(true)}
          className="md:hidden"
        >
          <Menu
            className={`h-6 w-6 ${
              scrolled ? "text-[var(--color-tsaidam-forest)]" : "text-white"
            }`}
          />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[55] flex flex-col items-center justify-center gap-8 bg-[var(--color-tsaidam-forest)] transition-transform duration-500 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        } md:hidden`}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="absolute right-6 top-6 text-white/80 hover:text-white"
        >
          <X className="h-7 w-7" />
        </button>
        {NAV_LINKS.map((l) => (
          <a
            key={l.hash}
            href={l.hash}
            onClick={() => setDrawerOpen(false)}
            className="font-serif-display text-3xl text-white/85 hover:text-white"
          >
            {t(l.labelKey)}
          </a>
        ))}
        <button
          type="button"
          onClick={() => {
            toggleLocale();
            setDrawerOpen(false);
          }}
          className="mt-2 flex items-center gap-2 text-sm uppercase tracking-[0.1em] text-white/70 hover:text-white"
        >
          <Languages className="h-4 w-4" />
          {locale === "mn" ? "English" : "Монгол"}
        </button>
        <a
          href="#accommodations"
          onClick={() => setDrawerOpen(false)}
          className="mt-2 rounded-sm bg-[var(--color-tsaidam-clay)] px-10 py-3 text-sm font-medium uppercase tracking-[0.1em] text-white hover:bg-[var(--color-tsaidam-clay-lt)]"
        >
          {t("nav.booking")}
        </a>
      </div>
    </>
  );
}
